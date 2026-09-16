'use client';

import { useEffect, useState } from 'react';

const sections = [['posts','Posts'],['stats','Stats'],['photos','Photos'],['connections','Connections']];

export default function ProfileSectionNav() {
  const [active,setActive]=useState('posts');
  useEffect(()=>{
    const slider=document.querySelector('.profile-section-slider'); if(!slider)return;
    const targets=sections.map(([id])=>document.getElementById(id)).filter(Boolean);
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible)setActive(visible.target.id);
    },{root:slider,threshold:[0.55,0.75,0.9]});
    targets.forEach(target=>observer.observe(target));
    const openConnections=event=>{
      const type=event.detail?.type==='following'?'following':'followers';
      const target=document.getElementById('connections');
      if(!target)return;
      const left=target.offsetLeft;
      slider.scrollTo({left,behavior:'smooth'});
      window.requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('protlys-open-connection-type',{detail:{type}})));
    };
    window.addEventListener('protlys-profile-connections',openConnections);
    return()=>{observer.disconnect();window.removeEventListener('protlys-profile-connections',openConnections)};
  },[]);
  return <nav aria-label="Profile sections" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:2,margin:'12px 0 5px',padding:'3px',background:'#fff',border:'1px solid var(--line)',borderRadius:12,position:'sticky',top:76,zIndex:10,boxShadow:'0 2px 7px rgba(0,0,0,.035)'}}>
    {sections.map(([id,label])=><a key={id} href={`#${id}`} aria-current={active===id?'page':undefined} style={{minWidth:0,textAlign:'center',padding:'9px 3px',borderRadius:9,background:active===id?'var(--green-soft)':'transparent',color:active===id?'var(--green-dark)':'var(--ink-45)',textDecoration:'none',fontSize:10.5,fontWeight:800,whiteSpace:'nowrap',transition:'background .18s ease,color .18s ease'}}>{label}</a>)}
  </nav>;
}
