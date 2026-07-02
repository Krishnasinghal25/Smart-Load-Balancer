# 📖 INFORMATION — NEON Smart Load Balancer (A → Z)

This is the **complete reference** for the project: what it is, how it works, every
technology used, every file, every API, and how to run it. If you read only one
document, read this one.

---

## Table of Contents

1. [What this project is](#1-what-this-project-is)
2. [What a load balancer is (plain English)](#2-what-a-load-balancer-is-plain-english)
3. [Feature list](#3-feature-list)
4. [Complete tech stack](#4-complete-tech-stack)
5. [High-level architecture](#5-high-level-architecture)
6. [Repository structure (every file)](#6-repository-structure-every-file)
7. [Backend deep dive](#7-backend-deep-dive)
8. [The 5 routing strategies](#8-the-5-routing-strategies)
9. [Health scoring & circuit breakers](#9-health-scoring--circuit-breakers)
10. [The Agentic Core (Observe → Think → Plan → Act)](#10-the-agentic-core)
11. [Frontend deep dive](#11-frontend-deep-dive)
12. [The 3D scene](#12-the-3d-scene)
13. [The Control Center (user-controlled input)](#13-the-control-center)
14. [The AI assistant (local Ollama)](#14-the-ai-assistant-local-ollama)
15. [Full API reference](#15-full-api-reference)
16. [Configuration (environment variables)](#16-configuration-environment-variables)
17. [The life of a request (data flow)](#17-the-life-of-a-request)
18. [How to run](#18-how-to-run)
19. [Ports](#19-ports)
20. [Troubleshooting](#20-troubleshooting)
21. [Glossary](#21-glossary)

---

## 1. What this project is

**NEON Smart Load Balancer** is a production-style, **AI-powered load balancer**
wrapped in an **immersive neon-cyberpunk 3D dashboard**. It is *completely
user-controlled*: nothing moves unless **you** send traffic. You drive requests
through the balancer, add/remove/break backend servers, run one-click demo
scenarios, and watch every request fly through a live 3D network in real time.

It also contains:
- An **autonomous agentic core** that continuously re-tunes routing weights and
  trips/heals circuit breakers, logging its own reasoning.
- A **local AI assistant** (runs on your own PC via **Ollama** — no internet, fully
  private) that answers questions about the system in plain English.

The whole thing runs from a single click of `START.bat`.

---

## 2. What a load balancer is (plain English)

Imagine a popular shop with several checkout counters. A **load balancer** is the
person at the door who sends each new customer to the best-available counter so no
single counter gets overwhelmed. In software:

- **Backend servers** = the checkout counters (the machines doing the actual work).
- **Requests** = the customers (web visits, searches, payments…).
- **The load balancer** = the smart doorkeeper that decides *which* server handles
  *each* request, checks that servers are still alive, and routes around any that
  break.

This project makes that invisible doorkeeper **visible, interactive, and animated**.

---

## 3. Feature list

| Area | What it does |
|------|--------------|
| 🧠 **Agentic core** | Observe → Think → Plan → Act loop tunes routing weights, trips/heals breakers, logs reasoning |
| 🔀 **5 routing strategies** | AI-adaptive · round-robin · least-connections · latency-aware · weighted — **hot-swappable at runtime** |
| ❤️ **Health monitoring** | Continuous probing, p50/p95/p99 latency, error rate, a 0–100 composite health score |
| ⚡ **Circuit breakers** | CLOSED → OPEN → HALF_OPEN isolation with automatic recovery probing |
| 🌐 **Live 3D topology** | React-Three-Fiber scene: pulsing AI core, orbiting health-colored nodes, streaming request packets |
| 📡 **Live telemetry** | Full system state pushed over WebSocket every 500 ms — the dashboard never polls |
| 🎛️ **Control Center** | Send your own traffic, one-click scenarios, add/remove/break servers, all in plain English |
| 🤖 **AI assistant** | Local Ollama model answers questions about health, latency, strategy, errors |
| 🚦 **User-controlled** | Traffic flows only when *you* send it (auto demo traffic is an optional toggle) |

---

## 4. Complete tech stack

### Backend — the load balancer (`backend/`)
| Tech | Version | Why it's used |
|------|---------|---------------|
| **Node.js** | ≥ 18 | JavaScript runtime for the server |
| **Express** | ^4.19.2 | HTTP server: REST API + reverse proxy host |
| **http-proxy-middleware** | ^2.0.6 | Reverse-proxies `/api/*` to the chosen backend |
| **ws** | ^8.16.0 | WebSocket server for 500 ms live telemetry |
| **axios** | ^1.6.8 | HTTP client (health checks, user-sent requests, Ollama calls) |
| **cors** | ^2.8.5 | Allows the dashboard (different port) to call the API |
| **nodemon** | ^3.1.0 (dev) | Auto-restart on code change during development |
| **ES Modules** | — | `"type": "module"` — modern `import`/`export` syntax |

### Demo backends (`backend-services/`)
| Tech | Version | Why |
|------|---------|-----|
| **Express** | ^4.19.2 | Tiny worker services that report fake CPU/memory and simulate work; support fault injection |

### Frontend — the dashboard (`frontend/`)
| Tech | Version | Why it's used |
|------|---------|---------------|
| **React** | ^18.3.1 | UI framework |
| **Vite** | ^5.2.13 | Lightning-fast dev server + build tool |
| **react-router-dom** | ^6.23.1 | Client-side routing between pages |
| **Three.js** | ^0.165.0 | The 3D engine |
| **@react-three/fiber** | ^8.16.8 | React renderer for Three.js |
| **@react-three/drei** | ^9.109.0 | Ready-made 3D helpers (OrbitControls, Stars, Float, shapes) |
| **Framer Motion** | ^11.2.10 | All 2D animations (cards, toasts, ripples, layout transitions) |
| **Recharts** | ^2.12.7 | Latency & distribution charts |
| **lucide-react** | ^0.379.0 | Icon set |
| **Tailwind CSS** | ^3.4.4 | Utility-first styling |
| **PostCSS + Autoprefixer** | ^8.4.38 / ^10.4.19 | CSS processing pipeline |

### AI assistant
| Tech | Why |
|------|-----|
| **Ollama** (local) | Runs a small LLM on your own machine, private and offline |
| **qwen2.5:3b** (default model) | The chat model; configurable via `OLLAMA_MODEL` |

### Fonts & design
- **Orbitron** (display / headings) and **JetBrains Mono** (body) via Google Fonts.
- Custom neon-cyberpunk CSS design system (glass panels, neon glow, animated grid, scanlines).

### Optional deployment
- **Docker** + **docker-compose** — one command to build & run both services.

---

## 5. High-level architecture

```
                       ┌──────────────────────────────────────────┐
   Browser  ◀── WS ────│            LOAD BALANCER  :3030            │
  (dashboard :5173)    │                                            │
                       │  ┌────────────┐   ┌─────────────────────┐  │
   /api/*  ───────────▶│  │  Router    │──▶│   Health Monitor    │  │
   /lb/*   ───────────▶│  │ 5 strategies│  │ scores + breakers   │  │
                       │  └─────┬──────┘   └─────────────────────┘  │
                       │        │          ┌─────────────────────┐  │
                       │        │          │    Agentic Core     │  │
                       │        │          │ O→T→P→A · weights    │  │
                       │        ▼          └─────────────────────┘  │
                       │  ┌───────────┐    ┌─────────────────────┐  │
                       │  │  Metrics  │    │   WS Broadcaster    │──┼─▶ 500ms telemetry
                       │  └───────────┘    └─────────────────────┘  │
                       │        │          ┌─────────────────────┐  │
                       │        │          │   /lb/chat → Ollama │──┼─▶ localhost:11434
                       └────────┼──────────────────────────────────┘
                                ▼
              ┌──────────┬──────────┬───────────┐
              │ srv-alpha│ srv-bravo│srv-charlie │  :5001-5003  (auto-spawned)
              └──────────┴──────────┴───────────┘   (+ ones you add: srv-delta…)
```

**Two processes you run:** the **load balancer** (port 3030) and the **dashboard**
(port 5173). The load balancer *itself* spawns the 3 demo backends as child
processes. The dashboard talks to the balancer over a REST API (control) and a
WebSocket (live telemetry).

---

## 6. Repository structure (every file)

```
Load balancer/
├── START.bat                     # One-click launcher (installs deps, starts both servers, opens browser)
├── README.md                     # Quick-start guide
├── INFORMATION.md                # ← this file (complete reference)
├── docker-compose.yml            # Optional: run everything with Docker
├── .env.example                  # All configurable environment variables
├── .gitignore                    # Excludes node_modules, dist, .env, logs
│
├── backend/                      # THE LOAD BALANCER
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js             # Express app, reverse proxy, all API endpoints, traffic sim, boot
│       ├── config.js             # Central config (reads env vars, sensible defaults)
│       ├── loadBalancer/
│       │   └── router.js         # The 5 selection strategies + request classifier
│       ├── health/
│       │   └── monitor.js        # Per-server state, health scoring, circuit breakers, percentiles
│       ├── agent/
│       │   └── agentCore.js      # The autonomous Observe→Think→Plan→Act loop
│       ├── metrics/
│       │   └── store.js          # Request/error rate, distribution, routing log, live feed
│       ├── ws/
│       │   └── broadcaster.js    # 500 ms WebSocket telemetry fan-out
│       └── utils/
│           └── logger.js         # Colored console logger
│
├── backend-services/             # THE DEMO BACKENDS (workers)
│   ├── package.json
│   └── backend.js                # Parameterized worker: /health, work endpoint, /control/fault
│
└── frontend/                     # THE DASHBOARD
    ├── Dockerfile
    ├── index.html
    ├── vite.config.js            # Vite (port 5173)
    ├── tailwind.config.js        # Neon palette, keyframes, fonts
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── main.jsx              # React entry
        ├── App.jsx               # Routes + page transitions
        ├── styles/index.css      # Neon design system (glass, glow, grid, scanlines)
        ├── lib/api.js            # All REST calls to the balancer
        ├── hooks/
        │   └── useMetricsStream.js  # WebSocket client with auto-reconnect
        ├── context/
        │   └── MetricsContext.jsx   # Shares one live telemetry stream app-wide
        ├── components/
        │   ├── Header.jsx        # Top nav + live status
        │   ├── StatCard.jsx      # Animated count-up stat tile
        │   ├── ServerCard.jsx    # Backend server card (dashboard)
        │   ├── AgentPanel.jsx    # Agent reasoning panel
        │   └── StrategySwitcher.jsx # Hot-swap routing strategy
        ├── pages/
        │   ├── Dashboard.jsx     # Overview: stats, 3D preview, servers, charts
        │   ├── ControlPage.jsx   # ★ Control Center: guided 1-2-3 + scenarios
        │   ├── ThreeView.jsx     # Full-screen 3D live topology
        │   ├── HistoryPage.jsx   # Agent decisions + routing feed
        │   ├── ChatPage.jsx      # AI assistant (Ollama)
        │   └── InfoPage.jsx      # In-app docs
        └── three/
            ├── NetworkScene.jsx  # Assembles the whole 3D scene
            ├── CoreOrb.jsx       # Pulsing central "AI brain"
            ├── ServerNode.jsx    # Orbiting server node (colored by health)
            └── RequestParticles.jsx # Glowing packets flying core→node
```

---

## 7. Backend deep dive

### `config.js` — central configuration
Reads every setting from environment variables with safe defaults. Key defaults:
`LB_PORT=3030`, `strategy='ai-adaptive'`, `spawnBackends=true`,
**`simulateTraffic=false`** (this build is user-controlled by default),
`healthCheckIntervalMs=4000`, `agentIntervalMs=8000`, `telemetryIntervalMs=500`,
`metricsWindowMs=60000`, `ollamaModel='qwen2.5:3b'`.

### `server.js` — the heart
- Creates the Express app (CORS + JSON body parsing).
- Builds the four core services: `HealthMonitor`, `Router`, `AgentCore`, `MetricsStore`.
- **`spawnBackend(b)` / `spawnBackends()`** — `fork()`s the demo backends as child
  processes, tracked in a `Map` by id (so they can be added/killed at runtime).
- **`systemState()`** — the single source of truth: assembles the full snapshot
  (strategy, `simulateTraffic` flag, system totals, servers, routing, agent) that
  feeds both the REST API and the WebSocket.
- **Reverse proxy** — `app.use('/api', …, proxy)`: classifies the request, asks the
  router to pick a server, increments its active connections, proxies to it, and on
  response records latency + success/failure into metrics.
- **Control endpoints** — `/lb/send`, `/lb/traffic`, `/lb/backend/add`,
  `/lb/backend/remove`, `/lb/backend/fault`, `/lb/strategy`, `/lb/chat` (see
  [API reference](#15-full-api-reference)).
- **Synthetic traffic generator** — `simulateOnce()` fakes 1–4 requests per tick,
  but only runs while the `simulateOn` flag is true (toggled from the UI).
- **Boot** — starts the HTTP server, the WebSocket broadcaster, the health monitor,
  the agent, and the traffic loop. Handles graceful shutdown (kills child backends).

### `health/monitor.js` — is each server alive & how well?
- **`ServerState`** holds per-server live data: health flag, 0–100 score, agent
  weight, active connections, latency samples (for p50/p95/p99), a rolling event
  window (for error rate), and circuit-breaker state.
- **`checkOne(s)`** probes `GET {server}/health` every 4 s; success/failure drives
  the breaker and the score.
- **`addServer` / `removeServer`** let the dashboard grow or shrink the pool live.
- Health score formula (see §9).

### `loadBalancer/router.js` — who handles this request?
Implements the 5 strategies (see §8) plus **`classifyRequest(path, method)`**, a
heuristic that tags each request `compute` / `io` / `balanced` so the AI-adaptive
strategy can nudge accordingly.

### `agent/agentCore.js` — the autonomous brain (see §10).

### `metrics/store.js` — the numbers
Aggregates routing telemetry: request rate & error rate over a 60 s sliding window,
per-server distribution, a ring buffer of the last 200 routing decisions (History
page), and a live feed of the last 40 requests (used to spawn 3D particles).

### `ws/broadcaster.js` — live telemetry
A `WebSocketServer` on `/metrics`. On connect it sends the current state immediately,
then broadcasts the full `systemState()` to every client every 500 ms. The dashboard
therefore **never polls** — it just listens.

### `utils/logger.js` — colored, timestamped console logging.

### `backend-services/backend.js` — the demo workers
A tiny parameterized Express service (run 3 copies with different `SERVER_ID`/`PORT`).
- `GET /health` — reports believable wandering CPU/memory.
- `ALL /*` — a generic "work" endpoint with variable processing time.
- **`POST /control/fault`** — fault injection: `fail` (return 500 + fail health so its
  breaker trips), `slow` (add heavy latency), `recover` (back to normal). This is what
  the dashboard's **Break / Slow / Fix** buttons drive.

---

## 8. The 5 routing strategies

The active strategy is hot-swappable at runtime (`POST /lb/strategy` or the UI).

| Strategy | How it picks a server |
|----------|-----------------------|
| **round-robin** | Cycles through servers in order — simple and fair. |
| **least-connections** | Picks the server with the fewest active in-flight requests. |
| **latency-aware** | Picks the server with the lowest recent latency. |
| **weighted** | Weighted-random pick, biased by each server's agent-tuned weight. |
| **ai-adaptive** *(default)* | Composite score per server: `weight×30 + healthScore×0.4 + inverseLatency×0.3 + inverseLoad×0.2 + inverseConnections×0.1`, plus a **type-aware nudge** (favor low-CPU nodes for `compute` requests, low-latency nodes for `io`). Highest score wins. |

Only **available** servers are eligible: `healthy === true` **and** circuit breaker
is not `OPEN`. If none are available, the balancer returns `503 no healthy backends`.

---

## 9. Health scoring & circuit breakers

### Health score (0–100)
Computed each probe for healthy servers:
```
latScore  = max(0, 100 − latency/4)        // 0ms→100, 400ms+→0
errScore  = max(0, 100 − errorRate×2)      // 0%→100, 50%+→0
loadScore = max(0, 100 − cpu)              // reported CPU
healthScore = round( latScore×0.5 + errScore×0.3 + loadScore×0.2 )
```
An unhealthy server scores `0`.

### Circuit breaker — a safety switch, three states
```
   CLOSED ──(3 consecutive failures)──▶ OPEN
     ▲                                    │
     │                          (after ~10s cooldown)
 (2 successes)                            ▼
   CLOSED ◀──(probe succeeds)──── HALF_OPEN
```
- **CLOSED** — normal, traffic flows.
- **OPEN** — server is isolated; it receives **no** traffic (this is what you see when
  you press *Break*).
- **HALF_OPEN** — after a cooldown, one probe is allowed through; success closes the
  breaker (recovered), failure re-opens it.

This is why, in the "A server crashes" scenario, traffic instantly reroutes around
the broken node and then flows back once it heals.

---

## 10. The Agentic Core

Runs every 8 s (`AGENT_INTERVAL_MS`) as a continuous **Observe → Think → Plan → Act**
loop, and keeps an audit trail of every decision with human-readable reasoning
(shown on the **History** page).

1. **Observe** — snapshot all servers: how many healthy, average latency, average score.
2. **Think** — reason about each server and form an *intent* (`up` / `hold` / `down`):
   healthy & fast → `up`; strained (low score, high errors, or high latency) → `down`.
3. **Plan** — turn intents into concrete **weight adjustments**
   (`up`: +0.15 up to 3.0, `down`: −0.25 down to 0.1, `hold`: gently decay toward 1.0).
4. **Act** — apply the weights (which the `weighted` and `ai-adaptive` strategies then
   use), tick the circuit breakers, and record the decision.

The mode is `HEURISTIC` (rule-based) but structured so an LLM could be dropped in.

---

## 11. Frontend deep dive

- **`main.jsx`** boots React; **`App.jsx`** wraps everything in `MetricsProvider` and
  defines the routes with animated page transitions (Framer Motion).
- **`useMetricsStream.js`** — opens the WebSocket to `ws://host:3030/metrics`, parses
  each frame into state, and **auto-reconnects** every 1.5 s if the link drops.
- **`MetricsContext.jsx`** — provides that single live stream to the whole app plus a
  rolling 40-point history for the charts. Every component reads from here, so there's
  exactly one socket.
- **`lib/api.js`** — all REST helpers: `setStrategy`, `getHistory`, `askAssistant`,
  and the control calls `sendRequests`, `setTraffic`, `addBackend`, `removeBackend`,
  `injectFault`.

### Pages
| Page | Route | What it shows |
|------|-------|---------------|
| **Dashboard** | `/` | Stat tiles, 3D preview, strategy switcher, agent panel, server pool, latency & distribution charts. Shows a prompt to open the Control Center when idle. |
| **Control Center** | `/control` | ★ The guided user-controlled console (see §13). |
| **3D Live** | `/3d` | Full-screen interactive 3D topology. |
| **History** | `/history` | Every agent decision + the routing feed. |
| **AI Chat** | `/chat` | The local Ollama assistant. |
| **Docs** | `/info` | In-app documentation. |

### Components
`StatCard` (animated count-up numbers), `ServerCard`, `AgentPanel`,
`StrategySwitcher` (hot-swaps the strategy), `Header` (nav + live LIVE/OFFLINE badge
and req/s).

### Styling system (`styles/index.css` + `tailwind.config.js`)
A hand-built neon-cyberpunk system: `.glass` panels with gradient borders, neon text
glows (`.neon-text-cyan/magenta/purple/lime`), an animated `.cyber-grid`, `.scanlines`
CRT overlay, circuit-breaker chip colors, and custom keyframes (`grid-pan`, `flicker`,
`scan`). Palette: cyan `#00f0ff`, purple `#a855f7`, magenta `#ff2bd6`, lime `#39ff14`,
amber `#ffb800`, red `#ff2e63`.

---

## 12. The 3D scene

Built with **Three.js** via **@react-three/fiber** + **drei**.

- **`NetworkScene.jsx`** — sets up the Canvas, camera, lights, starfield and fog, then
  lays the servers out on a circle around the core and wires in the request particles.
- **`CoreOrb.jsx`** — the central "AI brain": a pulsing, rotating icosahedron with
  wireframe shell and glow rings. It **speeds up with request rate** and **turns red**
  if every backend is down.
- **`ServerNode.jsx`** — an octahedron per server on the orbit, **colored green/amber/red
  by health**, scaling with active connections, flickering when its breaker is OPEN.
- **`RequestParticles.jsx`** — glowing packets that fly **core → node** along arced
  bezier paths, **colored by request type** (cyan = I/O, magenta = compute,
  purple = balanced), driven by the live request feed.
- **Controls** — auto-rotate, drag to orbit, scroll to zoom (drei `OrbitControls`).

Because your user-sent requests are recorded into the same live feed, **they appear as
packets in the 3D scene in real time.**

---

## 13. The Control Center

The flagship user-controlled page (`/control`), designed to be operable by anyone.

- **One-click demo scenarios** (easiest path) — each runs a whole story on its own with
  a live caption:
  - ☀️ **Normal day** — steady calm traffic.
  - 📈 **Traffic spike** — traffic ramps up fast, like a sale going viral.
  - 💥 **A server crashes** — breaks a server, sends traffic (watch it reroute), then heals it.
  - 🛡️ **Calm everything** — fixes all servers and settles back down.
- **Guided 1-2-3 flow**:
  1. **Pick what to send** — big plain-word cards ("A user visits", "A heavy job",
     "A search", "A checkout").
  2. **How much & send** — friendly amounts ("A little / A lot / A flood") + one big
     **Send** button.
  3. **Watch it happen** — the live 3D view, with a neon ripple on each send.
- **Live stat tiles** — healthy servers, requests/sec, average speed, total handled
  (all animated).
- **Your servers** — each with a health-ring gauge and clear **Break / Slow / Fix /
  Remove** buttons (with tooltips), plus **Add a server**. Cards animate in/out.
- **Advanced drawer** (collapsed) — recent-request log and the automatic-demo-traffic
  toggle, tucked away so the main view stays simple.

Every button has a plain-English tooltip.

---

## 14. The AI assistant (local Ollama)

The **AI Chat** page talks to **Ollama running on your own computer** — private, offline,
no data leaves your machine.

- Backend endpoint `POST /lb/chat` builds a **plain-English snapshot** of the live system
  (routing method, healthy servers, traffic, per-server status) and sends it to Ollama's
  `/api/chat` with a system prompt that instructs the model to answer *simply, for a
  non-technical person*.
- Default model: **`qwen2.5:3b`** (configurable via `OLLAMA_MODEL`). Endpoint configurable
  via `OLLAMA_URL` (default `http://127.0.0.1:11434`).
- If Ollama isn't running, the assistant returns a friendly hint telling you to start it
  and `ollama pull qwen2.5:3b`.

**Setup:** install [Ollama](https://ollama.com), then `ollama pull qwen2.5:3b`, and make
sure Ollama is running.

---

## 15. Full API reference

Base URL: `http://localhost:3030`

### Telemetry & control
| Method | Route | Body / Notes | Description |
|--------|-------|--------------|-------------|
| `GET`  | `/lb/state` | — | Full system snapshot |
| `GET`  | `/lb/history` | — | Last 100 agent decisions + routing feed |
| `GET`  | `/lb/agent` | — | Agent snapshot (weights, breakers, latest reasoning) |
| `GET`  | `/health` | — | Load-balancer liveness |
| `POST` | `/lb/strategy` | `{ "strategy": "round-robin" }` | Switch routing strategy |
| `POST` | `/lb/chat` | `{ "message": "…" }` | Ask the local Ollama assistant |

### User-driven controls (the Control Center)
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/lb/send` | `{ "path": "/api/search", "method": "GET", "count": 8 }` | Fire N real requests through the balancer (routed & recorded) |
| `POST` | `/lb/traffic` | `{ "enabled": true }` | Turn the auto demo-traffic generator on/off |
| `POST` | `/lb/backend/add` | `{}` (optional `{ "id": "srv-x" }`) | Spawn & register a new backend (auto port + name) |
| `POST` | `/lb/backend/remove` | `{ "id": "srv-delta" }` | Kill & deregister a backend |
| `POST` | `/lb/backend/fault` | `{ "id": "srv-alpha", "mode": "fail" }` | Inject a fault: `fail` \| `slow` \| `recover` |

### Proxy & WebSocket
| Method | Route | Description |
|--------|-------|-------------|
| `ANY`  | `/api/*` | Load-balanced reverse proxy to a chosen backend |
| `WS`   | `/metrics` | Live telemetry stream (full state every 500 ms) |

---

## 16. Configuration (environment variables)

Copy `.env.example` → `.env` in `backend/` (or set env vars).

| Var | Default | Meaning |
|-----|---------|---------|
| `LB_PORT` | `3030` | Load balancer port |
| `LB_STRATEGY` | `ai-adaptive` | Starting routing strategy |
| `BACKEND_1/2/3_PORT` | `5001/5002/5003` | Demo backend ports |
| `SPAWN_BACKENDS` | `true` | Auto-start the 3 demo backends |
| `SIMULATE_TRAFFIC` | `false` | Auto demo traffic (this build is user-controlled by default) |
| `SIMULATE_INTERVAL_MS` | `350` | Auto-traffic tick rate |
| `HEALTH_INTERVAL_MS` | `4000` | Health-probe cadence |
| `HEALTH_TIMEOUT_MS` | `2500` | Health-probe timeout |
| `AGENT_INTERVAL_MS` | `8000` | Agentic decision cadence |
| `TELEMETRY_INTERVAL_MS` | `500` | WebSocket broadcast rate |
| `METRICS_WINDOW_MS` | `60000` | Sliding window for rate/percentile math |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Local Ollama endpoint |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Chat model |
| `VITE_WS_URL` / `VITE_API_URL` | — | Point the dashboard at a different balancer |

---

## 17. The life of a request

**When you press "Send" in the Control Center:**
1. Dashboard → `POST /lb/send { path, method, count }`.
2. For each request, the balancer **classifies** it (`compute`/`io`/`balanced`).
3. The **router** picks the best available server per the active strategy.
4. Active-connections is incremented; the balancer makes the **real HTTP call** to that
   backend (so injected faults/latency are real).
5. On response, it records **latency + success/failure** into the server's state and the
   **metrics store** (distribution, live feed, routing log).
6. The **broadcaster** pushes the new `systemState()` to the dashboard within 500 ms.
7. The dashboard animates: stat tiles count up, the request feed adds a row, and a
   **glowing packet flies core→server in the 3D scene**.

Meanwhile, every 8 s the **agent** re-tunes weights, and every 4 s the **monitor**
re-checks health and updates the circuit breakers.

---

## 18. How to run

### Easiest — one click (Windows)
Double-click **`START.bat`**. It:
1. Checks Node is installed.
2. Installs dependencies on first run (backend, backend-services, frontend).
3. Opens two server windows (load balancer + dashboard).
4. Opens `http://localhost:5173` in your browser.

### Manual — two terminals
```bash
# Terminal 1 — the load balancer (auto-spawns the 3 demo backends)
cd backend
npm install
npm run dev            # → http://localhost:3030

# Terminal 2 — the dashboard
cd frontend
npm install
npm run dev            # → http://localhost:5173
```
First run also needs the demo-backend deps: `cd backend-services && npm install`.

### AI assistant
Install [Ollama](https://ollama.com), then `ollama pull qwen2.5:3b`, and keep Ollama running.

### Docker
```bash
docker compose up --build
# Load balancer → http://localhost:3030
# Dashboard     → http://localhost:5173
```

Then open **http://localhost:5173** and click **Control** to start sending traffic.

---

## 19. Ports

| Port | Service |
|------|---------|
| `3030` | Load balancer (REST API + reverse proxy + WebSocket) |
| `5173` | Dashboard (Vite dev server) |
| `5001` `5002` `5003` | Demo backends (`srv-alpha`, `srv-bravo`, `srv-charlie`) |
| `5004+` | Extra backends you add from the UI (`srv-delta`, …) |
| `11434` | Ollama (local AI) |

---

## 20. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Dashboard shows **OFFLINE** / "telemetry link down" | The load balancer isn't running on `:3030`. Start it. |
| Dashboard is empty / nothing moving | That's expected — this build is **user-controlled**. Open **Control** and send traffic (or turn on auto demo traffic in the Advanced drawer). |
| Chat says "couldn't reach the local AI" | Start **Ollama** and run `ollama pull qwen2.5:3b`. |
| `START.bat` window is blank | Fixed — the launcher now handles spaces in the folder path via `start /d`. |
| Port already in use | Change `LB_PORT` (backend) or the Vite port, or stop the process using it. |

---

## 21. Glossary

- **Load balancer** — the smart doorkeeper that sends each request to the best server.
- **Backend / server / node** — a machine that does the actual work.
- **Request** — one unit of work (a page visit, a search, a payment…).
- **Routing strategy** — the rule for choosing which server handles a request.
- **Health score** — a 0–100 grade of how well a server is doing (speed, errors, load).
- **Circuit breaker** — a safety switch that isolates a broken server so no traffic
  reaches it, then automatically probes to see if it has recovered.
- **Latency** — how long a request takes (milliseconds); lower is better.
- **p50 / p95 / p99** — "half of requests are faster than p50", "95% faster than p95",
  etc. — a way to describe typical vs. worst-case speed.
- **Agentic core** — the autonomous loop that keeps tuning the system on its own.
- **Telemetry** — the live stream of numbers the dashboard displays.
- **WebSocket** — a always-open two-way connection used to push live updates.
- **Reverse proxy** — a server that forwards requests to other servers on their behalf.

---

*Built with Node.js, Express, React, Three.js, Framer Motion, Tailwind CSS, and a local
Ollama model. One-click launch via `START.bat`.*
