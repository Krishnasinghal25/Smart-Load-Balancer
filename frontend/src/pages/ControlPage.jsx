import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Server, Plus, Trash2, ZapOff, HeartPulse, Power, CheckCircle2, XCircle, Play, Square,
  Boxes, Zap, Timer, Gauge, User, Cpu, Search, CreditCard, Sun, TrendingUp, AlertTriangle,
  ShieldCheck, ChevronDown, Info, Snail, Rocket,
} from 'lucide-react';
import { useMetrics } from '../context/MetricsContext';
import StatCard from '../components/StatCard';
import NetworkScene from '../three/NetworkScene';
import { sendRequests, setTraffic, addBackend, removeBackend, injectFault } from '../lib/api';

// Step 1 choices — plain words, an icon, and a one-line explanation.
const REQUEST_KINDS = [
  { label: 'A user visits', desc: 'Someone opens a page', icon: User,       path: '/api/users/profile',  method: 'GET',  color: '#a855f7' },
  { label: 'A heavy job',   desc: 'A big calculation',    icon: Cpu,        path: '/api/compute/render', method: 'POST', color: '#ff2bd6' },
  { label: 'A search',      desc: 'Someone searches',     icon: Search,     path: '/api/search',         method: 'GET',  color: '#39ff14' },
  { label: 'A checkout',    desc: 'A payment goes through', icon: CreditCard, path: '/api/checkout',      method: 'POST', color: '#00f0ff' },
];

// Step 2 amounts — friendly words instead of raw numbers.
const AMOUNTS = [
  { label: 'A little', n: 5 },
  { label: 'A lot', n: 20 },
  { label: 'A flood', n: 50 },
];

// One-click stories the app runs for you.
const SCENARIOS = [
  { name: 'Normal day',      icon: Sun,           color: '#39ff14', hint: 'Steady, calm traffic — a healthy system.' },
  { name: 'Traffic spike',   icon: TrendingUp,    color: '#ffb800', hint: 'Traffic ramps up fast, like a sale going viral.' },
  { name: 'A server crashes', icon: AlertTriangle, color: '#ff2e63', hint: 'One server dies — watch traffic avoid it, then heal.' },
  { name: 'Calm everything',  icon: ShieldCheck,   color: '#00f0ff', hint: 'Fix all servers and settle back to normal.' },
];

function plainStatus(s) {
  if (!s.healthy || s.circuit === 'OPEN') return { text: 'Down', color: '#ff2e63' };
  if (s.circuit === 'HALF_OPEN' || s.healthScore < 55) return { text: 'Struggling', color: '#ffb800' };
  return { text: 'Healthy', color: '#39ff14' };
}

function HealthRing({ score, color }) {
  const R = 18, C = 2 * Math.PI * R;
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0">
      <circle cx="23" cy="23" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <motion.circle cx="23" cy="23" r={R} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        transform="rotate(-90 23 23)" strokeDasharray={C}
        animate={{ strokeDashoffset: C - (C * Math.max(0, Math.min(100, score))) / 100 }}
        transition={{ type: 'spring', stiffness: 60, damping: 15 }} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <text x="23" y="27" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">{Math.round(score)}</text>
    </svg>
  );
}

// A small numbered "STEP n" badge for the guided flow.
function StepBadge({ n }) {
  return (
    <span className="w-7 h-7 rounded-full grid place-items-center text-sm font-bold font-display shrink-0"
      style={{ background: 'linear-gradient(135deg,#00f0ff,#a855f7)', color: '#04060d', boxShadow: '0 0 12px rgba(0,240,255,0.5)' }}>
      {n}
    </span>
  );
}

