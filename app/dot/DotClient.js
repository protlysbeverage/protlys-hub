'use client';

import { useEffect, useRef, useState } from 'react';

const STARTERS = [
  'How am I doing this week?',
  'What should I focus on today?',
  'Explain my protein target.',
];

export default function DotClient() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'dot', text: 'Hi. I’m Dot. I can help you understand your Protlys progress and decide what to focus on next.' },
  ]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  async function send(text = input) {
    const clean = String(text || '').trim();
    if (!clean || loading) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text: clean }]);
    setLoading(true);
    try {
      const response = await fetch('/api/dot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean }),
      });
      const data = await response.json();
      setMessages((current) => [...current, { role: 'dot', text: data.reply || data.error || 'I couldn’t answer that just now.' }]);
    } catch {
      setMessages((current) => [...current, { role: 'dot', text: 'I couldn’t connect right now. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .protlys-dot-launch{position:fixed;right:16px;bottom:88px;z-index:10001;width:50px;height:50px;border:1px solid rgba(15,42,74,.12);border-radius:50%;background:var(--white,#fff);color:var(--green-dark,#1f7a45);box-shadow:0 8px 24px rgba(15,42,74,.16);display:grid;place-items:center;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease}
        .protlys-dot-launch:hover{transform:translateY(-2px);box-shadow:0 11px 28px rgba(15,42,74,.2)}
        .protlys-dot-launch span{width:11px;height:11px;border-radius:50%;background:var(--green,#2e9e5b);box-shadow:0 0 0 5px var(--green-soft,#e4f3ea)}
        .protlys-dot-panel{position:fixed;right:16px;bottom:150px;z-index:10002;width:min(390px,calc(100vw - 24px));height:min(620px,calc(100dvh - 174px));display:flex;flex-direction:column;background:var(--card,#fff);color:var(--ink,#0f2a4a);border:1px solid var(--line,rgba(15,42,74,.12));border-radius:24px;box-shadow:0 24px 60px rgba(15,42,74,.2);overflow:hidden}
        .protlys-dot-head{display:flex;align-items:center;justify-content:space-between;padding:16px 17px;border-bottom:1px solid var(--line,rgba(15,42,74,.12))}
        .protlys-dot-title{display:flex;align-items:center;gap:10px}.protlys-dot-mark{width:30px;height:30px;border-radius:50%;background:var(--green-soft,#e4f3ea);display:grid;place-items:center}.protlys-dot-mark i{width:8px;height:8px;border-radius:50%;background:var(--green,#2e9e5b)}
        .protlys-dot-close{width:34px;height:34px;border:0;border-radius:50%;background:transparent;color:inherit;font-size:21px;cursor:pointer}
        .protlys-dot-body{flex:1;min-height:0;overflow:auto;padding:16px}
        .protlys-dot-msg{max-width:88%;padding:11px 13px;border-radius:16px;margin-bottom:9px;font-size:13px;line-height:1.48;white-space:pre-wrap}
        .protlys-dot-msg.dot{background:var(--green-soft,#e4f3ea);border-bottom-left-radius:5px}.protlys-dot-msg.user{margin-left:auto;background:var(--ink,#0f2a4a);color:#fff;border-bottom-right-radius:5px}
        .protlys-dot-starters{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.protlys-dot-starters button{border:1px solid var(--line,rgba(15,42,74,.12));background:transparent;color:inherit;border-radius:999px;padding:8px 10px;font-size:11px;cursor:pointer}
        .protlys-dot-compose{padding:10px;border-top:1px solid var(--line,rgba(15,42,74,.12));display:flex;gap:8px}.protlys-dot-compose textarea{flex:1;resize:none;min-height:42px;max-height:100px;border:1px solid var(--line,rgba(15,42,74,.12));border-radius:14px;padding:11px 12px;background:transparent;color:inherit;font:inherit;font-size:13px;outline:none}.protlys-dot-compose textarea:focus{border-color:var(--green,#2e9e5b)}.protlys-dot-send{width:44px;border:0;border-radius:14px;background:var(--green,#2e9e5b);color:#fff;font-weight:800;cursor:pointer}.protlys-dot-send:disabled{opacity:.45;cursor:default}
        @media(max-width:899px){.protlys-dot-launch{bottom:92px;right:14px}.protlys-dot-panel{right:12px;bottom:86px;width:calc(100vw - 24px);height:min(680px,calc(100dvh - 104px));border-radius:22px}}
        @media(prefers-reduced-motion:reduce){.protlys-dot-launch{transition:none}}
      `}</style>
      <button className="protlys-dot-launch" type="button" aria-label={open ? 'Close Dot' : 'Open Dot'} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true" />
      </button>
      {open && (
        <section className="protlys-dot-panel" role="dialog" aria-modal="false" aria-label="Protlys Dot">
          <header className="protlys-dot-head">
            <div className="protlys-dot-title"><span className="protlys-dot-mark"><i /></span><div><div style={{fontSize:14,fontWeight:800}}>Dot</div><div style={{fontSize:10,color:'var(--ink-45)'}}>Your Protlys companion</div></div></div>
            <button className="protlys-dot-close" type="button" aria-label="Close Dot" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="protlys-dot-body">
            {messages.map((message, index) => <div key={index} className={'protlys-dot-msg '+message.role}>{message.text}</div>)}
            {messages.length === 1 && <div className="protlys-dot-starters">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => send(starter)}>{starter}</button>)}</div>}
            {loading && <div className="protlys-dot-msg dot">Thinking…</div>}
            <div ref={endRef} />
          </div>
          <form className="protlys-dot-compose" onSubmit={(event) => { event.preventDefault(); send(); }}>
            <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Dot…" rows={1} aria-label="Message Dot" disabled={loading} />
            <button className="protlys-dot-send" type="submit" disabled={!input.trim() || loading} aria-label="Send">↑</button>
          </form>
        </section>
      )}
    </>
  );
}
