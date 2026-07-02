import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';

// Per-server live state model. Holds rolling samples used for scoring,
// percentiles, circuit-breaking and the agentic weight decisions.
class ServerState {
  constructor({ id, host, port }) {
    this.id = id;
    this.host = host;
    this.port = port;
    this.url = `http://${host}:${port}`;

    this.healthy = false;
    this.healthScore = 0;          // 0..100
    this.weight = 1;               // agent-tuned routing weight (0.1..3)
    this.activeConnections = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;

    this.latency = 0;              // last observed latency (ms)
    this.cpu = 0;                  // reported by backend /health (0..100)
    this.mem = 0;                  // reported by backend /health (0..100)

    this.latencySamples = [];      // recent latencies for percentiles + sparkline
    this.recentEvents = [];        // {t, ok} for windowed error rate

    // Circuit breaker: CLOSED (normal) -> OPEN (blocked) -> HALF_OPEN (probing)
    this.circuit = 'CLOSED';
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.openedAt = 0;
  }

  recordLatency(ms) {
    this.latency = ms;
    this.latencySamples.push(ms);
    if (this.latencySamples.length > 40) this.latencySamples.shift();
  }

  recordEvent(ok, windowMs) {
    const now = Date.now();
    this.totalRequests += 1;
    if (!ok) this.totalErrors += 1;
    this.recentEvents.push({ t: now, ok });
    const cutoff = now - windowMs;
    while (this.recentEvents.length && this.recentEvents[0].t < cutoff) {
      this.recentEvents.shift();
    }
  }

  get errorRate() {
    if (!this.recentEvents.length) return 0;
    const errs = this.recentEvents.filter(e => !e.ok).length;
    return (errs / this.recentEvents.length) * 100;
  }

  percentile(p) {
    if (!this.latencySamples.length) return 0;
    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return Math.round(sorted[idx]);
  }

  snapshot() {
    return {
      id: this.id,
      host: this.host,
      port: this.port,
      healthy: this.healthy,
      healthScore: this.healthScore,
      weight: Number(this.weight.toFixed(2)),
      circuit: this.circuit,
      activeConnections: this.activeConnections,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      latency: Math.round(this.latency),
      errorRate: Number(this.errorRate.toFixed(1)),
      cpu: Math.round(this.cpu),
      mem: Math.round(this.mem),
      p50: this.percentile(50),
      p95: this.percentile(95),
      p99: this.percentile(99),
      latencyHistory: this.latencySamples.slice(-30).map(v => Math.round(v)),
    };
  }
}

export class HealthMonitor {
  constructor() {
    this.servers = config.backends.map(b => new ServerState(b));
    this.byId = new Map(this.servers.map(s => [s.id, s]));
    this._timer = null;
  }

  get(id) { return this.byId.get(id); }

  // Add a backend to the live pool (dashboard "add backend" control).
  addServer({ id, host, port }) {
    if (this.byId.has(id)) return this.byId.get(id);
    const s = new ServerState({ id, host, port });
    this.servers.push(s);
    this.byId.set(id, s);
    this.checkOne(s); // probe immediately so it can start receiving traffic
    logger.ok(`backend added → ${id} (${host}:${port})`);
    return s;
  }

  // Remove a backend from the live pool (dashboard "kill backend" control).
  removeServer(id) {
    if (!this.byId.has(id)) return false;
    this.servers = this.servers.filter(s => s.id !== id);
    this.byId.delete(id);
    logger.warn(`backend removed → ${id}`);
    return true;
  }

  start() {
    this.checkAll();
    this._timer = setInterval(() => this.checkAll(), config.healthCheckIntervalMs);
    logger.info(`Health monitor started (${config.backends.length} backends, every ${config.healthCheckIntervalMs}ms)`);
  }

  stop() { clearInterval(this._timer); }

  async checkAll() {
    await Promise.all(this.servers.map(s => this.checkOne(s)));
  }

  async checkOne(s) {
    const started = Date.now();
    try {
      const res = await axios.get(`${s.url}/health`, { timeout: config.healthCheckTimeoutMs });
      const rtt = Date.now() - started;
      s.recordLatency(rtt);
      s.cpu = res.data?.cpu ?? s.cpu;
      s.mem = res.data?.mem ?? s.mem;
      this._onSuccess(s);
    } catch {
      this._onFailure(s);
    }
    this._score(s);
  }

  _onSuccess(s) {
    s.consecutiveSuccesses += 1;
    s.consecutiveFailures = 0;
    s.healthy = true;
    // Half-open probe succeeded -> close the breaker.
    if (s.circuit === 'HALF_OPEN' && s.consecutiveSuccesses >= 2) {
      s.circuit = 'CLOSED';
      logger.ok(`${s.id} circuit CLOSED (recovered)`);
    }
  }

  _onFailure(s) {
    s.consecutiveFailures += 1;
    s.consecutiveSuccesses = 0;
    s.healthy = false;
    if (s.circuit === 'CLOSED' && s.consecutiveFailures >= 3) {
      s.circuit = 'OPEN';
      s.openedAt = Date.now();
      logger.warn(`${s.id} circuit OPEN (${s.consecutiveFailures} fails)`);
    }
  }

  // Let an OPEN breaker move to HALF_OPEN after a cooldown so it can probe.
  tickBreakers(cooldownMs = 10000) {
    const now = Date.now();
    for (const s of this.servers) {
      if (s.circuit === 'OPEN' && now - s.openedAt > cooldownMs) {
        s.circuit = 'HALF_OPEN';
        logger.info(`${s.id} circuit HALF_OPEN (probing)`);
      }
    }
  }

  _score(s) {
    if (!s.healthy) { s.healthScore = 0; return; }
    // Latency contribution: 0ms -> 100, 400ms+ -> 0
    const latScore = Math.max(0, 100 - (s.latency / 4));
    // Error contribution: 0% -> 100, 50%+ -> 0
    const errScore = Math.max(0, 100 - s.errorRate * 2);
    // Load contribution from reported CPU
    const loadScore = Math.max(0, 100 - s.cpu);
    s.healthScore = Math.round(latScore * 0.5 + errScore * 0.3 + loadScore * 0.2);
  }

  // Servers eligible to receive traffic (healthy + breaker not OPEN).
  available() {
    return this.servers.filter(s => s.healthy && s.circuit !== 'OPEN');
  }

  snapshotAll() { return this.servers.map(s => s.snapshot()); }
}

export default HealthMonitor;
