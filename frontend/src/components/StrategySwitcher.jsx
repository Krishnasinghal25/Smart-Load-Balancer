import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import { setStrategy } from '../lib/api';

const STRATEGIES = [
  { id: 'ai-adaptive', label: 'AI Adaptive' },
  { id: 'round-robin', label: 'Round Robin' },
  { id: 'least-connections', label: 'Least Conn' },
  { id: 'latency-aware', label: 'Latency' },
  { id: 'weighted', label: 'Weighted' },
];

// Lets the operator hot-swap the routing strategy on the live balancer.
export default function StrategySwitcher({ current }) {
  const [active, setActive] = useState(current || 'ai-adaptive');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (current) setActive(current); }, [current]);

  const choose = async (id) => {
    if (id === active || busy) return;
    setBusy(true);
    setActive(id); // optimistic
    try { const r = await setStrategy(id); if (r?.strategy) setActive(r.strategy); }
    catch { /* keep optimistic; WS will correct */ }
    finally { setBusy(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-4">
      <h3 className="font-display text-white font-bold flex items-center gap-2 mb-3 text-sm">
        <Shuffle size={15} className="text-cyan-400" /> ROUTING STRATEGY
      </h3>
      <div className="flex flex-wrap gap-2">
        {STRATEGIES.map((s) => {
          const on = s.id === active;
          return (
            <button key={s.id} onClick={() => choose(s.id)} disabled={busy}
              className="relative px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                color: on ? '#7df9ff' : '#8ea6c8',
                background: on ? 'rgba(0,240,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${on ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: on ? '0 0 12px rgba(0,240,255,0.25)' : 'none',
              }}>
              {s.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
