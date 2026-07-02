import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { askAssistant } from '../lib/api';

const SUGGESTIONS = [
  'Are all my servers healthy?',
  'What does a load balancer do?',
  'Is anything slow right now?',
  'Which server is busiest?',
  'What should I do if a server fails?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I\'m your assistant, running on your own computer through Ollama. Ask me anything about your servers in plain English — like "is everything okay?" — and I\'ll explain it simply.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const { answer } = await askAssistant(q);
      setMessages((m) => [...m, { role: 'bot', text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: '⚠ Could not reach the load balancer API (is the backend on :3000?).' }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
      <h1 className="font-display text-2xl font-bold neon-text-cyan flex items-center gap-2 mb-1">
        <Sparkles size={22} /> AI ASSISTANT
      </h1>
      <p className="text-[11px] text-cyan-300/50 mb-4">Answers come from a local AI (Ollama) on your computer — private, no internet needed.</p>

      <div className="glass flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
              style={{ background: m.role === 'user' ? 'rgba(168,85,247,0.15)' : 'rgba(0,240,255,0.12)', border: `1px solid ${m.role === 'user' ? 'rgba(168,85,247,0.4)' : 'rgba(0,240,255,0.35)'}` }}>
              {m.role === 'user' ? <User size={15} className="text-purple-300" /> : <Bot size={15} className="text-cyan-300" />}
            </div>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'text-purple-100' : 'text-slate-200'}`}
              style={{ background: m.role === 'user' ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: 'rgba(0,240,255,0.12)', border: '1px solid rgba(0,240,255,0.35)' }}>
              <Bot size={15} className="text-cyan-300" />
            </div>
            <div className="flex items-center gap-1 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="tag hover:opacity-80"
            style={{ borderColor: 'rgba(0,240,255,0.25)', color: '#7df9ff', background: 'rgba(0,240,255,0.06)' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about your load balancer…"
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none glass-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50"
        />
        <button onClick={() => send()} disabled={busy}
          className="px-4 rounded-xl grid place-items-center"
          style={{ background: 'linear-gradient(135deg, #00f0ff, #a855f7)', boxShadow: '0 0 16px rgba(0,240,255,0.4)' }}>
          <Send size={18} className="text-black" />
        </button>
      </div>
    </div>
  );
}
