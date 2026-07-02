import { motion } from 'framer-motion';
import { Cpu, GitBranch, HeartPulse, BrainCircuit, Radio, Boxes } from 'lucide-react';

const features = [
  { icon: GitBranch, color: '#00f0ff', title: '5 Routing Strategies', desc: 'AI-adaptive, round-robin, least-connections, latency-aware and weighted — hot-swappable at runtime.' },
  { icon: HeartPulse, color: '#39ff14', title: 'Health Monitoring', desc: 'Every backend is probed continuously. p50/p95/p99 latency, error rate and a 0–100 composite health score.' },
  { icon: BrainCircuit, color: '#a855f7', title: 'Agentic Core', desc: 'An Observe → Think → Plan → Act loop rebalances weights and trips/heals circuit breakers, logging its reasoning.' },
  { icon: Radio, color: '#ff2bd6', title: 'Live Telemetry', desc: 'Full system state streamed over WebSocket every 500ms — the dashboard never polls.' },
  { icon: Boxes, color: '#ffb800', title: '3D Visualization', desc: 'A React-Three-Fiber scene renders request packets flowing from the core to health-colored server nodes.' },
  { icon: Cpu, color: '#2b6bff', title: 'Circuit Breakers', desc: 'CLOSED → OPEN → HALF_OPEN protection isolates failing backends and probes for recovery automatically.' },
];

const flow = [
  'Request hits the load balancer on :3000',
  'Classifier tags it (compute / io / balanced)',
  'Router picks a backend via the active strategy + agent weights',
  'Proxy forwards it; latency & result are recorded',
  'Metrics broadcast to the dashboard over WebSocket',
  'Agentic core periodically rebalances weights & breakers',
];

export default function InfoPage() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold neon-text-cyan">SYSTEM ARCHITECTURE</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          A production-style AI load balancer: intelligent request routing, continuous health scoring, an autonomous
          agentic control loop and a real-time neon 3D dashboard.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }} className="glass p-5">
            <span className="w-10 h-10 rounded-xl grid place-items-center mb-3" style={{ background: `${f.color}18`, border: `1px solid ${f.color}40` }}>
              <f.icon size={20} style={{ color: f.color }} />
            </span>
            <h3 className="font-bold text-white mb-1">{f.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6">
        <h2 className="font-display text-white font-bold mb-4">REQUEST LIFECYCLE</h2>
        <div className="space-y-3">
          {flow.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(0,240,255,0.12)', border: '1px solid rgba(0,240,255,0.4)', color: '#7df9ff' }}>{i + 1}</span>
              <span className="text-sm text-slate-300">{step}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-5">
          <h3 className="font-display text-white font-bold mb-3">STACK</h3>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li><b className="text-cyan-300">Backend</b> — Node.js, Express, http-proxy-middleware, ws</li>
            <li><b className="text-cyan-300">Frontend</b> — React, Vite, Tailwind CSS</li>
            <li><b className="text-cyan-300">3D</b> — Three.js, @react-three/fiber, drei</li>
            <li><b className="text-cyan-300">Animation</b> — Framer Motion</li>
            <li><b className="text-cyan-300">Charts</b> — Recharts</li>
          </ul>
        </div>
        <div className="glass p-5">
          <h3 className="font-display text-white font-bold mb-3">ENDPOINTS</h3>
          <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
            <li><span className="neon-text-lime">GET</span> /lb/state — full system snapshot</li>
            <li><span className="neon-text-lime">GET</span> /lb/history — decisions + routing feed</li>
            <li><span className="neon-text-magenta">POST</span> /lb/strategy — switch strategy</li>
            <li><span className="neon-text-magenta">POST</span> /lb/chat — assistant</li>
            <li><span className="neon-text-cyan">WS</span> /metrics — live telemetry</li>
            <li><span className="neon-text-lime">ANY</span> /api/* — load-balanced proxy</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
