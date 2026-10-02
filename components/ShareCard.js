'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export const SHARE_METRICS=['protein_today','protein_target','steps_today','distance','movement_days','lifetime_steps','best_streak'];

const LOOKS={
  dark:{bg:'#232924',fg:'#FFFFFF',muted:'rgba(255,255,255,.60)',faded:'rgba(255,255,255,.20)',ring:'#6BCB45',logo:'/protlys-logo-dark.png'},
  light:{bg:'#F7F8F6',fg:'#111111',muted:'rgba(17,17,17,.56)',faded:'rgba(17,17,17,.20)',ring:'#4F9F35',logo:'/protlys-logo-exact.png'},
  surface:{bg:'#323A33',fg:'#FFFFFF',muted:'rgba(255,255,255,.60)',faded:'rgba(255,255,255,.20)',ring:'#6BCB45',logo:'/protlys-logo-dark.png'},
};

const HEADLINES={
  protein_today:['PROTEIN','TODAY'],
  protein_target:['PROTEIN','TARGET'],
  steps_today:['STEPS','TODAY'],
  distance:['MOVED','DISTANCE'],
  movement_days:['ACTIVE','DAYS'],
  lifetime_steps:['TOTAL','STEPS'],
  best_streak:['BEST','STREAK'],
};

const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));

function pluralDay(value){return Number(value)===1?'day':'days';}

function formatMetric(metric,value,unit){
  const n=Number(value);
  if(metric==='distance') return {value:Number.isFinite(n)?n.toFixed(1):'0.0',unit:'km'};
  if(metric==='movement_days'||metric==='best_streak') return {value:Number.isFinite(n)?Math.round(n).toLocaleString():'0',unit:pluralDay(n)};
  if(metric==='steps_today'||metric==='lifetime_steps') return {value:Number.isFinite(n)?Math.round(n).toLocaleString():'0',unit:unit||'steps'};
  if(metric==='protein_today'||metric==='protein_target') return {value:Number.isFinite(n)?Math.round(n).toLocaleString():'0',unit:unit||'g'};
  return {value:String(value ?? '0'),unit:unit||''};
}

function formatDate(){
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric'}).format(new Date()).toUpperCase();
}

