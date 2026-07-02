import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Server, Zap, Timer, Flame, Boxes, ArrowRight } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useMetrics } from '../context/MetricsContext';
import StatCard from '../components/StatCard';
import ServerCard from '../components/ServerCard';
import AgentPanel from '../components/AgentPanel';
import StrategySwitcher from '../components/StrategySwitcher';
import NetworkScene from '../three/NetworkScene';

const tooltipStyle = { background: '#0a0e1a', border: '1px solid rgba(0,240,255,0.25)', borderRadius: 10, fontSize: 12 };
const BAR_COLORS = ['#00f0ff', '#a855f7', '#ff2bd6', '#39ff14', '#ffb800'];

export default function Dashboard() {
  const { state, connected, latencyHistory } = useMetrics();
  const sys = state?.system || {};
  const servers = state?.servers || [];
  const routing = state?.routing || {};
  const dist = Object.entries(routing.distribution || {}).map(([server, count]) => ({ server, count }));

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
      <AnimatePresence>
        {!connected && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass p-3 text-sm text-amber-300 flex items-center gap-2" style={{ borderColor: 'rgba(255,184,0,0.35)' }}>
            ⚠ telemetry link down — retrying… <span className="text-slate-500 text-xs">(is the backend running on :3030?)</span>
          </motion.div>
        )}
        {connected && (sys.totalRouted || 0) === 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass p-3.5 text-sm flex items-center gap-2 flex-wrap" style={{ borderColor: 'rgba(0,240,255,0.35)' }}>
            <span className="text-cyan-100">🎛️ Everything is quiet because <b>you</b> control the traffic.</span>
            <Link to="/control" className="ml-auto glass-sm px-3 py-1.5 text-xs neon-text-cyan flex items-center gap-1 hover:opacity-80">
              Open the Command Center <ArrowRight size={12} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Servers" value={sys.totalServers || 0} sub={`${sys.healthyServers || 0} healthy`} color="#00f0ff" icon={Server} delay={0} />
        <StatCard label="Req / sec" value={sys.requestRate || 0} decimals={1} sub="last 60s" color="#39ff14" icon={Zap} delay={0.07} />
        <StatCard label="Avg Latency" value={sys.averageLatency || 0} suffix="ms" sub="healthy nodes" color="#a855f7" icon={Timer} delay={0.14} />
        <StatCard label="Error Rate" value={sys.errorRate || 0} decimals={2} suffix="%" sub="last 60s" color="#ff2bd6" icon={Flame} delay={0.21} />
      </div>

      {/* 3D preview + agent */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass xl:col-span-2 relative overflow-hidden" style={{ minHeight: 340 }}>
          <div className="absolute inset-0"><NetworkScene state={state} /></div>
          <div className="absolute top-4 left-4 pointer-events-none">
            <h3 className="font-display font-bold neon-text-cyan flex items-center gap-2"><Boxes size={16} /> LIVE TOPOLOGY</h3>
            <p className="text-[11px] text-cyan-300/50">request packets streaming in real time</p>
          </div>
          <Link to="/3d" className="absolute bottom-4 right-4 glass-sm px-3 py-1.5 text-xs neon-text-cyan flex items-center gap-1 hover:opacity-80">
            fullscreen <ArrowRight size={12} />
          </Link>
        </motion.div>

        <div className="space-y-4">
          <StrategySwitcher current={state?.strategy} />
          <AgentPanel agent={state?.agent} />
        </div>
      </div>

      {/* Servers */}
      <div>
        <h2 className="font-display text-white font-bold mb-3 flex items-center gap-2"><Server size={16} className="text-cyan-400" /> BACKEND POOL</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {servers.map((s, i) => <ServerCard key={s.id} server={s} delay={i * 0.08} />)}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
          <h3 className="font-display text-white font-bold mb-4">SYSTEM LATENCY</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={latencyHistory}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="t" tick={{ fill: '#5b6b85', fontSize: 10 }} />
              <YAxis tick={{ fill: '#5b6b85', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="latency" stroke="#00f0ff" strokeWidth={2} fill="url(#latGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
          <h3 className="font-display text-white font-bold mb-4">REQUEST DISTRIBUTION</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dist}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="server" tick={{ fill: '#5b6b85', fontSize: 10 }} />
              <YAxis tick={{ fill: '#5b6b85', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {dist.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { to: '/control', emoji: '🎛️', title: 'Control Console', desc: 'Send traffic & manage servers yourself' },
          { to: '/3d', emoji: '🌐', title: '3D Live View', desc: 'Immersive request topology' },
          { to: '/chat', emoji: '🤖', title: 'AI Assistant', desc: 'Ask about your load balancer' },
        ].map((l) => (
          <Link key={l.to} to={l.to}>
            <motion.div whileHover={{ scale: 1.02, y: -3 }} className="glass p-4 flex items-center gap-3 cursor-pointer">
              <span className="text-2xl">{l.emoji}</span>
              <div>
                <p className="text-sm font-bold text-white">{l.title}</p>
                <p className="text-[11px] text-slate-500">{l.desc}</p>
              </div>
              <ArrowRight size={15} className="ml-auto text-cyan-400" />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
