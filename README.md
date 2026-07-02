# ⚡ NEON · AI Load Balancer

A production-style **AI-powered load balancer** with an **immersive neon-cyberpunk 3D dashboard**. Request packets stream through a live 3D network topology in real time, backend nodes glow by health, and an autonomous **agentic core** continuously rebalances traffic and trips/heals circuit breakers.

![stack](https://img.shields.io/badge/node-%3E=18-39ff14?style=flat-square) ![react](https://img.shields.io/badge/react-18-00f0ff?style=flat-square) ![three](https://img.shields.io/badge/three.js-r165-a855f7?style=flat-square)

---

## ✨ Features

| | |
|---|---|
| 🧠 **Agentic Core** | Observe → Think → Plan → Act loop tunes routing weights, trips/heals breakers, logs its reasoning |
| 🔀 **5 Routing Strategies** | AI-adaptive · round-robin · least-connections · latency-aware · weighted — **hot-swappable at runtime** |
| ❤️ **Health Monitoring** | Continuous probing, p50/p95/p99 latency, error rate, 0–100 composite health score |
| ⚡ **Circuit Breakers** | CLOSED → OPEN → HALF_OPEN isolation with automatic recovery probing |
| 🌐 **3D Live Topology** | React-Three-Fiber scene: pulsing AI core, orbiting health-colored nodes, streaming request packets |
| 📡 **Live Telemetry** | Full system state pushed over WebSocket every 500ms — the dashboard never polls |
| 🤖 **AI Assistant** | Ask about health, latency, strategy, agent weights, errors |
| 🚦 **Self-driving demo** | Auto-spawns 3 backends and generates synthetic traffic — looks alive out of the box |

---

## 🚀 Quick start (no Docker needed)

Open **two terminals**.

**1 · Backend** (the load balancer auto-spawns the 3 demo backends + synthetic traffic):

```bash
cd backend
npm install
npm run dev
```
→ Load balancer on **http://localhost:3030** · WebSocket on `ws://localhost:3030/metrics`

**2 · Frontend** (the neon dashboard):

```bash
cd frontend
npm install
npm run dev
```
→ Dashboard on **http://localhost:5173**

> First run also needs deps for the demo backends the LB spawns:
> ```bash
> cd backend-services && npm install
> ```

Open **http://localhost:5173**, then hit the **3D Live** tab for the full interactive topology (drag to orbit, scroll to zoom).

---

## 🐳 Run with Docker

```bash
docker compose up --build
```
- Load balancer → http://localhost:3030
- Dashboard → http://localhost:5173

---

## 🧩 Architecture

```
                       ┌──────────────────────────────────────┐
   Browser  ◀── WS ────│           LOAD BALANCER  :3030         │
  (dashboard)          │                                        │
                       │  ┌────────────┐   ┌─────────────────┐  │
   /api/*  ───────────▶│  │  Router    │──▶│  Health Monitor │  │
                       │  │ 5 strategies│   │ scores/breakers │  │
                       │  └─────┬──────┘   └─────────────────┘  │
                       │        │          ┌─────────────────┐  │
                       │        │          │  Agentic Core   │  │
                       │        │          │ O→T→P→A · weights│  │
                       │        ▼          └─────────────────┘  │
                       └────────┼──────────────────────────────┘
                                ▼
              ┌──────────┬──────────┬──────────┐
              │ srv-alpha│ srv-bravo│srv-charlie│  :5001-5003
              └──────────┴──────────┴──────────┘
```

### Backend (`backend/`)
- `src/server.js` — Express app, reverse proxy, API, traffic simulator, boot
- `src/loadBalancer/router.js` — the 5 selection strategies + request classifier
- `src/health/monitor.js` — per-server state, scoring, circuit breakers, percentiles
- `src/agent/agentCore.js` — the autonomous Observe→Think→Plan→Act loop
- `src/metrics/store.js` — request rate/error rate/distribution + routing log
- `src/ws/broadcaster.js` — 500ms WebSocket telemetry fan-out

### Frontend (`frontend/`)
- `src/three/` — the 3D scene (`NetworkScene`, `CoreOrb`, `ServerNode`, `RequestParticles`)
- `src/pages/` — Dashboard · 3D Live · History · AI Chat · Docs
- `src/components/` — StatCard, ServerCard, AgentPanel, StrategySwitcher, Header
- `src/context/MetricsContext.jsx` — single shared WebSocket stream + rolling history

---

## 🔌 API

| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/lb/state` | Full system snapshot |
| `GET`  | `/lb/history` | Agent decisions + routing feed |
| `POST` | `/lb/strategy` | Switch routing strategy `{ "strategy": "round-robin" }` |
| `POST` | `/lb/chat` | Assistant `{ "message": "..." }` |
| `WS`   | `/metrics` | Live telemetry stream (500ms) |
| `ANY`  | `/api/*` | Load-balanced reverse proxy to a backend |

---

## ⚙️ Configuration

Copy `.env.example` → `.env` in `backend/` (or set env vars). Highlights:

| Var | Default | Meaning |
|-----|---------|---------|
| `LB_PORT` | `3030` | Load balancer port (3000 avoided — often used by Grafana) |
| `LB_STRATEGY` | `ai-adaptive` | Starting routing strategy |
| `SPAWN_BACKENDS` | `true` | Auto-start the 3 demo backends |
| `SIMULATE_TRAFFIC` | `true` | Generate synthetic traffic for the live scene |
| `AGENT_INTERVAL_MS` | `8000` | Agentic decision cadence |
| `TELEMETRY_INTERVAL_MS` | `500` | WebSocket broadcast rate |

To point the dashboard at a different LB, set `VITE_WS_URL` / `VITE_API_URL` for the frontend.

---

## 🎨 The 3D scene

- **Core orb** — pulsing icosahedron “AI brain” that speeds up with request rate; turns red if all backends fail
- **Server nodes** — octahedrons on an orbit, colored green/amber/red by health, scaling with active connections, flickering when their breaker is OPEN
- **Request packets** — glowing trails fly core→node along arced bezier paths, colored by request type (cyan=I/O, magenta=compute, purple=balanced)
- **Controls** — auto-rotate, drag to orbit, scroll to zoom

Built with **Three.js**, **@react-three/fiber**, **drei**, and **Framer Motion**.
