'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const sections = [
  ['posts', 'Posts'],
  ['stats', 'Stats'],
  ['photos', 'Photos'],
];

export default function ProfileSectionNav({ profileId }) {
  const pathname = usePathname();
  const [active, setActive] = useState('posts');
  const onConnectionsPage = pathname?.includes('/connections');

  useEffect(() => {
    if (onConnectionsPage) return;
    const targets = sections.map(([id]) => document.getElementById(id)).filter(Boolean);
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { root: null, rootMargin: '-120px 0px -55% 0px', threshold: [0.05, 0.25, 0.5, 0.75] }
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [onConnectionsPage]);

  return (
    <nav aria-label="Profile sections" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:2,margin:'12px 0 5px',padding:3,background:'#fff',border:'1px solid var(--line)',borderRadius:12,position:'sticky',top:76,zIndex:10,boxShadow:'0 2px 7px rgba(0,0,0,.035)'}}>
      {sections.map(([id,label]) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={() => setActive(id)}
          aria-current={!onConnectionsPage && active === id ? 'page' : undefined}
          style={{minWidth:0,border:0,textAlign:'center',padding:'9px 2px',borderRadius:9,background:!onConnectionsPage&&active===id?'var(--green-soft)':'transparent',color:!onConnectionsPage&&active===id?'var(--green-dark)':'var(--ink-45)',fontSize:10,fontWeight:800,whiteSpace:'nowrap',transition:'background .18s ease,color .18s ease',cursor:'pointer',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}
        >
          {label}
        </a>
      ))}
      <Link href={`/member/${profileId}/connections?type=followers`} aria-current={onConnectionsPage?'page':undefined} style={{minWidth:0,textAlign:'center',padding:'9px 2px',borderRadius:9,background:onConnectionsPage?'var(--green-soft)':'transparent',color:onConnectionsPage?'var(--green-dark)':'var(--ink-45)',fontSize:10,fontWeight:800,whiteSpace:'nowrap',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>Connections</Link>
    </nav>
  );
}
