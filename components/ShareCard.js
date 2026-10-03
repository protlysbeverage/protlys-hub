'use client';

import { useEffect, useRef, useState } from 'react';

const LOOKS = {
  dark: { bg:'#232924', text:'#FFFFFF', muted:'rgba(255,255,255,.62)', accent:'#6BCB45', tint:'rgba(107,203,69,.12)', dim:'rgba(107,203,69,.28)', future:'rgba(255,255,255,.35)', glow:true },
  light:{ bg:'#F7F8F6', text:'#111111', muted:'rgba(17,17,17,.58)', accent:'#4F9F35', tint:'rgba(79,159,53,.12)', dim:'rgba(79,159,53,.28)', future:'rgba(17,17,17,.35)', glow:false },
  surface:{ bg:'#323A33', text:'#FFFFFF', muted:'rgba(255,255,255,.62)', accent:'#6BCB45', tint:'rgba(107,203,69,.12)', dim:'rgba(107,203,69,.28)', future:'rgba(255,255,255,.35)', glow:true },
};

const TYPE_BY_METRIC={steps_today:'steps',this_week:'steps',distance:'dist',movement_days:'days',current_streak:'cstreak',best_streak:'streak',movement_calendar:'cal',lifetime_steps:'life',protein_today:'ptoday',protein_target:'ptarget'};\n\nconst COPY = {
  streak:{headline:['BEST','STREAK'],label:'days in a row',subtext:'Your longest recorded movement streak.'},
  cstreak:{headline:['CURRENT','STREAK'],label:'days in a row',subtext:'Your current movement streak.'},
  ptarget:{headline:['PROTEIN','TARGET'],label:'grams per day',subtext:'Your daily target across 4 meals.'},
  ptoday:{headline:['PROTEIN','TODAY'],label:'grams today',subtext:'Protein logged toward your daily target.'},
  cal:{headline:['MOVEMENT','CALENDAR'],label:'movement days',subtext:'Your movement across the month shown.'},
  days:{headline:['ACTIVE','DAYS'],label:'movement days',subtext:'Your logged movement in the displayed range.'},
  steps:{headline:['STEPS','THIS WEEK'],label:'steps this week',subtext:'Your total recorded steps this week.'},
  dist:{headline:['DISTANCE','THIS WEEK'],label:'kilometres this week',subtext:'Estimated distance from recorded steps.'},
  life:{headline:['TOTAL','STEPS'],label:'lifetime steps',subtext:'All recorded movement so far.'},
  chal:{headline:['CHALLENGE','PROGRESS'],label:'members',subtext:'Scan to join the challenge.'},
};

function dateFromKey(key){
  const [y,m,d]=String(key).split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d,12));
}
function formatDate(){
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric'}).format(new Date());
}
function formatRange(days){
  if(!days?.length)return '';
  const f=new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',day:'numeric',month:'short'});
  return f.format(dateFromKey(days[0].key))+' – '+f.format(dateFromKey(days[days.length-1].key));
}
function fitHeadline(node){
  if(!node)return;
  const lines=[...node.querySelectorAll('[data-headline-line]')];
  let size=76;
  while(size>40 && lines.some(line=>line.scrollWidth>line.clientWidth+1)){size-=2;lines.forEach(line=>line.style.fontSize=size+'px');}
  lines.forEach(line=>line.style.fontSize=size+'px');
}
function useHeadlineFit(){
  const ref=useRef(null);
  useEffect(()=>{
    let cancelled=false;
    const run=()=>{if(!cancelled)fitHeadline(ref.current);};
    run();
    if(document.fonts?.ready)document.fonts.ready.then(run).catch(()=>{});
    window.requestAnimationFrame(run);
    return()=>{cancelled=true;};
  },[]);
  return ref;
}