export default function ControlPage() {
  const { state, connected } = useMetrics();
  const servers = state?.servers || [];
  const sys = state?.system || {};
  const trafficOn = state?.simulateTraffic ?? false;

  const [kind, setKind] = useState(REQUEST_KINDS[0]);
  const [amount, setAmount] = useState(AMOUNTS[1]);
  const [results, setResults] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState('');
  const [pulse, setPulse] = useState(0);
  const [sending, setSending] = useState(false);
  const [scenario, setScenario] = useState(null); // { name, step }
  const [advanced, setAdvanced] = useState(false);
  const scenarioRef = useRef({ stop: false });

  const flash = (msg) => { setNote(msg); window.clearTimeout(flash._t); flash._t = window.setTimeout(() => setNote(''), 3000); };

  const fire = async (n, kOverride) => {
    const k = kOverride || kind;
    try {
      const r = await sendRequests({ path: k.path, method: k.method, count: n });
      setPulse((p) => p + 1);
      setResults((prev) => [...(r.results || []).map((x, i) => ({ ...x, _k: `${Date.now()}-${i}-${Math.round(x.latency)}` })), ...prev].slice(0, 16));
    } catch { flash('Could not reach the load balancer. Is it running?'); }
  };

  const sendNow = async () => { if (sending || scenario) return; setSending(true); await fire(amount.n); setSending(false); };

  // ── One-click scenarios ────────────────────────────────────────────────────
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const randomKind = () => REQUEST_KINDS[Math.floor(Math.random() * REQUEST_KINDS.length)];

  const runScenario = async (name) => {
    if (scenario) return;
    scenarioRef.current.stop = false;
    const stopped = () => scenarioRef.current.stop;
    const step = (s) => setScenario({ name, step: s });
    step('starting…');
    try {
      if (name === 'Normal day') {
        for (let i = 0; i < 10 && !stopped(); i++) { step(`calm traffic flowing… (${i + 1}/10)`); await fire(4, randomKind()); await wait(700); }
      } else if (name === 'Traffic spike') {
        const ramp = [3, 5, 9, 15, 24, 34, 44, 30, 16, 7];
        for (let i = 0; i < ramp.length && !stopped(); i++) { step(`traffic surging… ${ramp[i]} at once`); await fire(ramp[i], randomKind()); await wait(600); }
      } else if (name === 'A server crashes') {
        const victim = servers[0]?.id;
        if (victim && !stopped()) { step(`💥 ${victim} just crashed!`); await injectFault(victim, 'fail'); await wait(800); }
        for (let i = 0; i < 12 && !stopped(); i++) { step(`traffic reroutes around ${victim}…`); await fire(8, randomKind()); await wait(600); }
        if (victim && !stopped()) { step(`🩹 healing ${victim}…`); await injectFault(victim, 'recover'); }
        step('back to healthy ✓'); await wait(1400);
      } else if (name === 'Calm everything') {
        step('fixing every server…');
        for (const s of servers) { if (stopped()) break; await injectFault(s.id, 'recover'); }
        try { await setTraffic(false); } catch { /* ignore */ }
        step('all calm ✓'); await wait(1200);
      }
    } catch { /* scenario aborted */ }
    setScenario(null);
  };
  const stopScenario = () => { scenarioRef.current.stop = true; };

  const toggleTraffic = async () => { try { await setTraffic(!trafficOn); } catch { flash('Could not change automatic traffic.'); } };
  const doAdd = async () => { try { const r = await addBackend(); flash(r.ok ? `Added server ${r.server.id}` : 'Could not add a server.'); } catch { flash('Could not add a server.'); } };
  const doFault = async (id, mode) => { setBusyId(id); try { await injectFault(id, mode); flash(`${id} → ${mode === 'fail' ? 'broken' : mode === 'slow' ? 'slowed' : 'fixed'}`); } catch { flash(`Could not update ${id}.`); } finally { setBusyId(null); } };
  const doRemove = async (id) => { setBusyId(id); try { await removeBackend(id); flash(`Removed ${id}`); } catch { flash(`Could not remove ${id}.`); } finally { setBusyId(null); } };

  const busy = sending || !!scenario;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold neon-text-cyan flex items-center gap-2">
          <Rocket size={22} /> CONTROL CENTER
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Follow the 3 steps below — or press one <b className="text-cyan-300">demo button</b> and just watch. That's it.
        </p>
      </motion.div>

      {!connected && (
        <div className="glass p-3 text-sm text-amber-300" style={{ borderColor: 'rgba(255,184,0,0.35)' }}>
          ⚠ Not connected to the load balancer yet. Start it, then this page comes alive.
        </div>
      )}

      <AnimatePresence>
        {note && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass px-4 py-2.5 text-sm text-cyan-100" style={{ borderColor: 'rgba(0,240,255,0.3)' }}>{note}</motion.div>
        )}
      </AnimatePresence>

      {/* ── ONE-CLICK DEMOS ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
        <div className="flex items-center gap-2 mb-1">
          <Play size={16} className="text-lime-400" />
          <h3 className="font-display text-white font-bold">Easiest way — press one button</h3>
        </div>
        <p className="text-[12px] text-slate-400 mb-4">Each button runs a whole realistic story on its own. Watch it play out in the 3D view below.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SCENARIOS.map((sc) => {
            const active = scenario?.name === sc.name;
            const Icon = sc.icon;
            return (
              <button key={sc.name} title={sc.hint} onClick={() => runScenario(sc.name)} disabled={busy && !active}
                className="text-left p-3 rounded-xl transition-all disabled:opacity-40"
                style={{ background: active ? `${sc.color}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? sc.color : 'rgba(255,255,255,0.09)'}`, boxShadow: active ? `0 0 18px ${sc.color}55` : 'none' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={17} style={{ color: sc.color }} />
                  <span className="text-sm font-bold text-white">{sc.name}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{sc.hint}</p>
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {scenario && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-center gap-3 glass-sm px-4 py-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-sm text-cyan-100 flex-1"><b>{scenario.name}:</b> {scenario.step}</span>
              <button onClick={stopScenario} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'rgba(255,46,99,0.15)', border: '1px solid rgba(255,46,99,0.4)', color: '#ff8aa5' }}>
                <Square size={12} /> Stop
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Live stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Healthy Servers" value={sys.healthyServers || 0} sub={`of ${sys.totalServers || 0} total`} color="#39ff14" icon={Server} delay={0} />
        <StatCard label="Requests / sec" value={sys.requestRate || 0} decimals={1} sub="right now" color="#00f0ff" icon={Zap} delay={0.06} />
        <StatCard label="Avg Speed" value={sys.averageLatency || 0} suffix="ms" sub="lower is better" color="#a855f7" icon={Timer} delay={0.12} />
        <StatCard label="Total Handled" value={sys.totalRouted || 0} sub="since start" color="#ff2bd6" icon={Gauge} delay={0.18} />
      </div>

      {/* ── GUIDED 1-2-3 + 3D ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Steps 1 & 2 */}
        <div className="space-y-4">
          {/* STEP 1 */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <StepBadge n={1} />
              <div>
                <h3 className="font-display text-white font-bold text-sm">Pick what to send</h3>
                <p className="text-[11px] text-slate-400">What kind of visitor is this?</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REQUEST_KINDS.map((k) => {
                const on = k.label === kind.label;
                const Icon = k.icon;
                return (
                  <button key={k.label} onClick={() => setKind(k)} title={k.desc}
                    className="text-left p-2.5 rounded-xl transition-all"
                    style={{ background: on ? `${k.color}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? k.color : 'rgba(255,255,255,0.09)'}`, boxShadow: on ? `0 0 14px ${k.color}55` : 'none' }}>
                    <Icon size={18} style={{ color: k.color }} />
                    <p className="text-[13px] font-semibold text-white mt-1">{k.label}</p>
                    <p className="text-[10px] text-slate-400">{k.desc}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* STEP 2 */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <StepBadge n={2} />
              <div>
                <h3 className="font-display text-white font-bold text-sm">How much & send</h3>
                <p className="text-[11px] text-slate-400">Choose an amount, then press the big button.</p>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              {AMOUNTS.map((a) => {
                const on = a.n === amount.n;
                return (
                  <button key={a.label} onClick={() => setAmount(a)} title={`${a.n} requests at once`}
                    className="flex-1 py-2 rounded-lg text-xs transition-colors"
                    style={{ background: on ? 'rgba(0,240,255,0.14)' : 'rgba(255,255,255,0.03)', color: on ? '#7df9ff' : '#8ea6c8', border: `1px solid ${on ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                    {a.label}<br /><span className="text-[10px] opacity-60">{a.n}</span>
                  </button>
                );
              })}
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={sendNow} disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${kind.color}, #a855f7)`, color: '#04060d', boxShadow: `0 0 22px ${kind.color}66` }}>
              <Send size={18} /> {sending ? 'Sending…' : `Send ${amount.n} now`}
            </motion.button>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <Info size={12} /> The load balancer picks the best server for each one.
            </p>
          </motion.div>
        </div>

        {/* STEP 3 — the 3D view */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass xl:col-span-2 relative overflow-hidden" style={{ minHeight: 460 }}>
          <div className="absolute inset-0"><NetworkScene state={state} /></div>
          <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2.5">
            <StepBadge n={3} />
            <div>
              <h3 className="font-display font-bold neon-text-cyan flex items-center gap-2"><Boxes size={16} /> WATCH IT HAPPEN</h3>
              <p className="text-[11px] text-cyan-300/50">glowing dots = your requests · drag to spin · scroll to zoom</p>
            </div>
          </div>
          <AnimatePresence>
            <motion.div key={pulse} initial={{ scale: 0.2, opacity: 0.7 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.9 }}
              className="absolute left-1/2 top-1/2 w-28 h-28 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{ border: `2px solid ${kind.color}`, boxShadow: `0 0 40px ${kind.color}` }} />
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── SERVERS (simple) ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Server size={16} className="text-cyan-300" />
          <h3 className="font-display text-white font-bold">Your servers</h3>
          <button onClick={doAdd} title="Start one more server to share the work"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.4)', color: '#7df9ff' }}>
            <Plus size={14} /> Add a server
          </button>
        </div>
        <p className="text-[12px] text-slate-400 mb-4">These machines share the work. Break one on purpose and watch traffic route around it.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {servers.map((s) => {
              const st = plainStatus(s);
              const rowBusy = busyId === s.id;
              return (
                <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  className="glass-sm p-3">
                  <div className="flex items-center gap-3">
                    <HealthRing score={s.healthScore} color={st.color} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-semibold truncate">{s.id}</p>
                      <p className="text-[11px]" style={{ color: st.color }}>{st.text} · {s.latency}ms</p>
                      <p className="text-[10px] text-slate-500">{s.activeConnections} active now</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2.5">
                    <button onClick={() => doFault(s.id, 'fail')} disabled={rowBusy} title="Make this server crash" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] disabled:opacity-40" style={{ background: 'rgba(255,46,99,0.1)', border: '1px solid rgba(255,46,99,0.35)', color: '#ff8aa5' }}><ZapOff size={12} /> Break</button>
                    <button onClick={() => doFault(s.id, 'slow')} disabled={rowBusy} title="Make this server slow" className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] disabled:opacity-40" style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.35)', color: '#ffd27a' }}><Snail size={12} /></button>
                    <button onClick={() => doFault(s.id, 'recover')} disabled={rowBusy} title="Fix this server" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] disabled:opacity-40" style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.35)', color: '#8effa0' }}><HeartPulse size={12} /> Fix</button>
                    <button onClick={() => doRemove(s.id)} disabled={rowBusy} title="Remove this server" className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] disabled:opacity-40" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#c5d3e8' }}><Trash2 size={12} /></button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── ADVANCED (tucked away) ──────────────────────────────────────────── */}
      <div className="glass overflow-hidden">
        <button onClick={() => setAdvanced((v) => !v)} className="w-full flex items-center gap-2 px-5 py-3.5 text-sm text-slate-300">
          <ChevronDown size={16} className={`transition-transform ${advanced ? 'rotate-180' : ''}`} />
          Advanced controls & recent activity
          <span className="ml-auto text-[11px] text-slate-500">optional</span>
        </button>
        <AnimatePresence>
          {advanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* recent activity */}
              <div>
                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5"><CheckCircle2 size={13} className="text-lime-400" /> Recent requests</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {results.length === 0 && <p className="text-sm text-slate-500">Nothing yet — send some traffic.</p>}
                  <AnimatePresence initial={false}>
                    {results.map((r) => (
                      <motion.div key={r._k} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-xs glass-sm px-2.5 py-1.5">
                        {r.ok ? <CheckCircle2 size={13} className="text-lime-400 shrink-0" /> : <XCircle size={13} className="text-red-400 shrink-0" />}
                        {r.serverId
                          ? <span className="text-slate-300"><span className="font-semibold" style={{ color: r.ok ? '#7df9ff' : '#ff8aa5' }}>{r.serverId}</span> · {r.latency}ms {r.ok ? '' : '· failed'}</span>
                          : <span className="text-red-300">no healthy server available</span>}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
              {/* auto traffic + tip */}
              <div>
                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5"><Power size={13} /> Automatic demo traffic</p>
                <button onClick={toggleTraffic} title="Let the app send fake traffic on its own"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm w-full"
                  style={{ background: trafficOn ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${trafficOn ? 'rgba(57,255,20,0.4)' : 'rgba(255,255,255,0.1)'}`, color: trafficOn ? '#8effa0' : '#8ea6c8' }}>
                  <span className="relative flex h-4 w-9 items-center rounded-full" style={{ background: trafficOn ? 'rgba(57,255,20,0.4)' : 'rgba(255,255,255,0.15)' }}>
                    <motion.span layout className="h-3.5 w-3.5 rounded-full bg-white" style={{ marginLeft: trafficOn ? 20 : 3 }} />
                  </span>
                  It's currently <b>{trafficOn ? 'ON' : 'OFF'}</b>
                </button>
                <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                  Leave this OFF to stay in full control — the dashboard then reacts only to what you send.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
