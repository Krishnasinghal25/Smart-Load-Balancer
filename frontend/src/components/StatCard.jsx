import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Animated count-up number.
function useCountUp(value, duration = 600) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const startVal = from.current;
    const target = Number(value) || 0;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(startVal + (target - startVal) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

export default function StatCard({ label, value, suffix = '', sub, color, icon: Icon, decimals = 0, delay = 0 }) {
  const animated = useCountUp(value, 700);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="glass p-5 relative"
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-[11px] uppercase tracking-widest">{label}</span>
        {Icon && (
          <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
            <Icon size={16} style={{ color }} />
          </span>
        )}
      </div>
      <p className="text-3xl font-bold font-display mt-3" style={{ color, textShadow: `0 0 14px ${color}70` }}>
        {animated.toFixed(decimals)}{suffix}
      </p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
      <div className="h-[3px] rounded-full mt-3" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      {/* corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}22, transparent 70%)` }} />
    </motion.div>
  );
}