function Heatmap({days=[],highlight=[],look,monthGrid=false}){
  const highlighted=new Set(highlight||[]);
  if(monthGrid){
    const cells=Array.isArray(days)?days:[];
    return <div style={{width:296,height:262,display:'grid',gridTemplateColumns:'repeat(7,38px)',gridAutoRows:'38px',gap:5}}>
      {['S','M','T','W','T','F','S'].map((d,i)=><div key={'w'+i} style={{height:38,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:look.muted}}>{d}</div>)}
      {cells.map((day,i)=>day?.key ? <div key={day.key} style={{width:38,height:38,borderRadius:5,background:day.logged?look.accent:look.tint,color:day.logged?'#111111':look.text,border:day.future?'1px dashed '+look.future:'none',outline:day.today?'2px solid '+look.accent:'none',outlineOffset:day.today?2:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,position:'relative'}}>{day.day}{day.day===1&&<span style={{position:'absolute',top:3,left:4,fontSize:7,color:day.logged?'rgba(17,17,17,.7)':look.muted}}>{day.monthLabel}</span>}</div>:<div key={'b'+i} />)}
    </div>;
  }
  const cells=(days||[]).slice(-35);
  return <div style={{width:296,height:262}}>
    <div style={{height:14,lineHeight:'14px',marginBottom:5,fontSize:9,fontWeight:700,color:look.muted}}>{formatRange(cells)}</div>
    <div style={{width:296,height:16,marginBottom:5,display:'grid',gridTemplateColumns:'repeat(7,38px)',columnGap:5}}>
      {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{width:38,height:16,textAlign:'center',fontSize:8,fontWeight:800,lineHeight:'16px',color:look.muted}}>{d}</div>)}
    </div>
    <div style={{width:296,height:210,display:'grid',gridTemplateColumns:'repeat(7,38px)',gridTemplateRows:'repeat(5,38px)',columnGap:5,rowGap:5}}>
      {cells.map((day,i)=>{
        const logged=Boolean(day?.logged??day?.active), future=Boolean(day?.future), strong=highlighted.size===0||highlighted.has(day.key);
        return <div key={day?.key||i} style={{width:38,height:38,borderRadius:5,background:logged?(strong?look.accent:look.dim):look.tint,color:logged?'#111111':look.text,border:future?'1px dashed '+look.future:'none',outline:day?.today?'2px solid '+look.accent:'none',outlineOffset:day?.today?2:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,position:'relative'}}>
          {(day?.monthChanged||i===0)&&<span style={{position:'absolute',top:4,left:4,fontSize:7,fontWeight:800,color:logged?'rgba(17,17,17,.7)':look.muted}}>{day.monthLabel}</span>}
          <span>{day?.day}</span>
        </div>;
      })}
    </div>
  </div>;
}

