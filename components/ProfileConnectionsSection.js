'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/FollowButton';

function Avatar({ name, url }) {
  const style = { width:44, height:44, minWidth:44, borderRadius:'50%', objectFit:'cover', flexShrink:0, display:'block' };
  if (url) return <img src={url} alt="" loading="lazy" decoding="async" style={style} />;
  return <div style={{...style, background:'var(--green-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'var(--green-dark)'}}>{(name || '?')[0].toUpperCase()}</div>;
}

function List({ people, loading, title }) {
  if (loading) return <div style={{display:'grid',gap:8}}>{[1,2,3].map(i=><div key={i} style={{height:64,borderBottom:'1px solid var(--line)',background:'var(--paper)',borderRadius:8}} />)}</div>;
  if (!people.length) return <div style={{background:'#fff',border:'1.5px solid var(--line)',borderRadius:16,padding:'28px 18px',textAlign:'center'}}><div style={{fontWeight:800}}>No {title.toLowerCase()} yet</div><p className="subhead" style={{margin:'5px 0 0'}}>People who connect with this profile will appear here.</p></div>;
  return <div style={{display:'grid',gap:8}}>{people.map(person=><div key={person.id} style={{display:'flex',alignItems:'center',gap:11,padding:'10px 0',borderBottom:'1px solid var(--line)'}}><Link href={`/member/${person.id}`} style={{display:'flex',alignItems:'center',gap:11,flex:1,minWidth:0,textDecoration:'none',color:'var(--ink)'}}><Avatar name={person.display_name} url={person.avatar_url}/><span style={{fontSize:13,fontWeight:800,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{person.display_name || 'Protlys Member'}</span></Link>{person.id && <FollowButton profileId={person.id} initialFollowing={Boolean(person.following)} compact />}</div>)}</div>;
}

export default function ProfileConnectionsSection({ profileId, followerCount = 0, followingCount = 0 }) {
  const [type, setType] = useState('followers');
  const [data, setData] = useState({ followers:null, following:null });
  const [loading, setLoading] = useState({ followers:false, following:false });
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const requested = useRef(new Set());
  const suppressClick = useRef(false);

  const load = useCallback(async (nextType) => {
    if (requested.current.has(nextType)) return;
    requested.current.add(nextType);
    setLoading(prev => ({...prev, [nextType]:true}));
    try {
      const response = await fetch(`/api/member/${profileId}/connections?type=${nextType}`, { cache:'no-store' });
      if (!response.ok) throw new Error('connections request failed');
      const json = await response.json();
      setData(prev => ({...prev, [nextType]:Array.isArray(json.people) ? json.people : []}));
    } catch {
      setData(prev => ({...prev, [nextType]:[]}));
    } finally {
      setLoading(prev => ({...prev, [nextType]:false}));
    }
  }, [profileId]);

  const switchType = useCallback((nextType) => {
    const normalized = nextType === 'following' ? 'following' : 'followers';
    setType(normalized);
    setDragX(0);
    load(normalized);
  }, [load]);

  useEffect(() => {
    const handler = event => switchType(event.detail?.type);
    window.addEventListener('protlys-open-connection-type', handler);
    return () => window.removeEventListener('protlys-open-connection-type', handler);
  }, [switchType]);

  useEffect(() => {
    const timer = window.setTimeout(() => { load('followers'); load('following'); }, 350);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragRef.current = { startX:event.clientX, startY:event.clientY, lastX:event.clientX, active:false, pointerId:event.pointerId };
    suppressClick.current = false;
  }, []);

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { dragRef.current = null; return; }
      drag.active = true;
      setDragging(true);
    }
    event.preventDefault();
    event.stopPropagation();
    drag.lastX = event.clientX;
    setDragX(dx);
    suppressClick.current = true;
  }, []);

  const finishPointer = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = drag.lastX - drag.startX;
    const wasHorizontal = drag.active;
    dragRef.current = null;
    setDragging(false);
    if (!wasHorizontal) return;
    event.preventDefault();
    event.stopPropagation();
    const threshold = Math.max(45, window.innerWidth * 0.12);
    if (Math.abs(dx) >= threshold) switchType(dx < 0 ? 'following' : 'followers');
    else setDragX(0);
    window.setTimeout(() => { suppressClick.current = false; }, 80);
  }, [switchType]);

  const cancelPointer = useCallback(() => { dragRef.current = null; setDragging(false); setDragX(0); }, []);
  const handleClickCapture = useCallback((event) => { if (!suppressClick.current) return; event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }, []);
  const base = type === 'following' ? -50 : 0;

  return <section id="connections" style={{flex:'0 0 100%',minWidth:0,scrollSnapAlign:'start',scrollMarginTop:140,paddingTop:8,paddingBottom:24}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:10,marginBottom:8}}><div className="eyebrow">Connections</div><span style={{fontSize:10.5,color:'var(--ink-45)'}}>Swipe to switch</span></div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,padding:3,background:'#fff',border:'1px solid var(--line)',borderRadius:12,marginBottom:10}}>{[['followers','Followers',followerCount],['following','Following',followingCount]].map(([key,label,count])=><button key={key} type="button" onClick={() => switchType(key)} style={{border:0,borderRadius:9,padding:'9px 4px',background:type===key?'var(--green-soft)':'transparent',color:type===key?'var(--green-dark)':'var(--ink-45)',fontSize:11.5,fontWeight:800,cursor:'pointer'}}>{label} <span className="mono">{count}</span></button>)}</div>
    <div onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishPointer} onPointerCancel={cancelPointer} onClickCapture={handleClickCapture} style={{width:'100%',overflow:'hidden',touchAction:'pan-y',userSelect:'none',cursor:dragging?'grabbing':'grab'}}>
      <div style={{display:'flex',width:'200%',transform:`translate3d(calc(${base}% + ${dragX}px),0,0)`,transition:dragging?'none':'transform 260ms cubic-bezier(0.22,1,0.36,1)',willChange:'transform'}}>
        <div style={{width:'50%',minWidth:'50%',flexShrink:0,paddingRight:8}}><List people={data.followers || []} loading={loading.followers && !data.followers} title="Followers" /></div>
        <div style={{width:'50%',minWidth:'50%',flexShrink:0,paddingLeft:8}}><List people={data.following || []} loading={loading.following && !data.following} title="Following" /></div>
      </div>
    </div>
  </section>;
}
