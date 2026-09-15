'use client';

import { useEffect, useRef, useState } from 'react';

const sections = [
  ['posts', 'Posts'],
  ['stats', 'Stats'],
  ['photos', 'Photos'],
];

export default function ProfileSectionTabs({ children }) {
  const sliderRef = useRef(null);
  const [active, setActive] = useState('posts');

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const targets = sections
      .map(([id]) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { root: slider, threshold: [0.55, 0.75, 0.9] }
    );

    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const goTo = id => {
    const target = document.getElementById(id);
    if (!target) return;
    setActive(id);
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  return <>
    <nav aria-label="Profile sections" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, margin:'16px 0 4px', padding:4, background:'var(--green-soft)', borderRadius:14, position:'sticky', top:76, zIndex:10, boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
      {sections.map(([id, label]) => <button
        key={id}
        type="button"
        onClick={() => goTo(id)}
        aria-current={active === id ? 'page' : undefined}
        style={{ textAlign:'center', padding:'9px 6px', borderRadius:10, border:0, background:active === id ? '#fff' : 'transparent', color:active === id ? 'var(--ink)' : 'var(--green-dark)', textDecoration:'none', fontSize:11.5, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:active === id ? '0 1px 3px rgba(0,0,0,.04)' : 'none' }}
      >{label}</button>)}
    </nav>

    <div ref={sliderRef} className="profile-section-slider" aria-label="Profile sections content" style={{ display:'flex', overflowX:'auto', overscrollBehaviorX:'contain', scrollSnapType:'x mandatory', scrollBehavior:'smooth', scrollbarWidth:'none', margin:'0 -1px', paddingBottom:8 }}>
      {children}
    </div>
  </>;
}
