'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export const SHARE_METRICS=['protein_today','protein_target','steps_today','distance','movement_days','lifetime_steps','best_streak'];

const LOOKS={
  dark:{bg:'#232924',fg:'#FFFFFF',muted:'rgba(255,255,255,.62)',faint:'rgba(255,255,255,.12)',faded:'rgba(255,255,255,.20)',accent:'#6BCB45',logo:'/protlys-logo-dark.png'},
  light:{bg:'#F7F8F6',fg:'#111111',muted:'rgba(17,17,17,.58)',faint:'rgba(17,17,17,.12)',faded:'rgba(17,17,17,.20)',accent:'#4F9F35',logo:'/protlys-logo-exact.png'},
  surface:{bg:'#323A33',fg:'#FFFFFF',muted:'rgba(255,255,255,.62)',faint:'rgba(255,255,255,.12)',faded:'rgba(255,255,255,.20)',accent:'#6BCB45',logo:'/protlys-logo-dark.png'},
};
const HEADLINES={
  protein_today:['PROTEIN','TODAY'],protein_target:['PROTEIN','TARGET'],steps_today:['STEPS','TODAY'],
  distance:['MOVED','DISTANCE'],movement_days:['ACTIVE','DAYS'],lifetime_steps:['TOTAL','STEPS'],best_streak:['BEST','STREAK']
};
const LABELS={
  protein_today:'protein consumed',protein_target:'daily target',steps_today:'steps recorded',
  distance:'distance moved',movement_days:'active days',lifetime_steps:'total movement',best_streak:'movement days in a row'
};
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
const dayWord=n=>Number(n)===1?'day':'days';

