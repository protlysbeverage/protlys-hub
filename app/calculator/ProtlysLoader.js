'use client';

import { useEffect, useId, useState } from 'react';

export function ProtlysLoader({ progress = 0 }) {
  const raw = Math.max(0, Math.min(100, progress));
  const [wave, setWave] = useState(0);
  const clipId = useId().replace(/:/g, '');
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, start = performance.now();
    const tick = now => { setWave((now - start) / 520); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const fillY = 96 - (raw / 100) * 86;
  const eyeLift = raw > 0 ? -Math.min(3, raw / 30) : 0;
  return <div className="protlys-loader" aria-hidden="true">
    <svg viewBox="0 0 120 108" width="112" height="112" role="presentation">
      <defs><clipPath id={clipId}><path d="M28 10h38c18 0 28 9 28 25S84 60 66 60H48v38H28Zm20 15v20h17c9 0 14-3 14-10s-5-10-14-10Z" fillRule="evenodd" clipRule="evenodd"/></clipPath></defs>
      <path d="M28 10h38c18 0 28 9 28 25S84 60 66 60H48v38H28Z" fill="none" stroke="#111111" strokeWidth="5" strokeLinejoin="round"/>
      <g clipPath={'url(#'+clipId+')'}>
        <rect x="18" y={fillY} width="84" height="42" fill="#6BCB45"/>
        <path d={'M18 '+(fillY+1)+' q10 '+(-4*Math.sin(wave))+' 21 0t21 0t21 0t21 0v42H18Z'} fill="#6BCB45"/>
      </g>
      <path d="M48 25v20h17c9 0 14-3 14-10s-5-10-14-10Z" fill="none" stroke="#111111" strokeWidth="5"/>
      <g fill="#111111" transform={'translate(51 '+(31+eyeLift)+')'}>
        <circle cx="7" cy="2" r="2.2"/><circle cx="17" cy="2" r="2.2"/>
        <path d="M9 9q3 2 6 0" fill="none" stroke="#111111" strokeWidth="1.7" strokeLinecap="round"/>
      </g>
    </svg>
  </div>;
}