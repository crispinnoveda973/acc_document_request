import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { Icon, Logo } from './ui';

/**
 * ACC Assistant - floating chat widget shown on every page for students and admins (mounted once in Layout, so the
 * conversation survives page changes and is cleared when the user logs out).
 *
 * The answers come from POST /api/chatbot. The reply is plain text that React escapes (no dangerouslySetInnerHTML),
 * and a link is only rendered when the API returns an internal path such as /requests/12 (see safeRoute).
 */
const MAX = 300;   // same limit as Chatbot::MAX_LENGTH in the backend
const STUDENT_START = ['What documents can I request?', 'How do I pay?', 'Track my requests', 'How do I claim my document?'];
const ADMIN_START = ['Request summary', 'Payments to verify', 'How do I verify a payment?', 'Office hours'];

const safeRoute = (to) => (typeof to === 'string' && /^\/[\w\-/]*$/.test(to) ? to : null);

let nextId = 1;
const botMsg = (text, extra = {}) => ({ id: nextId++, from: 'bot', text, links: [], suggestions: [], ...extra });
const myMsg = (text) => ({ id: nextId++, from: 'me', text });

function Typing() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3" aria-label="The assistant is typing">
      {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />)}
    </div>
  );
}

export default function ChatBot() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const start = isAdmin ? ADMIN_START : STUDENT_START;
  const welcome = () => [botMsg(
    `Hi ${String(user.name || '').split(' ')[0] || 'there'}! I'm the ACC Assistant. ` +
    (isAdmin ? 'Ask me for request figures, or send a reference / transaction number and I will look it up.'
      : 'Ask me about documents, fees, payments, claiming, or the status of your requests.'),
    { suggestions: start }
  )];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(welcome);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef(null);
  const input = useRef(null);

  // Keep the newest message in view.
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [messages, busy, open]);
  useEffect(() => { if (open) { const t = setTimeout(() => input.current?.focus(), 60); return () => clearTimeout(t); } }, [open]);

  const send = async (raw) => {
    const q = String(raw ?? text).trim();
    if (!q || busy) return;
    setText('');
    setMessages((m) => [...m, myMsg(q)]);
    setBusy(true);
    try {
      const { data } = await api.post('/chatbot', { message: q });
      const d = data.data;
      setMessages((m) => [...m, botMsg(d.reply, { links: d.links || [], suggestions: d.suggestions || [] })]);
    } catch (e) {
      const msg = e.response?.status === 429 ? 'You are asking too fast. Please wait a few seconds and try again.' : errMsg(e);
      setMessages((m) => [...m, botMsg(msg, { error: true })]);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  };

  const last = messages[messages.length - 1];
  const chips = !busy && last?.from === 'bot' ? (last.suggestions.length ? last.suggestions : start) : [];

  return (
    <>
      {open && (
        <div role="dialog" aria-label="ACC Assistant" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="pop no-print fixed bottom-20 right-4 z-40 flex h-[32rem] max-h-[calc(100dvh-7rem)] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:right-6">
          <div className="flex items-center gap-3 bg-brand-900 px-4 py-3 text-white">
            <Logo size={34} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-sm font-bold">ACC Assistant</div>
              <div className="truncate text-xs text-gold-400">Documents · payments · requests</div>
            </div>
            <button onClick={() => setMessages(welcome())} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" title="Start a new chat" aria-label="Start a new chat"><Icon name="refresh" size={17} /></button>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close chat"><Icon name="x" size={18} /></button>
          </div>

          <div ref={list} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-white px-3.5 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col gap-1.5 ${m.from === 'me' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[88%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.from === 'me' ? 'rounded-br-md bg-brand-700 text-white'
                    : m.error ? 'rounded-bl-md bg-red-50 text-red-700 ring-1 ring-red-200'
                      : 'rounded-bl-md bg-slate-100 text-slate-800'}`}>
                  {m.text}
                </div>
                {m.links?.length > 0 && (
                  <div className="flex max-w-[88%] flex-wrap gap-1.5">
                    {m.links.map((l, i) => safeRoute(l.to) && (
                      <Link key={i} to={safeRoute(l.to)} onClick={() => window.innerWidth < 640 && setOpen(false)}
                        className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100">
                        {l.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <Typing />}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 pb-1 pt-2.5">
              {chips.map((c) => (
                <button key={c} onClick={() => send(c)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 hover:ring-brand-600">
                  {c}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 p-3">
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX} autoComplete="off"
              aria-label="Type your question" placeholder="Type your question…" disabled={busy}
              className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:bg-slate-100" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
              <Icon name="send" size={17} />
            </button>
          </form>
        </div>
      )}

      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close the ACC Assistant' : 'Open the ACC Assistant'}
        className="no-print fixed bottom-4 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-700 text-white shadow-lg ring-2 ring-gold-400 transition hover:bg-brand-800 sm:bottom-6 sm:right-6">
        <Icon name={open ? 'x' : 'chat'} size={26} />
      </button>
    </>
  );
}
