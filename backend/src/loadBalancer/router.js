import logger from '../utils/logger.js';

// Router selects a target backend from the healthy pool using one of
// several strategies. Returns { server, strategy, reason }.
export class Router {
  constructor(monitor, initialStrategy = 'ai-adaptive') {
    this.monitor = monitor;
    this.strategy = initialStrategy;
    this._rr = 0; // round-robin cursor
  }

  setStrategy(name) {
    const valid = ['round-robin', 'least-connections', 'latency-aware', 'weighted', 'ai-adaptive'];
    if (!valid.includes(name)) return false;
    this.strategy = name;
    logger.route(`strategy switched -> ${name}`);
    return true;
  }

  select(reqHint = {}) {
    const pool = this.monitor.available();
    if (!pool.length) return { server: null, strategy: this.strategy, reason: 'no healthy backends' };

    switch (this.strategy) {
      case 'round-robin':       return this._roundRobin(pool);
      case 'least-connections': return this._leastConnections(pool);
      case 'latency-aware':     return this._latencyAware(pool);
      case 'weighted':          return this._weighted(pool);
      case 'ai-adaptive':
      default:                  return this._aiAdaptive(pool, reqHint);
    }
  }

  _roundRobin(pool) {
    const server = pool[this._rr % pool.length];
    this._rr += 1;
    return { server, strategy: 'round-robin', reason: `cursor ${this._rr}` };
  }

  _leastConnections(pool) {
    const server = pool.reduce((a, b) => (b.activeConnections < a.activeConnections ? b : a));
    return { server, strategy: 'least-connections', reason: `${server.activeConnections} active conns` };
  }

  _latencyAware(pool) {
    const server = pool.reduce((a, b) => (b.latency < a.latency ? b : a));
    return { server, strategy: 'latency-aware', reason: `${Math.round(server.latency)}ms latency` };
  }

  _weighted(pool) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const s of pool) { r -= s.weight; if (r <= 0) return { server: s, strategy: 'weighted', reason: `weight ${s.weight.toFixed(2)}` }; }
    return { server: pool[0], strategy: 'weighted', reason: 'fallback' };
  }

  // Composite score: agent weight + health + inverse latency + inverse load,
  // with a small preference for the request type hint (compute/io/balanced).
  _aiAdaptive(pool, hint) {
    let best = null, bestScore = -Infinity, bestReason = '';
    for (const s of pool) {
      const latTerm  = 100 - Math.min(100, s.latency / 4);
      const loadTerm = 100 - s.cpu;
      const connTerm = 100 - Math.min(100, s.activeConnections * 8);
      let score = s.weight * 30 + s.healthScore * 0.4 + latTerm * 0.3 + loadTerm * 0.2 + connTerm * 0.1;

      // Type-aware nudge
      if (hint.type === 'compute'  && s.cpu < 50) score += 10;
      if (hint.type === 'io'       && s.latency < 80) score += 8;

      if (score > bestScore) {
        bestScore = score;
        best = s;
        bestReason = `score ${score.toFixed(0)} (w${s.weight.toFixed(2)}, h${s.healthScore}, ${Math.round(s.latency)}ms, cpu${Math.round(s.cpu)})`;
      }
    }
    return { server: best, strategy: 'ai-adaptive', reason: bestReason };
  }
}

// Lightweight heuristic request classifier (stand-in for an LLM classifier).
export function classifyRequest(pathname = '', method = 'GET') {
  const p = pathname.toLowerCase();
  if (/(compute|render|train|hash|encode|image|video)/.test(p)) return 'compute';
  if (/(db|query|fetch|read|file|download|upload|stream)/.test(p)) return 'io';
  if (method === 'POST' || method === 'PUT') return 'compute';
  return 'balanced';
}

export default Router;
