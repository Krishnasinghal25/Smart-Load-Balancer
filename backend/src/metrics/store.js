import config from '../config.js';

// Aggregates routing-level telemetry: request rate, error rate, distribution,
// live request feed and a ring buffer of routing decisions (for the UI history).
export class MetricsStore {
  constructor() {
    this.events = [];            // {t, ok, serverId}
    this.distribution = {};      // serverId -> count
    this.routingLog = [];        // recent routing decisions (for History page)
    this.liveRequests = [];      // in-flight/animation feed
    this.strategyCounts = {};    // strategy -> count
    this.totalRouted = 0;
  }

  recordRoute({ serverId, strategy, reason, type, method, path, latency, ok }) {
    const now = Date.now();
    this.totalRouted += 1;
    this.distribution[serverId] = (this.distribution[serverId] || 0) + 1;
    this.strategyCounts[strategy] = (this.strategyCounts[strategy] || 0) + 1;
    this.events.push({ t: now, ok, serverId });

    const cutoff = now - config.metricsWindowMs;
    while (this.events.length && this.events[0].t < cutoff) this.events.shift();

    const entry = {
      id: `req-${now}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date(now).toISOString(),
      serverId, strategy, reason, type, method, path,
      latency: Math.round(latency), ok,
    };
    this.routingLog.push(entry);
    if (this.routingLog.length > 200) this.routingLog.shift();

    // Live feed used to spawn 3D particles / timeline rows
    this.liveRequests.push({ id: entry.id, serverId, method, path, type, t: now });
    if (this.liveRequests.length > 40) this.liveRequests.shift();
    return entry;
  }

  get requestRate() {
    if (!this.events.length) return 0;
    const span = Math.max(1, (Date.now() - this.events[0].t) / 1000);
    return this.events.length / span;
  }

  get errorRate() {
    if (!this.events.length) return 0;
    return (this.events.filter(e => !e.ok).length / this.events.length) * 100;
  }

  snapshot() {
    return {
      totalRouted: this.totalRouted,
      requestRate: Number(this.requestRate.toFixed(1)),
      errorRate: Number(this.errorRate.toFixed(2)),
      distribution: { ...this.distribution },
      strategyCounts: { ...this.strategyCounts },
      liveRequests: this.liveRequests.slice(-20),
    };
  }
}

export default MetricsStore;