function WeeklyBars({days=[],distance=false,look}){
  const safe=(days||[]).slice(-7);
  const values=safe.map(d=>Number(distance?d.distance:d.steps)||0);
  const max=Math.max(...values,1);
  const best=Math.max(...values,0);
  return <div style={{width:312,height:262,display:'flex',alignItems:'flex-end',justifyContent:'center',gap:6,paddingBottom:18,boxSizing:'border-box'}}>
    {safe.map((day,i)=>{
      const value=values[i], h=value?Math.max(8,Math.round(value/max*108)):4;
      return <div key={day?.key||i} style={{width:36,height:220,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',gap:5}}>
        <span style={{fontSize:8,fontWeight:800,color:look.text,whiteSpace:'nowrap'}}>{distance?value.toFixed(1):value.toLocaleString()}</span>
        <div style={{width:36,height:h,borderRadius:5,background:value===best&&best>0?look.accent:look.dim,border:day?.isToday?'2px solid '+look.text:'none',boxSizing:'border-box'}}/>
        <span style={{fontSize:8,fontWeight:day?.isToday?800:600,color:day?.isToday?look.accent:look.muted}}>{new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',weekday:'short'}).format(dateFromKey(day.key)).slice(0,1)}</span>
      </div>;
    })}
  </div>;
}

function ProteinRing({value,target,look}){
  const safeTarget=Math.max(Number(target)||0,1), p=Math.max(0,Math.min(1,Number(value||0)/safeTarget));
  const ticks=Array.from({length:40},(_,i)=>i);
  return <div style={{width:256,height:256,position:'relative'}}>
    <svg viewBox="0 0 256 256" width="256" height="256" aria-hidden="true">
      {ticks.map(i=>{const a=(i/40)*360-90;const r1=106,r2=124;const rad=a*Math.PI/180;return <line key={i} x1={128+Math.cos(rad)*r1} y1={128+Math.sin(rad)*r1} x2={128+Math.cos(rad)*r2} y2={128+Math.sin(rad)*r2} stroke={i/40<p?look.accent:look.dim} strokeWidth="7" strokeLinecap="round"/>;})}
    </svg>
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 50px',boxSizing:'border-box',textAlign:'center'}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'center',gap:10,color:look.text}}><span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:64,lineHeight:.9,fontWeight:900}}>{Math.round(Number(value)||0)}</span><span style={{fontSize:24,fontWeight:800}}>g</span></div>
      <div style={{height:10,flex:'0 0 10px'}}/>
      <div style={{fontSize:12,fontWeight:700,color:look.muted,whiteSpace:'nowrap'}}>of {Math.round(safeTarget)} g target</div>
    </div>
  </div>;
}

function StreakVisual({current,best,look,type}){
  const total=Math.min(14,Math.max(Number(best)||0,Number(current)||0));
  const filled=type==='current'?Math.min(total,Number(current)||0):total;
  return <div style={{width:312,height:262,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxSizing:'border-box'}}>
    <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:200,lineHeight:.78,fontWeight:900,color:look.accent,letterSpacing:'-.07em'}}>{Number(type==='current'?current:best)||0}</div>
    <div style={{fontSize:14,fontWeight:800,color:look.text,marginTop:12}}>days in a row</div>
    <div style={{display:'flex',gap:4,marginTop:18,alignItems:'center',maxWidth:300,flexWrap:'nowrap'}}>
      {Array.from({length:total},(_,i)=><div key={i} style={{width:17,height:10,borderRadius:3,background:i<filled?look.accent:look.dim,boxSizing:'border-box'}}/>)}
    </div>
  </div>;
}

function TargetVisual({target,look}){
  const meal=Math.round((Number(target)||0)/4);
  return <div style={{width:312,height:262,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
    <div style={{display:'flex',alignItems:'baseline',gap:10,color:look.text}}><span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:92,lineHeight:.82,fontWeight:900}}>{Math.round(Number(target)||0)}</span><span style={{fontSize:22,fontWeight:800}}>g /day</span></div>
    <div style={{display:'flex',gap:8,marginTop:26}}>{[0,1,2,3].map(i=><div key={i} style={{width:64,height:10,borderRadius:5,background:look.accent}}/>)}</div>
    <div style={{fontSize:11,fontWeight:700,color:look.muted,marginTop:13}}>About {meal} g per meal across 4 meals</div>
  </div>;
}

function LifetimeVisual({value,look}){
  const n=Number(value)||0, milestones=[50000,100000,150000,250000,500000,1000000], next=milestones.find(x=>x>n)||1000000, prev=milestones[milestones.indexOf(next)-1]||0, pct=Math.max(0,Math.min(1,(n-prev)/(next-prev||1)));
  const km=(n*.00075).toFixed(1);
  return <div style={{width:312,height:262,display:'flex',flexDirection:'column',justifyContent:'center'}}>
    <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:76,lineHeight:.9,fontWeight:900,color:look.text}}>{n.toLocaleString()}</div>
    <div style={{fontSize:12,fontWeight:800,color:look.muted,marginTop:7}}>steps</div>
    <div style={{height:10,background:look.dim,borderRadius:5,marginTop:28,position:'relative'}}><div style={{height:10,width:Math.round(pct*100)+'%',background:look.accent,borderRadius:5}}/><div style={{position:'absolute',left:Math.round(pct*100)+'%',top:-5,width:20,height:20,borderRadius:10,background:look.accent,transform:'translateX(-50%)'}}/></div>
    <div style={{display:'flex',gap:8,marginTop:14}}><div style={{padding:'7px 10px',borderRadius:8,background:look.tint,fontSize:10,fontWeight:800,color:look.text}}>{km} km</div><div style={{padding:'7px 10px',borderRadius:8,background:look.tint,fontSize:10,fontWeight:800,color:look.text}}>{Math.max(0,next-n).toLocaleString()} to {next>=1000000?'1M':next/1000+'K'}</div></div>
  </div>;
}