export default function ShareCard({
  metric='steps_today',
  value='0',
  unit='',
  label='',
  subtext='',
  progress=0,
  username='',
  look='dark',
  theme,
  qrDataUrl='',
  logoDataUrl='',
}){
  const selectedLook=look||theme||'dark';
  const t=LOOKS[selectedLook]||LOOKS.dark;
  const headline=HEADLINES[metric]||['PROGRESS',''];
  const formatted=formatMetric(metric,value,unit);
  const headlineRef=useRef(null);
  const [headlineSize,setHeadlineSize]=useState(58);
  const [qr,setQr]=useState(qrDataUrl);
  const [logo,setLogo]=useState(logoDataUrl);
  const p=clamp(progress), radius=42, circumference=2*Math.PI*radius;

  useLayoutEffect(()=>{
    let cancelled=false;
    const fit=async()=>{
      if(document.fonts?.ready) await document.fonts.ready;
      if(cancelled||!headlineRef.current)return;
      let size=58;
      const node=headlineRef.current;
      node.style.fontSize=size+'px';
      while(size>28 && node.scrollWidth>node.clientWidth){
        size-=1;
        node.style.fontSize=size+'px';
      }
      if(!cancelled)setHeadlineSize(size);
    };
    fit();
    return()=>{cancelled=true};
  },[headline[0],headline[1]]);

  useLayoutEffect(()=>{
    if(logoDataUrl){setLogo(logoDataUrl);return}
    let cancelled=false;
    fetch(t.logo,{cache:'force-cache'})
      .then(r=>r.blob())
      .then(blob=>new Promise(resolve=>{
        const reader=new FileReader();
        reader.onloadend=()=>resolve(reader.result);
        reader.readAsDataURL(blob);
      }))
      .then(data=>{if(!cancelled)setLogo(data)})
      .catch(()=>{});
    return()=>{cancelled=true};
  },[t.logo,logoDataUrl]);

  useLayoutEffect(()=>{
    if(qrDataUrl){setQr(qrDataUrl);return}
    let cancelled=false;
    QRCode.toDataURL('https://hub.protlys.com/calculator?src=share-card',{margin:1,width:220,errorCorrectionLevel:'M',color:{dark:'#111111',light:'#FFFFFF'}})
      .then(data=>{if(!cancelled)setQr(data)}).catch(()=>{});
    return()=>{cancelled=true};
  },[qrDataUrl]);

  return <div data-protlys-share-card="true" data-look={selectedLook} style={{
    width:360,height:640,boxSizing:'border-box',background:t.bg,color:t.fg,padding:24,
    display:'flex',flexDirection:'column',fontFamily:'Manrope,sans-serif',overflow:'hidden',
  }}>
    <div style={{display:'flex',alignItems:'center',height:40}}>
      {logo ? <img src={logo} alt="Protlys" style={{display:'block',width:92,height:40,objectFit:'contain',objectPosition:'left center'}}/> : <div style={{width:92,height:40}}/>}
    </div>

    <div ref={headlineRef} style={{fontFamily:'Space Grotesk, sans-serif',fontSize:headlineSize,lineHeight:.82,letterSpacing:'-.045em',fontWeight:900,marginTop:28,textTransform:'uppercase',whiteSpace:'nowrap',overflow:'visible'}}>
      <div>{headline[0]}</div>
      <div style={{color:t.faded}}>{headline[1]}</div>
    </div>

    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:28}}>
      <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:10,fontWeight:700,letterSpacing:1.1,color:t.muted}}>
        @{String(username||'protlys').replace(/^@/,'')}
      </div>
      <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:9,fontWeight:700,letterSpacing:.7,color:t.muted}}>{formatDate()}</div>
    </div>

    <div style={{display:'grid',placeItems:'center',width:104,height:104,position:'relative',margin:'20px auto 0'}}>
      <svg viewBox="0 0 100 100" width="104" height="104" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke={t.faded} strokeWidth="7"/>
        <circle cx="50" cy="50" r={radius} fill="none" stroke={t.ring} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-p)} transform="rotate(-90 50 50)"/>
      </svg>
      <span style={{position:'absolute',fontFamily:'IBM Plex Mono, monospace',fontSize:14,fontWeight:800}}>{Math.round(p*100)}%</span>
    </div>

    <div style={{marginTop:20}}>
      <div style={{display:'flex',alignItems:'baseline',gap:8}}>
        <span style={{fontFamily:'Space Grotesk, sans-serif',fontSize:76,lineHeight:.88,fontWeight:900,letterSpacing:'-.05em'}}>{formatted.value}</span>
        {formatted.unit&&<span style={{fontFamily:'IBM Plex Mono, monospace',fontSize:14,fontWeight:700,color:t.muted}}>{formatted.unit}</span>}
      </div>
      <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,fontWeight:800,marginTop:9,textTransform:'uppercase'}}>{label}</div>
      {subtext&&<div style={{fontSize:11.5,lineHeight:1.4,color:t.muted,marginTop:6,maxWidth:285,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{subtext}</div>}
    </div>

    <div style={{marginTop:'auto',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
      <div style={{fontFamily:'IBM Plex Mono, monospace',fontSize:8.5,lineHeight:1.45,color:t.muted,maxWidth:155,textTransform:'uppercase',letterSpacing:.45}}>
        Track your progress.<br/>Calculate your protein target.
      </div>
      <div style={{width:76,height:76,padding:6,boxSizing:'border-box',background:'#FFFFFF',borderRadius:10,flex:'0 0 auto'}}>
        {qr&&<img src={qr} alt="" style={{display:'block',width:'100%',height:'100%'}}/>}
      </div>
    </div>
  </div>;
}