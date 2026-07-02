import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { fork } from 'child_process';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createProxyMiddleware } from 'http-proxy-middleware';

import config from './config.js';
import logger from './utils/logger.js';
import HealthMonitor from './health/monitor.js';
import Router, { classifyRequest } from './loadBalancer/router.js';
import AgentCore from './agent/agentCore.js';
import MetricsStore from './metrics/store.js';
import Broadcaster from './ws/broadcaster.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Core services ──────────────────────────────────────────────────────────
const monitor = new HealthMonitor();
const router = new Router(monitor, config.strategy);
const agent = new AgentCore(monitor);
const metrics = new MetricsStore();

// ── Optionally spawn the demo backends so it all runs from one command ──────
const backendEntry = path.resolve(__dirname, '../../backend-services/backend.js');
const children = new Map(); // serverId -> child process

function spawnBackend(b) {
  const child = fork(backendEntry, [], {
    env: { ...process.env, SERVER_ID: b.id, PORT: String(b.port) },
    stdio: 'inherit',
  });
  children.set(b.id, child);
  return child;
}

function spawnBackends() {
  for (const b of config.backends) spawnBackend(b);
  logger.info(`spawned ${children.size} backend services`);
}

// Runtime state the dashboard controls can mutate.
let simulateOn = config.simulateTraffic;                     // synthetic traffic on/off
let portCursor = Math.max(...config.backends.map(b => b.port)) + 1; // next free port for new backends
let backendSeq = config.backends.length;                     // for auto-naming new backends
const PHONETIC = ['delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike'];

// ── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Full system state — the single source of truth for the dashboard + WS.
function systemState() {
  const servers = monitor.snapshotAll();
  const healthy = servers.filter(s => s.healthy);
  const avgLatency = healthy.length ? Math.round(healthy.reduce((a, s) => a + s.latency, 0) / healthy.length) : 0;
  const m = metrics.snapshot();
  return {
    ts: Date.now(),
    strategy: router.strategy,
    simulateTraffic: simulateOn,
    system: {
      totalServers: servers.length,
      healthyServers: healthy.length,
      requestRate: m.requestRate,
      errorRate: m.errorRate,
      averageLatency: avgLatency,
      totalRouted: m.totalRouted,
    },
    servers,
    routing: {
      distribution: m.distribution,
      strategyCounts: m.strategyCounts,
      liveRequests: m.liveRequests,
    },
    agent: agent.snapshot(),
  };
}

// ── LB control + telemetry API ──────────────────────────────────────────────
app.get('/lb/state', (req, res) => res.json(systemState()));
app.get('/lb/history', (req, res) => res.json({ decisions: agent.decisions.slice(-100).reverse(), routing: metrics.routingLog.slice(-100).reverse() }));
app.get('/lb/agent', (req, res) => res.json(agent.snapshot()));

app.post('/lb/strategy', (req, res) => {
  const ok = router.setStrategy(req.body?.strategy);
  res.status(ok ? 200 : 400).json({ ok, strategy: router.strategy });
});

// ── User-driven controls (the dashboard Control Console) ────────────────────

// Fire N real requests through the balancer with a user-chosen path/method.
// Each one is routed by the active strategy and actually hits the chosen
// backend, so injected faults and latency show up for real.
app.post('/lb/send', async (req, res) => {
  const reqPath = String(req.body?.path || '/api/users/profile');
  const method = String(req.body?.method || 'GET').toUpperCase();
  const count = Math.max(1, Math.min(50, Number(req.body?.count) || 1));

  const results = [];
  await Promise.all(Array.from({ length: count }, async () => {
    const type = classifyRequest(reqPath, method);
    const { server, strategy, reason } = router.select({ type });
    if (!server) { results.push({ ok: false, error: 'no healthy backends' }); return; }

    server.activeConnections += 1;
    const started = Date.now();
    let ok = true, status = 0;
    try {
      const target = server.url + reqPath.replace(/^\/api/, '');
      const r = await axios({ method, url: target, timeout: 6000, validateStatus: () => true });
      status = r.status;
      ok = status < 500;
    } catch { ok = false; }
    const latency = Date.now() - started;

    server.activeConnections = Math.max(0, server.activeConnections - 1);
    server.recordLatency(latency);
    server.recordEvent(ok, config.metricsWindowMs);
    metrics.recordRoute({ serverId: server.id, strategy, reason, type, method, path: reqPath, latency, ok });
    results.push({ serverId: server.id, strategy, reason, type, latency, ok, status });
  }));

  res.json({ sent: results.length, results });
});