export default function ShareCard({type='steps',metric,type:metricAlias,data={},username='',avatarUrl='',look='dark',qrDataUrl='',logoDataUrl='',showUsername=true}){
  const requestedType=type||metricAlias||data.cardType||data.metric||'steps';\n  const cardType=TYPE_BY_METRIC[requestedType]||requestedType||'steps';
  const palette=LOOKS[look]||LOOKS.dark;
  const copy=COPY[cardType]||COPY.steps;
  const headline=Array.isArray(data.headline)?data.headline:copy.headline;
  const headlineRef=useHeadlineFit();
  const number=Number(data.number??data.value??0);
  const unit=data.unit||'';
  const current=Number(data.currentStreak??data.current??0);
  const best=Number(data.bestStreak??data.best??current);
  const visual=data.visual||{};
  const challenge=data.challenge||{};
  return <div data-protlys-share-card="true" style={{width:360,height:640,boxSizing:'border-box',position:'relative',overflow:'hidden',background:palette.bg,color:palette.text,padding:24,display:'flex',flexDirection:'column',fontFamily:'Manrope,sans-serif',isolation:'isolate'}}>
    {palette.glow&&<><div style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(circle at 100% 0%,rgba(107,203,69,.18),rgba(107,203,69,.05) 24%,transparent 52%)'}}/><div style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(circle at 0% 100%,rgba(107,203,69,.12),transparent 48%)'}}/></>}
    <div style={{height:28,flex:'0 0 28px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',zIndex:1}}>
      <img src={logoDataUrl} alt="Protlys" style={{display:'block',width:90,height:28,objectFit:'contain',objectPosition:'left center'}}/>
      <div style={{fontSize:11,fontWeight:700,color:palette.muted,whiteSpace:'nowrap'}}>{formatDate()}</div>
    </div>
    <div ref={headlineRef} style={{height:128,flex:'0 0 128px',marginTop:12,fontFamily:'Anton,Space Grotesk,sans-serif',fontWeight:900,letterSpacing:'-.035em',textTransform:'uppercase',overflow:'visible',width:312}}>
      <div data-headline-line style={{fontSize:76,lineHeight:.82,whiteSpace:'nowrap',overflow:'visible'}}>{headline[0]}</div>
      <div data-headline-line style={{fontSize:76,lineHeight:.82,whiteSpace:'nowrap',overflow:'visible',color:palette.text,opacity:.2}}>{headline[1]}</div>
    </div>
    <div style={{height:262,flex:'0 0 262px',display:'flex',alignItems:'flex-start',justifyContent:'center',overflow:'visible',position:'relative',zIndex:1}}>
      {cardType==='streak'||cardType==='cstreak'?<StreakVisual current={current} best={best} look={palette} type={cardType==='cstreak'?'current':'best'}/>:cardType==='ptoday'?<ProteinRing value={number} target={data.target||data.proteinTarget} look={palette}/>:cardType==='ptarget'?<TargetVisual target={number} look={palette}/>:cardType==='cal'?<Heatmap days={visual.days||data.calendarDays||[]} highlight={[]} look={palette} monthGrid/>:cardType==='days'?<Heatmap days={visual.days||data.heatmapDays||[]} highlight={visual.highlight||data.highlight||[]} look={palette}/>:cardType==='steps'||cardType==='dist'?<WeeklyBars days={visual.days||data.weeklyDays||[]} distance={cardType==='dist'} look={palette}/>:cardType==='life'?<LifetimeVisual value={number} look={palette}/>:cardType==='chal'?<div style={{width:312,height:262,display:'flex',flexDirection:'column',justifyContent:'center'}}><div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:72,fontWeight:900,lineHeight:.9}}>{Number(challenge.members??number).toLocaleString()}</div><div style={{fontSize:14,fontWeight:800,marginTop:8}}>members</div><div style={{height:10,borderRadius:5,background:palette.dim,marginTop:26}}><div style={{height:10,width:Math.min(100,Math.max(0,Number(challenge.progress||0)/Math.max(1,Number(challenge.goal||1))*100))+'%',borderRadius:5,background:palette.accent}}/></div><div style={{marginTop:16,display:'inline-flex',alignSelf:'flex-start',padding:'7px 12px',borderRadius:999,background:palette.accent,color:'#111111',fontSize:11,fontWeight:900}}>I'm in</div></div>:<div style={{width:312,height:262,display:'grid',placeItems:'center',fontSize:54,fontWeight:900,color:palette.accent}}>{number.toLocaleString()}</div>}
    </div>
    <div style={{height:174,flex:'0 0 174px',position:'relative',paddingTop:4,boxSizing:'border-box',zIndex:1}}>
      {showUsername&&<div style={{height:28,display:'flex',alignItems:'center',gap:10,fontSize:11,fontWeight:700,letterSpacing:'normal',color:palette.text,whiteSpace:'nowrap'}}>
        <div style={{width:28,height:28,flex:'0 0 28px',borderRadius:14,overflow:'hidden',background:palette.accent,color:'#111111',display:'grid',placeItems:'center',fontSize:11,fontWeight:900}}>{avatarUrl?<img src={avatarUrl} alt="" style={{display:'block',width:28,height:28,objectFit:'cover'}}/>:String(username||'protlys').replace(/^@/,'').slice(0,1).toUpperCase()}</div>
        <span>@{String(username||'protlys').replace(/^@/,'')}</span>
      </div>}
      <div style={{display:'flex',alignItems:'baseline',gap:7,marginTop:7}}>
        <span style={{fontFamily:'Space Grotesk,sans-serif',fontSize:47,lineHeight:.9,fontWeight:900,letterSpacing:'-.045em',whiteSpace:'nowrap'}}>{number.toLocaleString()}</span>
        <span style={{fontSize:11,fontWeight:800,color:palette.muted}}>{unit}</span>
      </div>
      <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:13,fontWeight:800,lineHeight:1.05,marginTop:7,whiteSpace:'nowrap'}}>{data.label||copy.label}</div>
      <div style={{fontSize:9,color:palette.muted,lineHeight:1.2,marginTop:5,maxWidth:230,whiteSpace:'nowrap'}}>{data.subtext||copy.subtext}</div>
      {cardType==='chal'&&<div style={{position:'absolute',right:0,bottom:14,fontSize:7,color:palette.muted,textAlign:'right'}}>Scan to join the challenge</div>}
      <div style={{position:'absolute',right:0,bottom:24,width:68,height:68,padding:4,boxSizing:'border-box',background:'#FFFFFF',borderRadius:4}}>{qrDataUrl&&<img src={qrDataUrl} alt="" style={{display:'block',width:60,height:60,objectFit:'contain'}}/>}</div>
      {cardType!=='chal'&&<div style={{position:'absolute',right:0,bottom:10,fontSize:7,color:palette.muted,textAlign:'right',whiteSpace:'nowrap'}}>Scan to find your protein target</div>}
    </div>
  </div>;
}
