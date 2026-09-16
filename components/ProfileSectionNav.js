'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const sections = [
  ['posts', 'Posts'],
  ['stats', 'Stats'],
  ['photos', 'Photos'],
];

export default function ProfileSectionNav({ profileId }) {
  const pathname = usePathname();
  const [active, setActive] = useState('posts');
  const sliderRef = useRef(null);
  const onConnectionsPage = pathname?.includes('/connections');

  useEffect(() => {
    const slider = document.querySelector('.profile-section-slider');
    if (!slider || onConnectionsPage) return;
    sliderRef.current = slider;

    const updateActive = () => {
      const width = slider.clientWidth || 1;
      const index = Math.max(0, Math.min(sections.length - 1, Math.round(slider.scrollLeft / width)));
      setActive(sections[index][0]);
    };

    updateActive();
    slider.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);

    return () => {
      slider.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, [onConnectionsPage]);

  const goToSection = (event, index, id) => {
    event.preventDefault();
    event.stopPropagation();
    const slider = sliderRef.current || document.querySelector('.profile-section-slider');
    if (!slider) return;
    setActive(id);
    slider.scrollTo({ left: slider.clientWidth * index, behavior: 'smooth' });
  };

  return (
    <nav aria-label="Profile sections" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:2,margin:'12px 0 5px',padding:3,background:'#fff',border:'1px solid var(--line)',borderRadius:12,position:'sticky',top:76,zIndex:10,boxShadow:'0 2px 7px rgba(0,0,0,.035)'}}>
      {sections.map(([id,label],index)=><button key={id} type="button" onClick={(event)=>goToSection(event,index,id)} aria-current={!onConnectionsPage&&active===id?'page':undefined} style={{minWidth:0,border:0,textAlign:'center',padding:'9px 2px',borderRadius:9,background:!onConnectionsPage&&active===id?'var(--green-soft)':'transparent',color:!onConnectionsPage&&active===id?'var(--green-dark)':'var(--ink-45)',fontSize:10,fontWeight:800,whiteSpace:'nowrap',transition:'background .18s ease,color .18s ease',cursor:'pointer'}}>{label}</button>)}
      <Link href={`/member/${profileId}/connections?type=followers`} aria-current={onConnectionsPage?'page':undefined} style={{minWidth:0,textAlign:'center',padding:'9px 2px',borderRadius:9,background:onConnectionsPage?'var(--green-soft)':'transparent',color:onConnectionsPage?'var(--green-dark)':'var(--ink-45)',fontSize:10,fontWeight:800,whiteSpace:'nowrap',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>Connections</Link>
    </nav>
  );
}
