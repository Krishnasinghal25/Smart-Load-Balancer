import { motion } from 'framer-motion';
import { useMetrics } from '../context/MetricsContext';
import NetworkScene from '../three/NetworkScene';

const legend = [
  { c: '#00f0ff', label: 'I/O request' },
  { c: '#ff2bd6', label: 'Compute request' },
  { c: '#a855f7', label: 'Balanced request' },
  { c: '#39ff14', label: 'Healthy node' },
  { c: '#ffb800', label: 'Degraded node' },
  { c: '#ff2e63', label: 'Down / breaker open' },
];

export default function ThreeView() {
  const { state } = useMetrics();
  const sys = state?.system || {};

  return (
    <div className="relative" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* 3D canvas fills the viewport */}
      <div className="absolute inset-0">
        <NetworkScene state={state} />
      </div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="absolute top-5 left-5 z-10 pointer-events-none"
      >
        <h1 className="font-display text-2xl font-bold neon-text-cyan">LIVE TOPOLOGY</h1>
        <p className="text-xs text-cyan-300/60 mt-1">Real-time request flow · drag to orbit · scroll to zoom</p>
      </motion.div>

      {/* Live stat HUD */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="absolute top-5 right-5 z-10 glass px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs"
      >
        <HudStat label="Healthy" value={`${sys.healthyServers || 0}/${sys.totalServers || 0}`} color="#39ff14" />
        <HudStat label="Req/s" value={Number(sys.requestRate || 0).toFixed(1)} color="#00f0ff" />
        <HudStat label="Latency" value={`${sys.averageLatency || 0}ms`} color="#a855f7" />
        <HudStat label="Errors" value={`${Number(sys.errorRate || 0).toFixed(1)}%`} color="#ff2bd6" />
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-5 left-5 z-10 glass px-4 py-3"
      >
        <p className="text-[10px] tracking-widest text-slate-400 mb-2">LEGEND</p>
        <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.c, boxShadow: `0 0 8px ${l.c}` }} />
              {l.label}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Strategy chip */}
      <div className="absolute bottom-5 right-5 z-10 glass px-4 py-2 text-xs">
        <span className="text-slate-400">strategy </span>
        <span className="neon-text-cyan font-bold">{state?.strategy || '—'}</span>
      </div>
    </div>
  );
}

function HudStat({ label, value, color }) {
  return (
    <div>
      <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="font-bold font-display" style={{ color, textShadow: `0 0 8px ${color}80` }}>{value}</p>
    </div>
  );
}
