import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BrainCircuit, ArrowRight } from 'lucide-react';

const cbColor = { CLOSED: '#39ff14', OPEN: '#ff2e63', HALF_OPEN: '#ffb800' };

// Shows the agentic core's live weights, breaker states and latest reasoning.
export default function AgentPanel({ agent }) {
  if (!agent) return null;
  const weights = agent.weights || {};
  const breakers = agent.circuitBreakers || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-white font-bold flex items-center gap-2">
          <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
            <BrainCircuit size={18} className="text-purple-400" />
          </motion.span>
          AGENTIC CORE
          <span className="tag" style={{ borderColor: '#a855f755', color: '#c99dff', background: '#a855f712' }}>
            {agent.mode} · tick {agent.tick}
          </span>
        </h2>
        <Link to="/history" className="text-xs neon-text-cyan hover:opacity-80 flex items-center gap-1">
          decisions <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(weights).map(([id, w]) => {
          const cb = breakers[id]?.state || 'CLOSED';
          const pct = Math.min(100, Math.round((w / 3) * 100));
          const color = cbColor[cb];
          return (
            <div key={id} className="glass-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300">{id}</span>
                <span className={`cb-${cb} text-[10px] font-mono`}>{cb}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>weight</span><span className="text-white font-bold">{Number(w).toFixed(2)}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                  style={{ background: `linear-gradient(90deg, ${color}, ${color}66)`, boxShadow: `0 0 8px ${color}` }} />
              </div>
            </div>
          );
        })}
      </div>

      {agent.latestDecision?.reasoning && (
        <motion.div key={agent.latestDecision.time} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-xl text-xs text-slate-300 glass-sm">
          <span className="neon-text-purple font-semibold">▸ reasoning: </span>
          {agent.latestDecision.reasoning}
          {agent.latestDecision.actions?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {agent.latestDecision.actions.map((a, i) => (
                <span key={i} className="tag" style={{ borderColor: '#00f0ff44', color: '#7df9ff', background: '#00f0ff10' }}>
                  {a.summary}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
