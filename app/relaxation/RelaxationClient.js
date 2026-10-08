'use client';

import { useEffect, useState } from 'react';
import { ProtlysLoader } from '@/app/calculator/ProtlysLoader';

const SESSIONS = [
  { title:'Reset', time:'2 min', desc:'A quick breathing reset for any moment.', phase:'Breathe in', pattern:[4,4] },
  { title:'Unwind', time:'5 min', desc:'Slow down after a busy day.', phase:'Breathe in', pattern:[4,6] },
  { title:'Wind down', time:'10 min', desc:'A slower evening session to help you settle.', phase:'Breathe in', pattern:[4,6] },
];

export default function RelaxationClient() {
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState('Breathe in');

  useEffect(() => {
    if (!running || !selected) return;
    const timer = window.setInterval(() => setSeconds(v => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, selected]);

  useEffect(() => {
    if (!running || !selected) return;
    const cycle = selected.pattern[0] + selected.pattern[1];
    const pos = seconds % cycle;
    setPhase(pos < selected.pattern[0] ? 'Breathe in' : 'Breathe out');
  }, [seconds, running, selected]);

  const start = session => {
    setSelected(session);
    setSeconds(0);
    setPhase('Breathe in');
    setRunning(true);
  };

  return <div className="screen-pad" style={{paddingBottom:'calc(112px + env(safe-area-inset-bottom))'}}>
    <span className="eyebrow">Relaxation</span>
    <h1 style={{fontSize:28,marginBottom:5}}>Take a moment.</h1>
    <p className="subhead" style={{maxWidth:440}}>Simple breathing sessions to help you reset, unwind and slow things down.</p>

    {running && selected ? <section className="relax-active">
      <div className="relax-active-art"><ProtlysLoader /></div>
      <div className="relax-phase">{phase}</div>
      <div className="relax-timer">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</div>
      <div className="relax-ring" aria-hidden="true"><span /></div>
      <button type="button" className="btn-secondary" onClick={() => setRunning(false)}>Pause</button>
    </section> : <div className="relax-session-list">
      {SESSIONS.map(session => <button key={session.title} type="button" className="relax-session" onClick={() => start(session)}>
        <div><div className="relax-kicker">{session.time}</div><div className="relax-title">{session.title}</div><div className="relax-desc">{session.desc}</div></div>
        <span className="relax-start">Start</span>
      </button>)}
    </div>}

    <section className="relax-note"><div className="relax-note-title">A little reset goes a long way.</div><div>Relaxation here is about everyday recovery — no pressure, no perfect routine.</div></section>

    <style>{`
      .relax-session-list{display:grid;gap:10px;margin-top:22px}
      .relax-session{width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;text-align:left;padding:16px;border:1.5px solid var(--line);border-radius:18px;background:var(--card);color:inherit;cursor:pointer}
      .relax-session:active{transform:scale(.99)}
      .relax-kicker{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-45);font-weight:800}
      .relax-title{font-size:17px;font-weight:800;margin-top:3px}
      .relax-desc{font-size:11.5px;color:var(--ink-45);margin-top:3px}
      .relax-start{flex:0 0 auto;color:var(--green-dark);font-size:12px;font-weight:800;border:1px solid var(--line);padding:8px 11px;border-radius:999px;background:var(--green-soft)}
      .relax-active{margin-top:22px;padding:24px 18px;border:1.5px solid var(--line);border-radius:22px;background:var(--card);text-align:center;display:flex;flex-direction:column;align-items:center}
      .relax-active-art{width:96px;height:96px;display:flex;align-items:center;justify-content:center}
      .relax-active-art .protlys-loader,.relax-active-art .protlys-loader-mascot,.relax-active-art .protlys-loader-svg{width:96px!important;height:96px!important}
      .relax-phase{margin-top:8px;font-size:12px;font-weight:800;color:var(--ink-70)}
      .relax-timer{font-family:var(--mono,monospace);font-size:28px;font-weight:800;margin-top:5px}
      .relax-ring{width:132px;height:132px;border:1px solid var(--green);border-radius:50%;display:grid;place-items:center;margin:14px 0 18px;animation:relax-breathe 8s ease-in-out infinite}
      .relax-ring span{width:10px;height:10px;border-radius:50%;background:var(--green)}
      .relax-note{margin-top:18px;padding:14px 15px;border-radius:16px;background:var(--green-soft);color:var(--ink-70);font-size:11.5px;line-height:1.45}
      .relax-note-title{font-size:13px;font-weight:800;color:var(--ink);margin-bottom:2px}
      @keyframes relax-breathe{0%,100%{transform:scale(.82);opacity:.7}50%{transform:scale(1);opacity:1}}
      @media(prefers-reduced-motion:reduce){.relax-ring{animation:none}}
    `}</style>
  </div>;
}
