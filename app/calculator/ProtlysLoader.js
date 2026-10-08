'use client';

import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';

const PATH = 'M-40 -60 H14 A46 46 0 0 1 14 32 H-6 V64 H-40 Z';
const WAVE = 'M-100 0 q10 -5 20 0' + ' t20 0'.repeat(12) + ' V160 H-100 Z';

export const ProtlysLoader = forwardRef(function ProtlysLoader(_, ref) {
  const id = useId().replace(/:/g, '');
  const svgRef = useRef(null);
  const liquidRef = useRef(null);
  const waveRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setProgress(progress) {
      const value = Math.max(0, Math.min(100, Number(progress) || 0));
      const liquidY = 66 - (value / 100) * 136;
      liquidRef.current?.setAttribute('transform', `translate(0,${liquidY})`);
      svgRef.current?.classList.toggle('pop', value >= 100);
    }
  }), []);

  useEffect(() => {
    const wave = waveRef.current;
    if (!wave) return;
    let frame = 0;
    const start = performance.now();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      wave.style.transform = 'translateX(0)';
      return;
    }

    const tick = now => {
      const x = -(((now - start) / 1000 * 40) % 40);
      wave.style.transform = `translateX(${x}px)`;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="protlys-loader">
      <div className="protlys-loader-mascot">
        <svg ref={svgRef} viewBox="-72 -66 168 172" className="protlys-loader-svg" role="presentation">
          <defs>
            <clipPath id={id}><path d={PATH} /></clipPath>
          </defs>

          <ellipse cx="0" cy="84" rx="40" ry="6" fill="var(--ink)" opacity="0.15" />

          <g className="char" transform="translate(-20,0)">
            <g transform="translate(-30,64)">
              <line x1="0" y1="0" x2="0" y2="14" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="-4" cy="18" rx="11" ry="5.5" fill="var(--ink)" />
            </g>
            <g transform="translate(-14,64)">
              <line x1="0" y1="0" x2="0" y2="14" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="4" cy="18" rx="11" ry="5.5" fill="var(--ink)" />
            </g>

            <g className="aL" transform="translate(-40,14)">
              <path d="M0 0 Q-16 4 -18 18" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
              <circle cx="-18" cy="21" r="7" fill="var(--green)" stroke="var(--ink)" strokeWidth="3.5" />
            </g>
            <g className="aR" transform="translate(58,-6)">
              <path d="M0 0 Q18 -2 22 -22" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
              <circle cx="22" cy="-26" r="7" fill="var(--green)" stroke="var(--ink)" strokeWidth="3.5" />
            </g>

            <path d={PATH} fill="var(--green-soft)" />
            <g clipPath={`url(#${id})`}>
              <g ref={liquidRef} transform="translate(0,66)">
                <g ref={waveRef} className="wave">
                  <path d={WAVE} fill="var(--green)" />
                </g>
              </g>
            </g>

            <path d={PATH} fill="none" stroke="var(--ink)" strokeWidth="4.5" strokeLinejoin="round" />
            <line x1="-30" y1="-46" x2="-30" y2="10" stroke="var(--white)" strokeWidth="5" strokeLinecap="round" opacity="0.45" />

            <ellipse cx="18" cy="-14" rx="20" ry="22" fill="var(--white)" stroke="var(--ink)" strokeWidth="3.5" />

            <g className="eye">
              <ellipse cx="9" cy="-18" rx="5.5" ry="7.5" fill="var(--ink)" />
              <circle cx="10.5" cy="-21" r="2" fill="#FFFFFF" />
              <ellipse cx="27" cy="-18" rx="5.5" ry="7.5" fill="var(--ink)" />
              <circle cx="28.5" cy="-21" r="2" fill="#FFFFFF" />
            </g>

            <path className="mouth" d="M14 0 H22" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
            <path className="mouth-smile" d="M12 -1 Q18 7 24 -1" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" opacity="0" />
          </g>
        </svg>
      </div>
    </div>
  );
});

ProtlysLoader.displayName = 'ProtlysLoader';
