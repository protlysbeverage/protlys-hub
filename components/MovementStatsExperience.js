'use client';

import { useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';

function Icon({ name, size = 18 }) {
  const paths = {
    flame: <path d="M12 2s5 4.5 5 9.5a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8z"/>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M12 13v5M8 21h8M5 4h3M16 4h3"/><path d="M5 4v1a3 3 0 0 0 3 3M19 4v1a3 3 0 0 1-3 3"/></>,
    share: <><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    close: <path d="m7 7 10 10M17 7 7 17"/>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const distanceFor = steps => (Number(steps || 0) * 0.75) / 1000;
const formatDistance = km => km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km';
const fmt = value => Number(value || 0).toLocaleString();

function localKey(offsetDays = 0) {
  const now = new Date();
  const key = new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi' }).format(now);
  const d = new Date(key + 'T12:00:00+03:00');
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi' }).format(d);
}

function MiniBars({ values, labels }) {
  const max = Math.max(...values, 1);
  return <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',alignItems:'end',gap:8,height:126}}>
    {values.map((value,i) => <div key={i} style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center',gap:7}}>
      <div style={{width:'100%',maxWidth:34,height:Math.max(7,(Number(value||0)/max)*82),borderRadius:999,background:value?'var(--green)':'var(--green-soft)',transition:'height 500ms var(--ease-out)'}}/>
      <span style={{fontSize:9.5,color:'var(--ink-45)'}}>{labels[i]}</span>
    </div>)}
  </div>;
}

function GoalRing({ value, goal }) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const r = 43, c = 2 * Math.PI * r;
  return <svg viewBox="0 0 110 110" style={{width:150,height:150,display:'block',margin:'4px auto 0'}}>
    <circle cx="55" cy="55" r={r} fill="none" stroke="var(--green-soft)" strokeWidth="10"/>
    <circle cx="55" cy="55" r={r} fill="none" stroke="var(--green)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-pct)} transform="rotate(-90 55 55)"/>
    <text x="55" y="60" textAnchor="middle" fontSize="21" fontWeight="800" fill="var(--ink)">{Math.round(pct*100)}%</text>
  </svg>;
}

export default function MovementStatsExperience({ profile = {}, todaySteps = 0, weekSteps = [], movementDays = [] }) {
  const [sheet, setSheet] = useState(null);
  const [shareKind, setShareKind] = useState(null);
  const [shareSize, setShareSize] = useState('feed');
  const [sharing, setSharing] = useState(false);
  const canvasRef = useRef(null);

  const goal = Number(profile?.step_goal || 0);
  const current = Number(profile?.step_streak || profile?.streak || 0);
  const totalSteps = Number(profile?.total_steps || 0);
  const allRows = useMemo(() => (movementDays || []).map(row => ({key:row.step_date,steps:Number(row.steps || 0)})).sort((a,b)=>a.key.localeCompare(b.key)), [movementDays]);
  const week = useMemo(() => {
    const end = localKey();
    return Array.from({length:7},(_,i)=> {
      const key = localKey(i - 6);
      const row = weekSteps.find(item => item.step_date === key) || allRows.find(item => item.key === key);
      return {key,steps:Number(row?.steps || 0),label:new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Nairobi',weekday:'short'}).format(new Date(key+'T12:00:00+03:00')).slice(0,1)};
    });
  }, [weekSteps, allRows]);
  const best = useMemo(() => Math.max(current, ...allRows.reduce((runs,row,i,rows) => {
    if (!row.steps) return runs;
    let run=1;
    for(let j=i-1;j>=0 && rows[j].steps>0;j--) run++;
    return [...runs,run];
  },[])), [current,allRows]);
  const movementCount = week.filter(d=>d.steps>0).length;
  const weekTotal = week.reduce((sum,d)=>sum+d.steps,0);
  const distance = distanceFor(totalSteps);
  const weeklyDistance = week.reduce((sum,d)=>sum+distanceFor(d.steps),0);
  const last14 = useMemo(() => Array.from({length:14},(_,i)=>allRows.find(row=>row.key===localKey(i-13))?.steps>0), [allRows]);

  async function drawShare(kind=shareKind, size=shareSize) {
    const canvas=canvasRef.current; if(!canvas)return;
    const W=1080,H=size==='story'?1920:1350;
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,W,H);
    gradient.addColorStop(0,'#eaf6ef'); gradient.addColorStop(.55,'#cfe9da'); gradient.addColorStop(1,'#8fcaa6');
    ctx.fillStyle=gradient; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.fillRect(48,48,W-96,H-96);
    const pad=92;
    ctx.fillStyle='#12294d'; ctx.font='800 46px Arial'; ctx.fillText('PROTLYS',pad,150);
    ctx.fillStyle='#5b6b80'; ctx.font='600 32px Arial'; ctx.fillText(kind==='best'?'MY BEST STREAK':'MY CURRENT STREAK',pad,235);
    ctx.fillStyle='#12294d'; ctx.font='800 270px Arial'; ctx.fillText(String(kind==='best'?best:current),pad,530);
    ctx.fillStyle='#1e7a46'; ctx.font='700 58px Arial'; ctx.fillText('DAYS',pad+365,530);
    ctx.fillStyle='#12294d'; ctx.font='700 40px Arial'; ctx.fillText('Keep moving. Keep building.',pad,610);
    last14.forEach((on,i)=>{ctx.fillStyle=on?'#1e7a46':'#e4f2ea';ctx.fillRect(pad+i*62,675,46,46)});
    ctx.fillStyle='#12294d'; ctx.font='800 50px Arial'; ctx.fillText(fmt(totalSteps),pad,830);
    ctx.font='500 26px Arial'; ctx.fillStyle='#5b6b80'; ctx.fillText('lifetime steps',pad,868);
    ctx.fillStyle='#12294d'; ctx.font='800 50px Arial'; ctx.fillText(distance.toFixed(1)+' km',560,830);
    ctx.font='500 26px Arial'; ctx.fillStyle='#5b6b80'; ctx.fillText('estimated distance',560,868);
    const qr=await QRCode.toDataURL('https://hub.protlys.com',{margin:1,width:260,color:{dark:'#12294d',light:'#ffffff'}});
    const img=new Image(); img.onload=()=>{ctx.fillStyle='#f1f7f3';ctx.fillRect(700,H-430,280,280);ctx.drawImage(img,710,H-420,260,260);ctx.fillStyle='#12294d';ctx.font='700 30px Arial';ctx.fillText('hub.protlys.com',pad,H-175);ctx.fillStyle='#5b6b80';ctx.font='500 23px Arial';ctx.fillText('Scan to join the movement',pad,H-135);}; img.src=qr;
    await new Promise(resolve=>setTimeout(resolve,80));
  }

  async function share(kind) {
    setShareKind(kind); setSharing(true);
    await drawShare(kind,shareSize);
    const blob=await new Promise(resolve=>canvasRef.current.toBlob(resolve,'image/png'));
    const file=new File([blob],'protlys-streak.png',{type:'image/png'});
    try {
      if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'My Protlys movement'});}
      else {const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='protlys-streak.png';a.click();}
    } catch(error) { if(error?.name!=='AbortError') console.error(error); }
    finally { setSharing(false); }
  }

  const sheetTitle = {today:'Steps today',distance:'Estimated distance',days:'Movement days',lifetime:'Lifetime steps'}[sheet];

  return <>
    <section className="screen-pad" style={{paddingTop:4,paddingBottom:10}}>
      <div style={{fontFamily:'IBM Plex Mono',fontSize:10.5,letterSpacing:1.4,textTransform:'uppercase',color:'var(--green-dark)',fontWeight:700,marginBottom:8}}>Movement</div>
      <div style={{fontFamily:'Space Grotesk',fontSize:20,fontWeight:800,marginBottom:12}}>Streaks</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{minHeight:168,padding:16,borderRadius:24,border:'1px solid var(--green-soft)',background:'linear-gradient(160deg,var(--green-soft),#d3ebdd)',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
          <div><div style={{display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'var(--ink-70)'}}><Icon name="flame" size={18}/>Current</div><div style={{display:'flex',alignItems:'baseline',gap:6,lineHeight:1,marginTop:10}}><b style={{fontSize:48,letterSpacing:-1.5}}>{current}</b><span style={{fontSize:15,fontWeight:700,color:'var(--ink-70)'}}>days</span></div><div style={{height:6,borderRadius:99,background:'rgba(15,42,74,.10)',overflow:'hidden',marginTop:12}}><i style={{display:'block',height:'100%',width:(best?Math.min(100,current/best*100):0)+'%',borderRadius:99,background:'var(--green)'}}/></div></div>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8,marginTop:12}}><span style={{fontSize:12,lineHeight:1.3,color:'var(--ink-70)',maxWidth:'70%'}}>{best>current ? (best-current)+' day'+(best-current===1?'':'s')+' to beat your best' : 'You are at your best'}</span><button type="button" className="motion-tap" onClick={()=>share('current')} aria-label="Share current streak" style={{flex:'0 0 34px',width:34,height:34,border:0,borderRadius:'50%',background:'rgba(15,42,74,.07)',color:'var(--ink)',display:'grid',placeItems:'center'}}><Icon name="share" size={16}/></button></div>
        </div>
        <div style={{minHeight:168,padding:16,borderRadius:24,border:'1px solid var(--line)',background:'var(--card)',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
          <div><div style={{display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,color:'var(--ink-70)'}}><Icon name="trophy" size={18}/>Best</div><div style={{display:'flex',alignItems:'baseline',gap:6,lineHeight:1,marginTop:10}}><b style={{fontSize:48,letterSpacing:-1.5}}>{best}</b><span style={{fontSize:15,fontWeight:700,color:'var(--ink-70)'}}>days</span></div></div>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8,marginTop:12}}><span style={{fontSize:12,lineHeight:1.3,color:'var(--ink-70)',maxWidth:'70%'}}>Your longest run of movement</span><button type="button" className="motion-tap" onClick={()=>share('best')} aria-label="Share best streak" style={{flex:'0 0 34px',width:34,height:34,border:0,borderRadius:'50%',background:'rgba(15,42,74,.07)',color:'var(--ink)',display:'grid',placeItems:'center'}}><Icon name="share" size={16}/></button></div>
        </div>
      </div>
    </section>

    <section className="screen-pad" style={{paddingTop:4,paddingBottom:12}}>
      <div style={{fontFamily:'Space Grotesk',fontSize:20,fontWeight:800,marginBottom:12}}>Recent activity</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {[
          ['today','Steps today',fmt(todaySteps),'Tap for daily goal'],
          ['distance','Estimated distance',formatDistance(distance),'all recorded steps'],
          ['days','Movement days',String(movementCount),'last 7 days'],
          ['lifetime','Lifetime steps',fmt(totalSteps),'all recorded movement']
        ].map(([id,label,value,note])=><button key={id} type="button" onClick={()=>setSheet(id)} className="motion-tap" style={{position:'relative',textAlign:'left',font:'inherit',color:'inherit',padding:16,borderRadius:22,background:'var(--card)',border:'1px solid var(--line)',cursor:'pointer',minHeight:118}}><Icon name="chevron" size={16}/><span style={{position:'absolute',top:14,right:12,color:'var(--green)'}}><Icon name="chevron" size={16}/></span><small style={{display:'block',fontSize:12,fontWeight:700,color:'var(--ink-45)'}}>{label}</small><strong style={{display:'block',fontSize:26,margin:'8px 0 2px',letterSpacing:-.5}}>{value}</strong><em style={{fontStyle:'normal',fontSize:12,color:'var(--ink-45)'}}>{note}</em></button>)}
      </div>
    </section>

    {shareKind && <div style={{position:'fixed',inset:0,zIndex:80,background:'rgba(10,20,35,.55)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'16px'}} onClick={()=>setShareKind(null)}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:432,maxHeight:'90dvh',overflow:'auto',background:'var(--card)',borderRadius:28,padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><b style={{fontFamily:'Space Grotesk',fontSize:18}}>Share your streak</b><button type="button" onClick={()=>setShareKind(null)} style={{width:34,height:34,border:0,borderRadius:'50%',background:'var(--green-soft)',color:'var(--ink)',display:'grid',placeItems:'center'}}><Icon name="close"/></button></div>
        <canvas ref={canvasRef} style={{width:'100%',borderRadius:18,border:'1px solid var(--line)',display:'block'}}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}>{['feed','story'].map(size=><button key={size} type="button" onClick={async()=>{setShareSize(size);await drawShare(shareKind,size)}} style={{border:0,borderRadius:999,padding:12,fontWeight:800,background:shareSize===size?'var(--green)':'var(--green-soft)',color:shareSize===size?'#fff':'var(--ink)'}}>{size==='feed'?'Feed 4:5':'Story 9:16'}</button>)}</div>
        <button type="button" disabled={sharing} onClick={()=>share(shareKind)} style={{width:'100%',border:0,borderRadius:999,padding:13,marginTop:8,fontWeight:800;background:'var(--green)',color:'#fff'}}>{sharing?'Preparing…':'Share image'}</button>
      </div>
    </div>}

    {sheet && <div style={{position:'fixed',inset:0,zIndex:75,background:'rgba(10,20,35,.45)'}} onClick={()=>setSheet(null)}>
      <section role="dialog" aria-modal="true" aria-label={sheetTitle} onClick={e=>e.stopPropagation()} style={{position:'absolute',left:0,right:0,bottom:0,maxHeight:'86dvh',overflow:'auto',background:'var(--card)',borderRadius:'28px 28px 0 0',padding:'10px 20px calc(90px + env(safe-area-inset-bottom))'}}>
        <div style={{width:44,height:5,borderRadius:9,background:'var(--line)',margin:'0 auto 14px'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3 style={{fontFamily:'Space Grotesk',margin:0,fontSize:18}}>{sheetTitle}</h3><button type="button" onClick={()=>setSheet(null)} style={{border:0,background:'var(--green-soft)',width:34,height:34,borderRadius:'50%',color:'var(--ink)',display:'grid',placeItems:'center'}}><Icon name="close"/></button></div>
        {sheet==='today' && <div><div style={{fontSize:38,fontWeight:800,letterSpacing:-1,margin:'14px 0 2px'}}>{fmt(todaySteps)}</div><p style={{color:'var(--ink-45)',fontSize:13,margin:'0 0 10px'}}>of {fmt(goal)} daily goal</p><GoalRing value={todaySteps} goal={goal}/><div style={{marginTop:12,padding:12,borderRadius:14,background:'var(--paper)',color:'var(--ink-70)',fontSize:12}}>Daily steps are recorded as a total by the connected movement source, so the Hub does not invent hourly values.</div></div>}
        {sheet==='distance' && <div><div style={{fontSize:38,fontWeight:800,letterSpacing:-1,margin:'14px 0 2px'}}>{formatDistance(distance)}</div><p style={{color:'var(--ink-45)',fontSize:13,margin:'0 0 16px'}}>based on recorded steps</p><MiniBars values={week.map(d=>distanceFor(d.steps))} labels={week.map(d=>d.label)}/><div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:16}}><span style={{background:'var(--green-soft)',borderRadius:99,padding:'8px 14px',fontSize:13,fontWeight:700}}>{weeklyDistance.toFixed(1)} km this week</span><span style={{background:'var(--green-soft)',borderRadius:99,padding:'8px 14px',fontSize:13,fontWeight:700}}>≈ {(distance/42.195).toFixed(1)} marathons</span><span style={{background:'var(--green-soft)',borderRadius:99,padding:'8px 14px',fontSize:13,fontWeight:700}}>{(Math.ceil((distance+.01)/50)*50-distance).toFixed(1)} km to next 50 km</span></div></div>}
        {sheet==='days' && <div><div style={{fontSize:38,fontWeight:800,letterSpacing:-1,margin:'14px 0 2px'}}>{movementCount} of 7</div><p style={{color:'var(--ink-45)',fontSize:13,margin:'0 0 16px'}}>days with movement this week</p><MiniBars values={week.map(d=>d.steps)} labels={week.map(d=>d.label)}/><div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:16}}><span style={{background:'var(--green-soft)',borderRadius:99,padding:'8px 14px',fontSize:13,fontWeight:700}}>{Math.round((movementCount/7)*100)}% this week</span><span style={{background:'var(--green-soft)',borderRadius:99,padding:'8px 14px',fontSize:13,fontWeight:700}}>Longest streak: {best} days</span></div></div>}
        {sheet==='lifetime' && <div><div style={{fontSize:38,fontWeight:800,letterSpacing:-1,margin:'14px 0 2px'}}>{fmt(totalSteps)}</div><p style={{color:'var(--ink-45)',fontSize:13,margin:'0 0 16px'}}>all recorded movement</p>{[100000,250000,500000,1000000].map(m=><div key={m} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'10px 14px',borderRadius:14,marginBottom:10,background:totalSteps>=m?'var(--green-soft)':'var(--paper)',fontWeight:totalSteps>=m?800:600}}><span>{fmt(m)} steps</span><span>{totalSteps>=m?'✓':''}</span></div>)}</div>}
      </section>
    </div>}
  </>;
}