// Toggle the built-in synthetic traffic generator on/off.
app.post('/lb/traffic', (req, res) => {
  simulateOn = Boolean(req.body?.enabled);
  logger.info(`synthetic traffic ${simulateOn ? 'ENABLED' : 'PAUSED'} (via dashboard)`);
  res.json({ ok: true, enabled: simulateOn });
});

// Add a fresh backend to the pool: spawn the process + register it.
app.post('/lb/backend/add', (req, res) => {
  backendSeq += 1;
  const name = PHONETIC[(backendSeq - 4 + PHONETIC.length) % PHONETIC.length];
  const id = String(req.body?.id || `srv-${name}`);
  if (monitor.get(id)) return res.status(409).json({ ok: false, error: `id ${id} already exists` });
  const port = portCursor++;
  const def = { id, host: '127.0.0.1', port };
  spawnBackend(def);
  monitor.addServer(def);
  res.json({ ok: true, server: { id, port } });
});

// Remove a backend from the pool: kill the process + deregister it.
app.post('/lb/backend/remove', (req, res) => {
  const id = String(req.body?.id || '');
  const child = children.get(id);
  if (child) { try { child.kill(); } catch { /* already gone */ } children.delete(id); }
  const removed = monitor.removeServer(id);
  delete metrics.distribution[id];
  res.status(removed ? 200 : 404).json({ ok: removed, id });
});

