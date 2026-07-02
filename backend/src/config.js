// Central configuration for the load balancer.
// Everything can be overridden with environment variables.

const num = (v, d) => (v !== undefined ? Number(v) : d);

export const config = {
  // Port the load balancer listens on (proxy + API + WebSocket)
  port: num(process.env.LB_PORT, 3030),

  // Backend pool. The LB can auto-spawn these as child processes (see server.js).
  backends: [
    { id: 'srv-alpha',   host: '127.0.0.1', port: num(process.env.BACKEND_1_PORT, 5001) },
    { id: 'srv-bravo',   host: '127.0.0.1', port: num(process.env.BACKEND_2_PORT, 5002) },
    { id: 'srv-charlie', host: '127.0.0.1', port: num(process.env.BACKEND_3_PORT, 5003) },
  ],

  // Auto-spawn the demo backend services on startup so the whole thing
  // runs from a single `npm run dev`. Set SPAWN_BACKENDS=false to disable.
  spawnBackends: process.env.SPAWN_BACKENDS !== 'false',

  // Built-in synthetic traffic generator. This build is USER-CONTROLLED by
  // default: traffic only flows when YOU send it from the Control Console.
  // Set SIMULATE_TRAFFIC=true (or flip the toggle in the UI) for auto demo traffic.
  simulateTraffic: process.env.SIMULATE_TRAFFIC === 'true',
  simulateIntervalMs: num(process.env.SIMULATE_INTERVAL_MS, 350),

  // Health monitoring
  healthCheckIntervalMs: num(process.env.HEALTH_INTERVAL_MS, 4000),
  healthCheckTimeoutMs: num(process.env.HEALTH_TIMEOUT_MS, 2500),

  // Agentic decision loop
  agentIntervalMs: num(process.env.AGENT_INTERVAL_MS, 8000),

  // WebSocket telemetry broadcast rate
  telemetryIntervalMs: num(process.env.TELEMETRY_INTERVAL_MS, 500),

  // Default routing strategy: round-robin | least-connections | latency-aware | weighted | ai-adaptive
  strategy: process.env.LB_STRATEGY || 'ai-adaptive',

  // Sliding window (ms) used for rate / percentile calculations
  metricsWindowMs: num(process.env.METRICS_WINDOW_MS, 60000),

  // Local Ollama LLM used to power the dashboard chatbot (answers in plain English).
  // Start Ollama and `ollama pull qwen2.5:3b` to use it. Override with env vars.
  ollamaUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
};

export default config;
