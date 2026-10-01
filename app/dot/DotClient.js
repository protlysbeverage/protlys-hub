'use client';

import { useEffect, useRef, useState } from 'react';

const STARTERS = [
  'How am I doing this week?',
  'What should I focus on today?',
  'Explain my protein target.',
];

export default function PROTClient() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'prot', text: 'Hi. I’m PROT. I can help you understand your Protlys progress and decide what to focus on next.' },
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
      setMessages((current) => [...current, { role: 'prot', text: data.reply || data.error || 'I couldn’t answer that just now.' }]);
    } catch {
      setMessages((current) => [...current, { role: 'prot', text: 'I couldn’t connect right now. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .protlys-prot-launch{position:fixed;right:16px;bottom:88px;z-index:10001;width:50px;height:50px;border:1px solid rgba(15,42,74,.12);border-radius:50%;background:var(--white,#fff);color:var(--green-dark,#1f7a45);box-shadow:0 8px 24px rgba(15,42,74,.16);display:grid;place-items:center;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease}
        .protlys-prot-launch:hover{transform:translateY(-2px);box-shadow:0 11px 28px rgba(15,42,74,.2)}
        .protlys-prot-launch span{width:11px;height:11px;border-radius:50%;background:var(--green,#2e9e5b);box-shadow:0 0 0 5px var(--green-soft,#e4f3ea)}
        .protlys-prot-panel{position:fixed;right:16px;bottom:150px;z-index:10002;width:min(390px,calc(100vw - 24px));height:min(620px,calc(100dvh - 174px));display:flex;flex-direction:column;background:var(--card,#fff);color:var(--ink,#0f2a4a);border:1px solid var(--line,rgba(15,42,74,.12));border-radius:24px;box-shadow:0 24px 60px rgba(15,42,74,.2);overflow:hidden}
        .protlys-prot-head{display:flex;align-items:center;justify-content:space-between;padding:16px 17px;border-bottom:1px solid var(--line,rgba(15,42,74,.12))}
        .protlys-prot-title{display:flex;align-items:center;gap:10px}.protlys-prot-mark{width:30px;height:30px;border-radius:50%;background:var(--green-soft,#e4f3ea);display:grid;place-items:center}.protlys-prot-mark i{width:8px;height:8px;border-radius:50%;background:var(--green,#2e9e5b)}
        .protlys-prot-close{width:34px;height:34px;border:0;border-radius:50%;background:transparent;color:inherit;font-size:21px;cursor:pointer}
        .protlys-prot-body{flex:1;min-height:0;overflow:auto;padding:16px}
        .protlys-prot-msg{max-width:88%;padding:11px 13px;border-radius:16px;margin-bottom:9px;font-size:13px;line-height:1.48;white-space:pre-wrap}
        .protlys-prot-msg.prot{background:var(--green-soft,#e4f3ea);border-bottom-left-radius:5px}.protlys-prot-msg.user{margin-left:auto;background:var(--ink,#0f2a4a);color:#fff;border-bottom-right-radius:5px}
        .protlys-prot-starters{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.protlys-prot-starters button{border:1px solid var(--line,rgba(15,42,74,.12));background:transparent;color:inherit;border-radius:999px;padding:8px 10px;font-size:11px;cursor:pointer}
        .protlys-prot-compose{padding:10px;border-top:1px solid var(--line,rgba(15,42,74,.12));display:flex;gap:8px}.protlys-prot-compose textarea{flex:1;resize:none;min-height:42px;max-height:100px;border:1px solid var(--line,rgba(15,42,74,.12));border-radius:14px;padding:11px 12px;background:transparent;color:inherit;font:inherit;font-size:13px;outline:none}.protlys-prot-compose textarea:focus{border-color:var(--green,#2e9e5b)}.protlys-prot-send{width:44px;border:0;border-radius:14px;background:var(--green,#2e9e5b);color:#fff;font-weight:800;cursor:pointer}.protlys-prot-send:disabled{opacity:.45;cursor:default}
        .protlys-dark .protlys-prot-launch{background:var(--card,#111820);color:var(--green,#4dbb75);border-color:rgba(255,255,255,.1);box-shadow:0 10px 28px rgba(0,0,0,.35)}
        .protlys-dark .protlys-prot-panel{background:var(--card,#111820);color:var(--ink,#f2f5f7);border-color:rgba(255,255,255,.1);box-shadow:0 24px 60px rgba(0,0,0,.45)}
        .protlys-dark .protlys-prot-msg.user{background:var(--green,#2e9e5b);color:#07140c}
        .protlys-dark .protlys-prot-starters button{border-color:rgba(255,255,255,.12)}
        @media(max-width:899px){.protlys-prot-launch{bottom:92px;right:14px}.protlys-prot-panel{right:12px;bottom:86px;width:calc(100vw - 24px);height:min(680px,calc(100dvh - 104px));border-radius:22px}}
        @media(prefers-reduced-motion:reduce){.protlys-prot-launch{transition:none}}
      `}</style>
      <button className="protlys-prot-launch" type="button" aria-label={open ? 'Close PROT' : 'Open PROT'} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true" />
      </button>
      {open && (
        <section className="protlys-prot-panel" role="dialog" aria-modal="false" aria-label="Protlys PROT">
          <header className="protlys-prot-head">
            <div className="protlys-prot-title"><span className="protlys-prot-mark"><i /></span><div><div style={{fontSize:14,fontWeight:800}}>PROT</div><div style={{fontSize:10,color:'var(--ink-45)'}}>Your Protlys companion</div></div></div>
            <button className="protlys-prot-close" type="button" aria-label="Close PROT" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="protlys-prot-body">
            {messages.map((message, index) => <div key={index} className={'protlys-prot-msg '+message.role}>{message.text}</div>)}
            {messages.length === 1 && <div className="protlys-prot-starters">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => send(starter)}>{starter}</button>)}</div>}
            {loading && <div className="protlys-prot-msg prot">Thinking…</div>}
            <div ref={endRef} />
          </div>
          <form className="protlys-prot-compose" onSubmit={(event) => { event.preventDefault(); send(); }}>
            <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask PROT…" rows={1} aria-label="Message PROT" disabled={loading} />
            <button className="protlys-prot-send" type="submit" disabled={!input.trim() || loading} aria-label="Send">↑</button>
          </form>
        </section>
      )}
    </>
  );
}