// Inject a fault into a backend: 'fail' | 'slow' | 'recover'.
app.post('/lb/backend/fault', async (req, res) => {
  const id = String(req.body?.id || '');
  const mode = String(req.body?.mode || 'fail');
  const s = monitor.get(id);
  if (!s) return res.status(404).json({ ok: false, error: `unknown backend ${id}` });
  try {
    await axios.post(`${s.url}/control/fault`, { mode }, { timeout: 3000 });
    res.json({ ok: true, id, mode });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

// AI assistant powered by a LOCAL Ollama model. We hand the model a plain-English
// snapshot of the live system so it can answer questions in everyday language.
function plainStateSummary(s) {
  const servers = s.servers.map(x =>
    `- ${x.id}: ${x.healthy ? 'healthy' : 'DOWN'}, health score ${x.healthScore}/100, ` +
    `${x.latency}ms response, ${x.errorRate}% errors, safety-switch ${x.circuit}, ${x.activeConnections} active requests`
  ).join('\n');
  return [
    `Live load balancer status:`,
    `- Routing method in use: ${s.strategy}`,
    `- Backend servers: ${s.system.healthyServers} of ${s.system.totalServers} healthy`,
    `- Traffic: ${s.system.requestRate} requests/sec, ${s.system.averageLatency}ms average response, ${s.system.errorRate}% errors`,
    `- Total requests handled: ${s.system.totalRouted}`,
    `- Auto-traffic generator: ${s.simulateTraffic ? 'ON' : 'paused'}`,
    `Servers:`,
    servers,
  ].join('\n');
}

const CHAT_SYSTEM_PROMPT =
  `You are the friendly assistant for a web "load balancer" dashboard. A load balancer ` +
  `spreads incoming web traffic across several backend servers so no single one gets overloaded. ` +
  `Explain things simply, for someone who is NOT a technical expert. Avoid jargon; when you must ` +
  `use a term, give a one-line plain explanation. Keep answers short (2-5 sentences). Use ONLY the ` +
  `live status provided to answer questions about the current system; if the data doesn't cover it, say so plainly.`;

app.post('/lb/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.json({ answer: 'Ask me anything about your load balancer — like "are all servers healthy?" or "what does the routing strategy do?"' });

  const s = systemState();
  try {
    const r = await axios.post(`${config.ollamaUrl}/api/chat`, {
      model: config.ollamaModel,
      stream: false,
      options: { temperature: 0.4 },
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        { role: 'system', content: plainStateSummary(s) },
        { role: 'user', content: message },
      ],
    }, { timeout: 60000 });
    const answer = r.data?.message?.content?.trim() || "I couldn't come up with an answer just now.";
    res.json({ answer, model: config.ollamaModel });
  } catch (e) {
    const hint = e.code === 'ECONNREFUSED'
      ? `I couldn't reach the local AI (Ollama). Please make sure Ollama is running and the model "${config.ollamaModel}" is installed (run: ollama pull ${config.ollamaModel}).`
      : `The local AI had a problem: ${e.message}`;
    logger.warn(`Ollama chat failed: ${e.message}`);
    res.status(200).json({ answer: hint, error: true });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', role: 'load-balancer', uptime: process.uptime() }));

// ── Reverse proxy: /api/* is load-balanced to a chosen backend ──────────────
const proxy = createProxyMiddleware({
  changeOrigin: true,
  ws: true,
  router: (req) => req._lbTarget,
  pathRewrite: (p) => p.replace(/^\/api/, ''),
  onError: (err, req, res) => {
    if (req._lbServer) { req._lbServer.activeConnections = Math.max(0, req._lbServer.activeConnections - 1); }
    if (!res.headersSent) res.status(502).json({ error: 'bad gateway', detail: err.message });
  },
});

app.use('/api', (req, res, next) => {
  const type = classifyRequest(req.path, req.method);
  const { server, strategy, reason } = router.select({ type });
  if (!server) return res.status(503).json({ error: 'no healthy backends available' });

  req._lbTarget = server.url;
  req._lbServer = server;
  server.activeConnections += 1;
  const started = Date.now();

  res.on('close', () => {
    const latency = Date.now() - started;
    const ok = res.statusCode < 500;
    server.activeConnections = Math.max(0, server.activeConnections - 1);
    server.recordLatency(latency);
    server.recordEvent(ok, config.metricsWindowMs);
    metrics.recordRoute({ serverId: server.id, strategy, reason, type, method: req.method, path: req.path, latency, ok });
  });

  next();
}, proxy);

// ── Synthetic traffic generator — keeps the visualization alive ─────────────
const SAMPLE_PATHS = [
  { p: '/api/compute/render', m: 'POST' }, { p: '/api/db/query', m: 'GET' },
  { p: '/api/users/profile', m: 'GET' },   { p: '/api/image/encode', m: 'POST' },
  { p: '/api/file/download', m: 'GET' },    { p: '/api/checkout', m: 'POST' },
  { p: '/api/search', m: 'GET' },           { p: '/api/stream/video', m: 'GET' },
];

function simulateOnce() {
  const pool = monitor.available();
  if (!pool.length) return;
  const sample = SAMPLE_PATHS[Math.floor(Math.random() * SAMPLE_PATHS.length)];
  const type = classifyRequest(sample.p, sample.m);
  const { server, strategy, reason } = router.select({ type });
  if (!server) return;

  server.activeConnections += 1;
  // Simulated service time: base + load penalty + jitter
  const latency = 25 + server.cpu * 1.4 + Math.random() * 60;
  const ok = Math.random() > (server.healthy ? 0.02 : 0.5);

  setTimeout(() => {
    server.activeConnections = Math.max(0, server.activeConnections - 1);
    server.recordLatency(latency);
    server.recordEvent(ok, config.metricsWindowMs);
    metrics.recordRoute({ serverId: server.id, strategy, reason, type, method: sample.m, path: sample.p, latency, ok });
  }, Math.min(400, latency));
}

// ── Boot ─────────────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);
const broadcaster = new Broadcaster(httpServer, systemState);

httpServer.listen(config.port, () => {
  logger.ok(`╔══════════════════════════════════════════════════╗`);
  logger.ok(`  NEON Load Balancer online → http://localhost:${config.port}`);
  logger.ok(`  WebSocket telemetry       → ws://localhost:${config.port}/metrics`);
  logger.ok(`  Strategy: ${router.strategy}`);
  logger.ok(`╚══════════════════════════════════════════════════╝`);

  if (config.spawnBackends) setTimeout(spawnBackends, 300);
  monitor.start();
  agent.start();
  // Generator always ticks; the `simulateOn` flag (toggled from the dashboard)
  // decides whether it actually emits traffic.
  setInterval(() => {
    if (!simulateOn) return;
    // burst of 1–4 synthetic requests each interval for a lively scene
    const n = 1 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) simulateOnce();
  }, config.simulateIntervalMs);
  logger.info(`synthetic traffic generator running (${simulateOn ? 'ON' : 'paused'})`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown() {
  logger.warn('shutting down…');
  broadcaster.stop();
  monitor.stop();
  agent.stop();
  children.forEach(c => { try { c.kill(); } catch {} });
  children.clear();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
