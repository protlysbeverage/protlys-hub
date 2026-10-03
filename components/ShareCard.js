'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const LOOKS = {
  dark: { bg:'#232924', fg:'#FFFFFF', muted:'rgba(255,255,255,.62)', tint:'rgba(107,203,69,.12)', dim:'rgba(107,203,69,.28)', accent:'#6BCB45' },
  light: { bg:'#F7F8F6', fg:'#111111', muted:'rgba(17,17,17,.58)', tint:'rgba(79,159,53,.12)', dim:'rgba(79,159,53,.28)', accent:'#4F9F35' },
  surface: { bg:'#323A33', fg:'#FFFFFF', muted:'rgba(255,255,255,.62)', tint:'rgba(107,203,69,.12)', dim:'rgba(107,203,69,.28)', accent:'#6BCB45' },
};

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

function hexToRgba(hex, alpha) {
  const value = String(hex).replace('#','');
  const r = parseInt(value.slice(0,2),16);
  const g = parseInt(value.slice(2,4),16);
  const b = parseInt(value.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function ActivityHeatmap({ days = [], highlight = [], look = {} }) {
  const safeDays=Array.isArray(days)?days.slice(-35):[];
  const t={accent:look.accent||'#6BCB45',fg:look.fg||'#FFFFFF',muted:look.muted||'rgba(255,255,255,.62)',tint:look.tint||'rgba(107,203,69,.12)',dim:look.dim||'rgba(107,203,69,.28)'};
  const highlighted=new Set(Array.isArray(highlight)?highlight:[]);
  const weekdays=['S','M','T','W','T','F','S'];
  const parseDate=key=>{const [y,m,d]=String(key).split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12,0,0));};
  const range=safeDays.length?new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short'}).format(parseDate(safeDays[0].key))+' – '+new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short'}).format(parseDate(safeDays[safeDays.length-1].key)):'';
  return <div data-heatmap="true" style={{width:296,height:262,boxSizing:'border-box'}}>
    <div style={{height:14,fontSize:9,fontWeight:700,color:t.muted,lineHeight:'14px',marginBottom:5}}>{range}</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,38px)',columnGap:5,height:16,marginBottom:5}}>{weekdays.map((d,i)=><div key={i} style={{width:38,height:16,textAlign:'center',fontSize:8,fontWeight:800,color:t.muted,lineHeight:'16px'}}>{d}</div>)}</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,38px)',gridAutoRows:'38px',gap:5,width:296,height:210}}>
      {safeDays.map((day,index)=>{const logged=Boolean(day?.logged??day?.active),strong=highlighted.size===0||highlighted.has(day.key),future=Boolean(day?.future),background=logged?(strong?t.accent:t.dim):t.tint;return <div key={day.key||index} style={{width:38,height:38,boxSizing:'border-box',borderRadius:5,background,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:logged?'#111111':t.fg,fontSize:11,fontWeight:800,lineHeight:1,border:future?'1px dashed rgba(255,255,255,.35)':'0 solid transparent',outline:day?.today?'2px solid '+t.accent:'none',outlineOffset:day?.today?'2px':'0'}}>{(day?.monthChanged||index===0)&&<span style={{fontSize:7,fontWeight:800,lineHeight:'8px',marginBottom:2,color:logged?'rgba(17,17,17,.7)':t.muted}}>{day.monthLabel}</span>}<span>{day.day}</span></div>;})}
    </div>
  </div>;
}
function WeeklyBars({ days = [], distance = false, look }) {
  const safeDays=Array.isArray(days)?days.slice(-7):[];
  const max=Math.max(...safeDays.map(day=>Number(distance?day.distance:day.steps)||0),1);
  return <div style={{width:312,height:160,display:'flex',alignItems:'flex-end',justifyContent:'center',gap:8}}>
    {safeDays.map((day,index)=>{const value=Number(distance?day.distance:day.steps)||0,height=value?Math.max(8,Math.round(value/max*92)):4,label=new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',weekday:'short'}).format(new Date(day.key+'T12:00:00Z')).slice(0,1);return <div key={day.key||index} style={{width:36,height:160,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',gap:7}}><div style={{width:36,height,borderRadius:5,background:value?look.accent:look.tint,boxSizing:'border-box',boxShadow:day.isToday?'inset 0 0 0 2px '+look.fg:'none'}}/><span style={{fontSize:8,fontWeight:day.isToday?800:600,color:day.isToday?look.accent:look.muted}}>{label}</span></div>;})}
  </div>;
}
export default function ShareCard({metric='steps_today',data={},username='',look='dark',theme,qrDataUrl='',logoDataUrl='',showUsername=true}) {
  const LOOKS={dark:{bg:'#0D0F0E',fg:'#FFFFFF',muted:'rgba(255,255,255,.62)',tint:'rgba(107,203,69,.12)',dim:'rgba(107,203,69,.28)',accent:'#6BCB45'},light:{bg:'#F7F8F6',fg:'#111111',muted:'rgba(17,17,17,.58)',tint:'rgba(79,159,53,.12)',dim:'rgba(79,159,53,.28)',accent:'#4F9F35'},surface:{bg:'#151815',fg:'#FFFFFF',muted:'rgba(255,255,255,.62)',tint:'rgba(107,203,69,.12)',dim:'rgba(107,203,69,.28)',accent:'#6BCB45'}};
  const t=LOOKS[look||theme||'dark']||LOOKS.dark,visual=data.visual||{},headline=Array.isArray(data.headline)?data.headline:['PROGRESS',''],value=Number(data.number??data.value??0),numberText=data.unit==='km'?value.toFixed(1):value.toLocaleString(),usernameText=String(username||'protlys').replace(/^@/,'');
  const cardRef=useRef(null),[headlineSize,setHeadlineSize]=useState(76);
  useLayoutEffect(()=>{const node=cardRef.current;if(!node)return;const words=[...node.querySelectorAll('[data-headline-word]')];let size=76;if(words.some(el=>el.scrollWidth>312)){while(size>42){size-=1;words.forEach(el=>el.style.fontSize=size+'px');if(!words.some(el=>el.scrollWidth>312))break;}}setHeadlineSize(size);words.forEach(el=>el.style.fontSize='');},[headline[0],headline[1]]);
  useEffect(()=>{if(process.env.NODE_ENV!=='development')return;const node=cardRef.current;if(!node)return;const cr=node.getBoundingClientRect();node.querySelectorAll('*').forEach(child=>{const r=child.getBoundingClientRect();if(r.left<cr.left-1||r.top<cr.top-1||r.right>cr.right+1||r.bottom>cr.bottom+1)console.warn('[Protlys ShareCard] child overflow',child);});});
  const progress=Number(data.progress),hasProgress=Number.isFinite(progress)&&progress>=.4,p=Math.max(0,Math.min(1,progress));
  return <div ref={cardRef} data-protlys-share-card="true" style={{width:360,height:640,boxSizing:'border-box',position:'relative',overflow:'hidden',background:t.bg,color:t.fg,padding:24,display:'flex',flexDirection:'column',fontFamily:'Manrope,sans-serif',isolation:'isolate'}}>
    <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(circle at 100% 0%,rgba(107,203,69,.18),rgba(107,203,69,.05) 24%,transparent 52%)'}}/>
    <div style={{height:28,flex:'0 0 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><img src={logoDataUrl} alt="Protlys" style={{display:'block',height:28,width:78,objectFit:'contain',objectPosition:'left center'}}/><div style={{fontSize:11,fontWeight:700,color:t.muted,whiteSpace:'nowrap'}}>{new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric'}).format(new Date())}</div></div>
    <div style={{height:86,flex:'0 0 86px',marginTop:12,fontFamily:'Anton,Space Grotesk,sans-serif',fontSize:headlineSize,lineHeight:.82,fontWeight:900,letterSpacing:'-0.035em',textTransform:'uppercase',whiteSpace:'nowrap',overflow:'visible'}}><div data-headline-word="true">{headline[0]}</div><div data-headline-word="true" style={{color:t.dim}}>{headline[1]}</div></div>
    <div style={{height:262,flex:'0 0 262px',display:'flex',alignItems:'flex-start',justifyContent:'center',overflow:'visible'}}>{visual.type==='heatmap'?<ActivityHeatmap days={visual.days||data.heatmapDays||[]} highlight={visual.highlight||data.highlight||[]} look={t}/>:visual.type==='bars'?<WeeklyBars days={visual.days||data.weeklyDays||[]} distance={data.unit==='km'} look={t}/>:hasProgress?<div style={{width:150,height:150,borderRadius:'50%',background:'conic-gradient('+t.accent+' '+(p*360)+'deg, '+t.dim+' 0deg)',display:'grid',placeItems:'center'}}><div style={{width:126,height:126,borderRadius:'50%',background:t.bg,display:'grid',placeItems:'center'}}><span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:28,fontWeight:900,color:t.accent}}>{Math.round(p*100)}%</span></div></div>:<div style={{width:312,height:120,display:'grid',placeItems:'center'}}><div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:54,lineHeight:.9,fontWeight:900,color:t.accent}}>{numberText}</div></div>}</div>
    <div style={{height:188,flex:'0 0 188px',position:'relative',paddingTop:4,boxSizing:'border-box'}}>{showUsername&&<div style={{height:28,display:'flex',alignItems:'center',gap:10,fontSize:11,fontWeight:700,letterSpacing:'normal',color:t.fg,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}><div style={{width:28,height:28,flex:'0 0 28px',borderRadius:'50%',background:t.accent,color:'#111111',display:'grid',placeItems:'center',fontSize:11,fontWeight:900}}>{usernameText.slice(0,1).toUpperCase()}</div><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>@{usernameText}</span></div>}<div style={{display:'flex',alignItems:'baseline',gap:7,marginTop:7}}><span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:47,lineHeight:.9,fontWeight:900,letterSpacing:'-0.045em',whiteSpace:'nowrap'}}>{numberText}</span><span style={{fontSize:11,fontWeight:800,color:t.muted}}>{data.unit||''}</span></div><div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:13,fontWeight:800,lineHeight:1.05,marginTop:7,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{data.label||''}</div>{data.subtext&&<div style={{fontSize:9,color:t.muted,lineHeight:1.2,marginTop:5,maxWidth:230,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{data.subtext}</div>}<div style={{position:'absolute',right:0,bottom:18,width:68,height:68,padding:4,boxSizing:'border-box',background:'#FFFFFF',borderRadius:4}}>{qrDataUrl&&<img src={qrDataUrl} alt="" style={{display:'block',width:60,height:60,objectFit:'contain'}}/>}</div><div style={{position:'absolute',right:0,bottom:5,fontSize:7,color:t.muted,textAlign:'right',whiteSpace:'nowrap'}}>Scan to find your protein target</div></div>
  </div>;
}
