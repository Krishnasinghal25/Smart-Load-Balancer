// Parameterized demo backend service.
// Run 3 instances with different SERVER_ID / PORT. The load balancer
// auto-spawns these, but you can also run them standalone:
//   SERVER_ID=srv-alpha PORT=5001 node backend.js
import express from 'express';

const SERVER_ID = process.env.SERVER_ID || 'srv-demo';
const PORT = Number(process.env.PORT || 5001);

const app = express();
app.use(express.json());

// A little synthetic internal state so /health reports believable load.
let baseCpu = 20 + Math.random() * 20;
let requests = 0;

// Fault injection, driven from the dashboard via the load balancer.
//   'none'  -> normal    'fail' -> return 500 + fail health    'slow' -> heavy latency
let faultMode = 'none';

// Slowly wander CPU/memory to make the dashboard feel alive.
setInterval(() => {
  baseCpu += (Math.random() - 0.5) * 8;
  baseCpu = Math.max(5, Math.min(95, baseCpu));
}, 2000);

function currentLoad() {
  const cpu = Math.max(3, Math.min(99, baseCpu + Math.random() * 10));
  const mem = Math.max(10, Math.min(95, cpu * 0.7 + 20 + Math.random() * 8));
  return { cpu: Math.round(cpu), mem: Math.round(mem) };
}

// Control channel — the load balancer relays dashboard fault commands here.
app.post('/control/fault', (req, res) => {
  const mode = String(req.body?.mode || 'none');
  faultMode = mode === 'recover' ? 'none' : mode;
  console.log(`\x1b[33m[${SERVER_ID}]\x1b[0m fault mode -> ${faultMode}`);
  res.json({ ok: true, id: SERVER_ID, mode: faultMode });
});

app.get('/health', (req, res) => {
  // A "failing" node stops answering health checks -> monitor trips its breaker.
  if (faultMode === 'fail') return res.status(500).json({ status: 'error', id: SERVER_ID, fault: 'fail' });
  const { cpu, mem } = currentLoad();
  const respond = () => res.json({ status: 'ok', id: SERVER_ID, cpu, mem, requests, uptime: process.uptime() });
  // A "slow" node drags out its health response so latency/health scores drop.
  if (faultMode === 'slow') return setTimeout(respond, 400 + Math.random() * 400);
  respond();
});

// Generic work endpoint — simulates variable processing time.
app.all('/*', (req, res) => {
  requests += 1;
  if (faultMode === 'fail') return res.status(500).json({ served_by: SERVER_ID, error: 'fault-injected failure' });
  const { cpu } = currentLoad();
  let work = 10 + cpu * 1.2 + Math.random() * 40; // ms
  if (faultMode === 'slow') work += 600;
  setTimeout(() => {
    res.json({
      served_by: SERVER_ID,
      path: req.path,
      method: req.method,
      processing_ms: Math.round(work),
      cpu,
    });
  }, Math.min(faultMode === 'slow' ? 1200 : 300, work));
});

app.listen(PORT, () => {
  console.log(`\x1b[32m[${SERVER_ID}]\x1b[0m backend service listening on :${PORT}`);
});