function formatMetric(metric,value,unit){
  const n=Number(value);
  if(metric==='distance')return{value:Number.isFinite(n)?n.toFixed(1):'0.0',unit:'km'};
  if(metric==='movement_days'||metric==='best_streak')return{value:Number.isFinite(n)?Math.round(n).toLocaleString():'0',unit:dayWord(n)};
  if(metric==='steps_today'||metric==='lifetime_steps')return{value:Number.isFinite(n)?Math.round(n).toLocaleString():'0',unit:unit||'steps'};
  if(metric==='protein_today'||metric==='protein_target')return{value:Number.isFinite(n)?Math.round(n).toLocaleString():'0',unit:unit||'g'};
  return{value:String(value??'0'),unit:unit||''};
}
function formatDate(date=new Date()){
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric'}).format(date);
}
function parseDateKey(key){
  const [y,m,d]=String(key).split('-').map(Number);
  return new Date(y,m-1,d,12);
}
function dateKey(date){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function buildHeatmap(heatmapDays,highlightBestRun){
  const rows=(heatmapDays||[]).map(row=>{
    const key=typeof row==='string'?row:row?.step_date||row?.key||row?.date;
    return key?dateKey(parseDateKey(key)):null;
  }).filter(Boolean);
  if(!rows.length)return{cells:[],monthLabel:'',best:new Set()};
  const logged=new Set(rows);
  const first=parseDateKey(rows.slice().sort()[0]);
  const year=first.getFullYear(),month=first.getMonth(),last=new Date(year,month+1,0),start=new Date(year,month,1);
  const cells=[];
  for(let i=0;i<start.getDay();i+=1)cells.push(null);
  for(let d=1;d<=last.getDate();d+=1){
    const key=dateKey(new Date(year,month,d,12));
    cells.push({day:d,key,active:logged.has(key)});
  }
  const active=[...logged].filter(k=>{const d=parseDateKey(k);return d.getFullYear()===year&&d.getMonth()===month;}).sort();
  const best=new Set();
  if(highlightBestRun&&active.length){
    let run=[active[0]],bestRun=[active[0]];
    for(let i=1;i<active.length;i+=1){
      const diff=Math.round((parseDateKey(active[i])-parseDateKey(active[i-1]))/86400000);
      run=diff===1?[...run,active[i]]:[active[i]];
      if(run.length>bestRun.length)bestRun=run;
    }
    bestRun.forEach(k=>best.add(k));
  }
  return{cells,monthLabel:new Intl.DateTimeFormat('en-KE',{month:'long',year:'numeric'}).format(start),best};
}

export default function ShareCard({
  metric='steps_today',value='0',unit='',label='',subtext='',progress=0,username='',
  look='dark',theme,qrDataUrl='',logoDataUrl='',showUsername=true,heatmapDays=[],highlightBestRun=false
}){
  const selectedLook=look||theme||'dark';
  const t=LOOKS[selectedLook]||LOOKS.dark;
  const headline=HEADLINES[metric]||['PROGRESS',''];
  const formatted=formatMetric(metric,value,unit);
  const p=clamp(progress);
  const showRing=['protein_today','protein_target','steps_today','distance'].includes(metric)&&p>=.4;
  const heatmap=(metric==='movement_days'||metric==='best_streak')?buildHeatmap(heatmapDays,highlightBestRun):null;
  const [headlineSize,setHeadlineSize]=useState(58),[logo,setLogo]=useState(logoDataUrl),[qr,setQr]=useState(qrDataUrl);
  const headlineRef=useRef(null),logoRef=useRef(null);
  const radius=42,circumference=2*Math.PI*radius;

  useLayoutEffect(()=>{
    let cancelled=false;
    (async()=>{
      if(document.fonts?.ready)await document.fonts.ready;
      const node=headlineRef.current;if(!node||cancelled)return;
      const maxWidth=node.clientWidth,lines=[...node.querySelectorAll('[data-headline-line]')];
      let size=58;
      while(size>26){node.style.fontSize=size+'px';if(lines.every(line=>line.scrollWidth<=maxWidth+1))break;size-=1;}
      if(!cancelled)setHeadlineSize(size);
    })();
    return()=>{cancelled=true};
  },[headline[0],headline[1]]);

  useLayoutEffect(()=>{
    let cancelled=false;
    if(logoDataUrl){setLogo(logoDataUrl);return()=>{cancelled=true};}
    fetch(t.logo,{cache:'force-cache'}).then(r=>r.blob()).then(blob=>new Promise(resolve=>{
      const reader=new FileReader();reader.onloadend=()=>resolve(reader.result);reader.readAsDataURL(blob);
    })).then(data=>{if(!cancelled)setLogo(data)}).catch(()=>{});
    return()=>{cancelled=true};
  },[t.logo,logoDataUrl]);

  useLayoutEffect(()=>{
    let cancelled=false;
    if(qrDataUrl){setQr(qrDataUrl);return()=>{cancelled=true};}
    QRCode.toDataURL('https://hub.protlys.com/calculator?src=share-card',{margin:1,width:220,errorCorrectionLevel:'M',color:{dark:'#111111',light:'#FFFFFF'}})
      .then(data=>{if(!cancelled)setQr(data)}).catch(()=>{});
    return()=>{cancelled=true};
  },[qrDataUrl]);

  useLayoutEffect(()=>{const img=logoRef.current;if(img?.decode)img.decode().catch(()=>{});},[logo]);

  const positiveLead=metric==='best_streak'
    ? 'Best streak '+formatted.value+' '+formatted.unit
    : metric==='lifetime_steps' ? formatted.value+' '+formatted.unit+' lifetime' : null;

  return <div data-protlys-share-card="true" data-look={selectedLook} style={{
    width:'100%',aspectRatio:'9 / 16',boxSizing:'border-box',position:'relative',overflow:'hidden',
    background:t.bg,color:t.fg,padding:'6.8% 7.1%',display:'flex',flexDirection:'column',
    fontFamily:'Manrope,sans-serif',isolation:'isolate'
  }}>
    {(selectedLook==='dark'||selectedLook==='surface')&&<div aria-hidden="true" style={{position:'absolute',inset:0,zIndex:-1,pointerEvents:'none',background:'radial-gradient(circle at 100% 0%, rgba(107,203,69,.25) 0%, rgba(107,203,69,.08) 24%, transparent 52%)'}}/>}

    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:'9.2%',flex:'0 0 auto'}}>
      <img ref={logoRef} src={logo||t.logo} alt="Protlys" style={{display:'block',height:'100%',minHeight:28,width:'28%',maxWidth:102,objectFit:'contain',objectPosition:'left center'}}/>
      <div style={{fontFamily:'Manrope,sans-serif',fontSize:'3.0%',fontWeight:700,color:t.muted,whiteSpace:'nowrap'}}>{formatDate()}</div>
    </div>

    <div ref={headlineRef} style={{width:'100%',marginTop:'5.4%',fontFamily:'Space Grotesk,sans-serif',fontSize:headlineSize,lineHeight:.82,letterSpacing:'-.055em',fontWeight:900,textTransform:'uppercase',whiteSpace:'nowrap',overflow:'visible',flex:'0 0 auto'}}>
      <div data-headline-line>{headline[0]}</div><div data-headline-line style={{color:t.faded}}>{headline[1]}</div>
    </div>

    <div style={{flex:'1 1 auto',minHeight:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'4% 0 2%'}}>
      {heatmap ? <div style={{width:'100%',maxWidth:'86%'}}>
        <div style={{fontFamily:'Manrope,sans-serif',fontSize:'2.7%',fontWeight:700,color:t.muted,textAlign:'center',marginBottom:'3.5%'}}>{heatmap.monthLabel}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2.2%'}}>
          {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{fontFamily:'Manrope,sans-serif',fontSize:'2.4%',fontWeight:800,color:t.muted,textAlign:'center'}}>{d}</div>)}
          {heatmap.cells.map((cell,i)=>cell?<div key={cell.key} style={{aspectRatio:'1',borderRadius:'16%',background:cell.active?t.accent:t.faint,boxShadow:cell.best&&highlightBestRun?'inset 0 0 0 2px '+t.fg:'none',display:'grid',placeItems:'center',fontFamily:'Manrope,sans-serif',fontSize:'2.7%',fontWeight:800,color:cell.active?t.bg:t.muted}}>{cell.day}</div>:<div key={'blank-'+i}/>)}
        </div>
        {highlightBestRun&&positiveLead&&<div style={{marginTop:'4%',textAlign:'center',fontFamily:'Manrope,sans-serif',fontSize:'3.2%',fontWeight:800,color:t.accent}}>{positiveLead}</div>}
      </div> : showRing ? <div style={{position:'relative',width:'36%',maxWidth:150,aspectRatio:'1'}}>
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true"><circle cx="50" cy="50" r={radius} fill="none" stroke={t.faded} strokeWidth="7"/><circle cx="50" cy="50" r={radius} fill="none" stroke={t.accent} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference*(1-p)} transform="rotate(-90 50 50)"/></svg>
        <span style={{position:'absolute',inset:0,display:'grid',placeItems:'center',fontFamily:'Space Grotesk,sans-serif',fontSize:'6%',fontWeight:900}}>{Math.round(p*100)}%</span>
      </div> : positiveLead ? <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'6.5%',fontWeight:900,letterSpacing:'-.03em',textAlign:'center',color:t.accent}}>{positiveLead}</div> : <div style={{fontFamily:'Manrope,sans-serif',fontSize:'3.1%',fontWeight:700,color:t.muted,textAlign:'center'}}>Keep building your progress.</div>}
    </div>

    <div style={{flex:'0 0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:'2.6%',minHeight:'7.2%'}}>
        <div style={{width:'7.5%',aspectRatio:'1',borderRadius:'50%',background:t.accent,color:t.bg,display:'grid',placeItems:'center',fontFamily:'Manrope,sans-serif',fontSize:'3.4%',fontWeight:900,textTransform:'uppercase'}}>{String(username||'P').replace(/^@/,'').slice(0,1)}</div>
        {showUsername&&<div style={{fontFamily:'Manrope,sans-serif',fontSize:'3.3%',fontWeight:700,color:t.fg,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>@{String(username||'protlys').replace(/^@/,'')}</div>}
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:'2%',marginTop:'4.5%'}}><span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'13.5%',lineHeight:.88,fontWeight:900,letterSpacing:'-.055em',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>{formatted.value}</span>{formatted.unit&&<span style={{fontFamily:'Manrope,sans-serif',fontSize:'3.4%',fontWeight:800,color:t.muted,whiteSpace:'nowrap'}}>{formatted.unit}</span>}</div>
      <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'3.6%',lineHeight:1.05,fontWeight:800,marginTop:'2.4%',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{LABELS[metric]||label||'progress'}</div>
      {subtext&&<div style={{fontFamily:'Manrope,sans-serif',fontSize:'2.9%',lineHeight:1.2,fontWeight:600,color:t.muted,marginTop:'1.7%',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{subtext}</div>}
      <div style={{display:'flex',justifyContent:'flex-end',alignItems:'flex-end',marginTop:'4.2%'}}><div style={{width:'21%',aspectRatio:'1',padding:'1.7%',boxSizing:'border-box',background:'#FFFFFF',borderRadius:'4%',flex:'0 0 auto'}}>{qr&&<img src={qr} alt="" style={{display:'block',width:'100%',height:'100%'}}/>}</div></div>
      <div style={{fontFamily:'Manrope,sans-serif',fontSize:'2.35%',lineHeight:1.15,fontWeight:700,color:t.muted,marginTop:'1.6%',textAlign:'right',whiteSpace:'nowrap'}}>Scan to find your protein target</div>
    </div>
  </div>;
}
