import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Server, Activity, AlertTriangle, Gauge } from 'lucide-react';

function scoreColor(score, healthy) {
  if (!healthy) return '#ff2e63';
  if (score > 75) return '#39ff14';
  if (score > 45) return '#ffb800';
  return '#ff2e63';
}

export default function ServerCard({ server, delay = 0 }) {
  const color = scoreColor(server.healthScore, server.healthy);
  const spark = (server.latencyHistory || []).map((v, i) => ({ i, v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -4 }}
      className="glass p-5 space-y-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
            <Server size={16} style={{ color }} />
          </span>
          <div>
            <p className="font-mono text-sm font-bold text-white">{server.id}</p>
            <p className="text-[11px] text-slate-500">{server.host}:{server.port}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="tag" style={{ borderColor: `${color}55`, color, background: `${color}12` }}>
            {server.healthy ? '● online' : '○ down'}
          </span>
          <span className={`cb-${server.circuit} text-[11px] font-mono`}>{server.circuit}</span>
        </div>
      </div>

      {/* Health bar */}
      <div>
        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
          <span className="flex items-center gap-1"><Gauge size={11} /> Health</span>
          <span style={{ color }}>{server.healthScore}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full" animate={{ width: `${server.healthScore}%` }} transition={{ duration: 0.6 }}
            style={{ background: `linear-gradient(90deg, ${color}, ${color}66)`, boxShadow: `0 0 10px ${color}` }} />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Latency', value: `${server.latency}ms`, icon: Activity, c: '#00f0ff' },
          { label: 'p95', value: `${server.p95}ms`, icon: Gauge, c: '#a855f7' },
          { label: 'Err', value: `${server.errorRate}%`, icon: AlertTriangle, c: server.errorRate > 5 ? '#ff2e63' : '#39ff14' },
          { label: 'Conns', value: server.activeConnections, icon: Server, c: '#ffb800' },
        ].map((m) => (
          <div key={m.label} className="glass-sm py-2">
            <p className="text-[10px] text-slate-500">{m.label}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: m.c }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Weight + CPU */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>weight <b className="text-cyan-300">{server.weight?.toFixed?.(2) ?? server.weight}</b></span>
        <span>cpu <b style={{ color: server.cpu > 75 ? '#ff2e63' : '#39ff14' }}>{server.cpu}%</b></span>
        <span>mem <b className="text-purple-300">{server.mem}%</b></span>
      </div>

      {/* Latency sparkline */}
      {spark.length > 1 && (
        <ResponsiveContainer width="100%" height={36}>
          <AreaChart data={spark}>
            <defs>
              <linearGradient id={`sg-${server.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${server.id})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
