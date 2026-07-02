import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, SlidersHorizontal, Boxes, History, MessageSquare, BookOpen, Zap } from 'lucide-react';
import { useMetrics } from '../context/MetricsContext';

const links = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/control', label: 'Control', icon: SlidersHorizontal },
  { to: '/3d', label: '3D Live', icon: Boxes },
  { to: '/history', label: 'History', icon: History },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/info', label: 'Docs', icon: BookOpen },
];

export default function Header() {
  const { connected, state } = useMetrics();
  const rate = state?.system?.requestRate ?? 0;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'rgba(5,6,13,0.7)', borderBottom: '1px solid rgba(0,240,255,0.14)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <motion.div
            className="w-9 h-9 rounded-lg grid place-items-center"
            style={{ background: 'linear-gradient(135deg, #00f0ff, #a855f7)', boxShadow: '0 0 18px rgba(0,240,255,0.5)' }}
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Zap size={18} className="text-black" />
          </motion.div>
          <div className="leading-none">
            <p className="font-display text-lg font-bold neon-text-cyan">NEON<span className="neon-text-magenta">·LB</span></p>
            <p className="text-[10px] text-cyan-300/50 tracking-widest">AI LOAD BALANCER</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {({ isActive }) => (
                <div className={`relative px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${isActive ? 'text-cyan-200' : 'text-slate-400 hover:text-cyan-300'}`}>
                  <Icon size={15} />
                  {label}
                  {isActive && (
                    <motion.div layoutId="nav-active" className="absolute inset-0 rounded-lg -z-10"
                      style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)', boxShadow: '0 0 14px rgba(0,240,255,0.25)' }} />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Live status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span className="neon-text-cyan font-bold">{Number(rate).toFixed(1)}</span> req/s
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-sm">
            <span className="relative flex h-2 w-2">
              {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: '#39ff14' }} />}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: connected ? '#39ff14' : '#ff2e63' }} />
            </span>
            <span className={`text-xs ${connected ? 'neon-text-lime' : 'text-red-400'}`}>{connected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center justify-around px-2 pb-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${isActive ? 'neon-text-cyan' : 'text-slate-500'}`}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
