import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, BrainCircuit, RefreshCw } from 'lucide-react';
import { getHistory } from '../lib/api';
import { useMetrics } from '../context/MetricsContext';

const typeColor = { compute: '#ff2bd6', io: '#00f0ff', balanced: '#a855f7' };

export default function HistoryPage() {
  const { state } = useMetrics();
  const [data, setData] = useState({ decisions: [], routing: [] });
  const [tab, setTab] = useState('decisions');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await getHistory()); } catch { /* backend offline */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  // Refresh whenever the agent completes a new tick.
  useEffect(() => { if (state?.agent?.tick) load(); }, [state?.agent?.tick]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold neon-text-cyan flex items-center gap-2">
          <History size={22} /> DECISION LOG
        </h1>
        <button onClick={load} className="glass-sm px-3 py-1.5 text-xs neon-text-cyan flex items-center gap-1.5 hover:opacity-80">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[['decisions', 'Agent Decisions'], ['routing', 'Routing Feed']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="px-4 py-2 rounded-lg text-xs transition-colors"
            style={{
              color: tab === id ? '#7df9ff' : '#8ea6c8',
              background: tab === id ? 'rgba(0,240,255,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tab === id ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'decisions' ? (
          <motion.div key="dec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {data.decisions.length === 0 && <Empty label="No agent decisions yet — the core runs every few seconds." />}
            {data.decisions.map((d, i) => (
              <motion.div key={d.id || i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="glass p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm neon-text-purple font-bold">
                    <BrainCircuit size={15} /> tick {d.tick}
                  </span>
                  <span className="text-[11px] text-slate-500">{new Date(d.time).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{d.reasoning}</p>
                {d.actions?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.actions.map((a, j) => (
                      <span key={j} className="tag" style={{ borderColor: '#00f0ff44', color: '#7df9ff', background: '#00f0ff10' }}>{a.summary}</span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-4 text-[11px] text-slate-500">
                  <span>{d.observation?.healthy}/{d.observation?.total} healthy</span>
                  <span>avg {d.observation?.avgLatency}ms</span>
                  <span>score {d.observation?.avgScore}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="rt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5">
              <span className="col-span-1">✓</span><span className="col-span-2">server</span><span className="col-span-1">type</span>
              <span className="col-span-4">path</span><span className="col-span-2">strategy</span><span className="col-span-2 text-right">latency</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
              {data.routing.length === 0 && <Empty label="No routed requests yet." />}
              {data.routing.map((r, i) => (
                <div key={r.id || i} className="grid grid-cols-12 px-4 py-2 text-xs items-center hover:bg-white/[0.03]">
                  <span className="col-span-1">{r.ok ? '🟢' : '🔴'}</span>
                  <span className="col-span-2 font-mono text-emerald-300">{r.serverId}</span>
                  <span className="col-span-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: typeColor[r.type] || '#888' }} /></span>
                  <span className="col-span-4 text-slate-300 truncate"><b className="text-cyan-400">{r.method}</b> {r.path}</span>
                  <span className="col-span-2 text-slate-500">{r.strategy}</span>
                  <span className="col-span-2 text-right font-mono text-purple-300">{r.latency}ms</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Empty({ label }) {
  return <div className="glass p-8 text-center text-sm text-slate-500">{label}</div>;
}
