import config from '../config.js';
import logger from '../utils/logger.js';

// The Agentic Core runs a continuous Observe -> Think -> Plan -> Act loop.
// It rebalances routing weights, trips/heals circuit breakers, flags anomalies
// and keeps an audit trail of every decision with human-readable reasoning.
export class AgentCore {
  constructor(monitor) {
    this.monitor = monitor;
    this.mode = 'HEURISTIC'; // could be 'LLM' if wired to a model
    this.decisions = [];     // audit trail (most recent last)
    this.tick = 0;
    this._timer = null;
    this.latestDecision = null;
  }

  start() {
    this._timer = setInterval(() => this.cycle(), config.agentIntervalMs);
    logger.agent(`Agentic core online (${this.mode}, every ${config.agentIntervalMs}ms)`);
  }
  stop() { clearInterval(this._timer); }

  cycle() {
    this.tick += 1;
    this.monitor.tickBreakers();

    const observation = this.observe();
    const thought = this.think(observation);
    const plan = this.plan(observation, thought);
    this.act(plan);

    const decision = {
      id: `dec-${Date.now()}`,
      tick: this.tick,
      time: new Date().toISOString(),
      mode: this.mode,
      observation,
      reasoning: thought.reasoning,
      actions: plan.actions,
    };
    this.latestDecision = decision;
    this.decisions.push(decision);
    if (this.decisions.length > 100) this.decisions.shift();

    if (plan.actions.length) {
      logger.agent(`tick ${this.tick}: ${plan.actions.map(a => a.summary).join(' | ')}`);
    }
  }

  // OBSERVE — gather the current system picture.
  observe() {
    const servers = this.monitor.snapshotAll();
    const healthy = servers.filter(s => s.healthy);
    const avgLatency = healthy.length
      ? Math.round(healthy.reduce((a, s) => a + s.latency, 0) / healthy.length) : 0;
    const avgScore = healthy.length
      ? Math.round(healthy.reduce((a, s) => a + s.healthScore, 0) / healthy.length) : 0;
    return {
      total: servers.length,
      healthy: healthy.length,
      avgLatency,
      avgScore,
      servers,
    };
  }

  // THINK — reason about the observation and produce intents.
  think(obs) {
    const notes = [];
    const intents = [];

    if (obs.healthy === 0) {
      notes.push('All backends are down — no routing possible. Awaiting recovery.');
    } else if (obs.healthy < obs.total) {
      notes.push(`${obs.total - obs.healthy} backend(s) degraded; concentrating traffic on healthy nodes.`);
    }

    for (const s of obs.servers) {
      if (!s.healthy) { intents.push({ id: s.id, dir: 'down' }); continue; }
      if (s.healthScore >= 75 && s.latency < 120) {
        intents.push({ id: s.id, dir: 'up' });
      } else if (s.healthScore < 45 || s.errorRate > 15 || s.latency > 250) {
        intents.push({ id: s.id, dir: 'down' });
        notes.push(`${s.id} strained (health ${s.healthScore}, ${s.latency}ms, err ${s.errorRate}%).`);
      } else {
        intents.push({ id: s.id, dir: 'hold' });
      }
    }

    if (!notes.length) notes.push(`System nominal — avg health ${obs.avgScore}, avg latency ${obs.avgLatency}ms.`);
    return { reasoning: notes.join(' '), intents };
  }

  // PLAN — turn intents into concrete weight/breaker actions.
  plan(obs, thought) {
    const actions = [];
    for (const intent of thought.intents) {
      const s = this.monitor.get(intent.id);
      if (!s) continue;
      const before = s.weight;
      if (intent.dir === 'up')   s.weight = Math.min(3, +(s.weight + 0.15).toFixed(2));
      if (intent.dir === 'down') s.weight = Math.max(0.1, +(s.weight - 0.25).toFixed(2));
      // 'hold' decays gently toward 1 (neutral)
      if (intent.dir === 'hold') s.weight = +(s.weight + (1 - s.weight) * 0.1).toFixed(2);

      if (Math.abs(s.weight - before) >= 0.01) {
        actions.push({
          type: 'ADJUST_WEIGHT',
          server: s.id,
          from: before,
          to: s.weight,
          summary: `${s.id} weight ${before.toFixed(2)}→${s.weight.toFixed(2)}`,
        });
      }
    }
    return { actions };
  }

  // ACT — weights are applied in-place above; this is where side-effects
  // (notifications, external calls) would go. Kept explicit for clarity.
  act(plan) { return plan; }

  snapshot() {
    const weights = {};
    const breakers = {};
    for (const s of this.monitor.servers) {
      weights[s.id] = Number(s.weight.toFixed(2));
      breakers[s.id] = { state: s.circuit };
    }
    return {
      mode: this.mode,
      tick: this.tick,
      weights,
      circuitBreakers: breakers,
      latestDecision: this.latestDecision && {
        reasoning: this.latestDecision.reasoning,
        actions: this.latestDecision.actions,
        time: this.latestDecision.time,
      },
    };
  }
}

export default AgentCore;
