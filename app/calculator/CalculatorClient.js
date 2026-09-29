'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveTargetAction } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';
import TargetShareButton from './TargetShareButton';
import { PROTLYS_CALCULATOR_PRODUCTS } from '@/config/protlys-products';

const SEX = [
  { label: 'Male', v: 'male', icon:'male' },
  { label: 'Female', v: 'female', icon:'female' },
  { label: 'Prefer not to say', v: 'other', icon:'eye' },
];
const ACTIVITY = [
  { label: 'Sedentary', detail: 'Desk job, little exercise', v: 1.0, icon:'chair' },
  { label: 'Lightly active', detail: '1–2 days/week', v: 1.2, icon:'walk' },
  { label: 'Moderately active', detail: '3–4 days/week', v: 1.375, icon:'run' },
  { label: 'Very active', detail: '5–6 days/week', v: 1.55, icon:'bike' },
  { label: 'Athlete', detail: 'Twice daily / hard training', v: 1.725, icon:'trophy' },
];
const GOALS = [
  { id:'health', label:'General health', detail:'0.8g / kg body weight', v:0.8, icon:'heart' },
  { id:'maintain', label:'Maintain & stay active', detail:'1.2–1.4g / kg', v:1.2, icon:'run' },
  { id:'muscle', label:'Build muscle', detail:'1.6–2.0g / kg', v:1.6, icon:'barbell' },
  { id:'performance', label:'Athletic performance', detail:'1.8–2.2g / kg', v:1.8, icon:'medal' },
  { id:'lose', label:'Lose weight', detail:'1.2g / kg', v:1.2, icon:'down' },
];
function activityLabel(v){return ACTIVITY.find(a=>a.v===v)?.label?.toLowerCase()||'moderate';}

const ICONS={male:<><circle cx="10" cy="14" r="4"/><path d="m13 11 7-7m0 0h-5m5 0v5"/></>,female:<><circle cx="12" cy="9" r="4"/><path d="M12 13v8m-3-3h6"/></>,eye:<><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"/><path d="m3 3 18 18"/></>,chair:<><path d="M6 10V8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2"/><path d="M5 10h14a2 2 0 0 1 2 2v3H3v-3a2 2 0 0 1 2-2Z"/><path d="M5 15v3m14-3v3"/></>,walk:<><circle cx="13" cy="5" r="2"/><path d="m11 9 3 2 2 4m-5-6-2 4-3 3m5-3 3 5m-6-1-2 4"/></>,run:<><circle cx="15" cy="5" r="2"/><path d="m13 9 3 2 2 4m-5-6-3 4-4 1m6-1 3 4m-7 0-2 4"/></>,bike:<><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="m6 17 4-7 4 7m-4-7h4l2 7m-7-4h6"/></>,trophy:<><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4m-4 1v4m-4 3h8"/></>,heart:<path d="M20.8 8.7c0 5-8.8 10.3-8.8 10.3S3.2 13.7 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z"/>,barbell:<><path d="M4 9v6m3-8v10m10-10v10m3-8v6M7 12h10"/></>,medal:<><circle cx="12" cy="15" r="5"/><path d="m9 3 3 5 3-5M8 3l2 5m6-5-2 5"/></>,down:<><path d="m3 6 6 6 4-4 8 8"/><path d="M21 12v4h-4"/></>};
function OptionIcon({icon}){return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[icon]}</svg>;}
function StepProgress({step}){return <div style={{marginBottom:12}}><div className="calculator-step-progress-label">Step {step} of 4</div><div style={{height:4,background:'var(--ink-20)',borderRadius:999,overflow:'hidden'}}><div style={{height:'100%',width:`${step*25}%`,background:'var(--green)',borderRadius:999}}/></div></div>;}
function OptionGrid({items,value,onChange,getValue,height}){return <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:8}}>{items.map(i=>{const selected=value===getValue(i);return <button key={getValue(i)} type="button" onClick={()=>onChange(getValue(i))} aria-pressed={selected} style={{position:'relative',height,boxSizing:'border-box',padding:'14px 12px',borderRadius:14,border:selected?'1.5px solid var(--green)':'0.5px solid var(--line)',background:selected?'var(--green-soft)':'var(--white)',color:selected?'var(--green-dark)':'var(--ink)',textAlign:'left',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'flex-start',minWidth:0,cursor:'pointer'}}><span style={{height:20,color:'var(--ink-70)'}}><OptionIcon icon={i.icon}/></span><span style={{marginTop:9,fontSize:13,fontWeight:800,lineHeight:1.2,paddingRight:18}}>{i.label}</span>{i.detail&&<small style={{marginTop:4,fontSize:10.5,lineHeight:1.25,fontWeight:600,color:selected?'var(--green-dark)':'var(--ink-45)'}}>{i.detail}</small>}{selected&&<span style={{position:'absolute',top:9,right:9,width:18,height:18,borderRadius:'50%',background:'var(--green)',color:'var(--paper)',display:'grid',placeItems:'center',fontSize:12,fontWeight:900}}>✓</span>}</button>})}</div>;}


export default function CalculatorClient({ savedTarget, profile }) {
  const router = useRouter();
  const [weight,setWeight]=useState(70); const [sex,setSex]=useState('male'); const [activity,setActivity]=useState(1.375); const [goal,setGoal]=useState('maintain');
  const [result,setResult]=useState(null); const [displayTarget,setDisplayTarget]=useState(0); const [saved,setSaved]=useState(false); const [isPending,start]=useTransition();
  const [saveMessage,setSaveMessage]=useState('');
  const resultRef = useRef(null);

  useEffect(()=>{
    try{
      const src=new URLSearchParams(window.location.search).get('src');
      if(src) localStorage.setItem('src',src);
    }catch{}
  },[]);

  useEffect(()=>{
    if(!result)return;
    const finalValue=Number(result.target)||0;
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){ setDisplayTarget(finalValue); return; }
    let raf=0;
    const started=performance.now();
    const duration=800;
    const ease=t=>1-Math.pow(1-t,3);
    const tick=now=>{
      const progress=Math.min(1,(now-started)/duration);
      setDisplayTarget(Math.round(finalValue*ease(progress)));
      if(progress<1) raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[result]);

  useEffect(()=>{
    if(!result || !resultRef.current)return;
    requestAnimationFrame(()=>{
      resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  },[result]);

  function calculate(){
    const w=Number(weight); if(!w||w<20||w>300)return;
    const selected=GOALS.find(i=>i.id===goal)||GOALS[1]; const sexFactor=sex==='female'?0.92:sex==='other'?0.96:1;
    const target=Math.round(w*selected.v*sexFactor); const min=Math.round(w*.8); const max=Math.round(w*2.2); const pct=Math.min(100,Math.max(0,Math.round(((target-min)/(max-min))*100)));
    setResult({target,min,max,pct,goal:selected.v,activity,sex,weight:w}); setSaved(false);
  }

  async function saveTarget(targetG){
    const target = Math.min(500, Math.max(20, Math.round(Number(targetG))));
    if(!Number.isFinite(target)) return false;
    const response = await saveTargetAction({targetG:target, source:'calculator'});
    if(response?.error){
      setSaveMessage(response.error);
      return false;
    }
    setSaved(true);
    setSaveMessage('Saved!');
    return true;
  }

  useEffect(()=>{
    let cancelled=false;
    async function loadPendingTarget(){
      const supabase=createClient();
      const {data:{session}}=await supabase.auth.getSession();
      if(cancelled)return;
      if(!session)return;
      let pending=null;
      try{
        const raw=localStorage.getItem('pendingTarget');
        if(raw) pending=JSON.parse(raw);
      }catch{}
      const target=Number(pending?.target_g);
      if(!Number.isFinite(target))return;
      const clamped=Math.min(500,Math.max(20,Math.round(target)));
      const ok=await saveTarget(clamped);
      if(ok){
        try{localStorage.removeItem('pendingTarget');}catch{}
      }
    }
    loadPendingTarget();
    return()=>{cancelled=true;};
  },[]);

  const step={fontSize:14,fontWeight:900,letterSpacing:'.05em'};
  return <div className="screen-pad" style={{maxWidth:520,margin:'0 auto',paddingBottom:'calc(130px + env(safe-area-inset-bottom))'}}>
    <span className="eyebrow">Protlys</span><h1 style={{fontSize:26}}>Find your daily protein target</h1><p className="subhead">Get a clear number you can actually use. Takes about 30 seconds.</p>
    <section className="section-card" style={{marginTop:18}}><span className="field-label calculator-step-label" style={step}>STEP 1 — YOUR WEIGHT</span><div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}><input id="weight" type="number" min="30" max="250" value={weight} onChange={e=>setWeight(e.target.value)} className="field-input mono" style={{fontSize:28,fontWeight:700,flex:1}}/><span className="mono" style={{fontSize:18,opacity:.55}}>kg</span></div></section>
    <section className="section-card" style={{marginTop:14}}><StepProgress step={2}/><span className="field-label calculator-step-label" style={step}>STEP 2 — BIOLOGICAL SEX</span><OptionGrid items={SEX} value={sex} onChange={setSex} getValue={i=>i.v} height={112}/></section>
    <section className="section-card" style={{marginTop:14}}><StepProgress step={3}/><span className="field-label calculator-step-label" style={step}>STEP 3 — ACTIVITY LEVEL</span><OptionGrid items={ACTIVITY} value={activity} onChange={setActivity} getValue={i=>i.v} height={126}/></section>
    <section className="section-card" style={{marginTop:14}}><StepProgress step={4}/><span className="field-label calculator-step-label" style={step}>STEP 4 — YOUR GOAL</span><OptionGrid items={GOALS} value={goal} onChange={setGoal} getValue={i=>i.id} height={126}/></section>
    <button className="btn-secondary" style={{marginTop:18}} onClick={calculate}>Calculate my protein target →</button>
    {result&&<div ref={resultRef} style={{marginTop:26,scrollMarginTop:90}}><div className="hr-tight"/><section className="section-card" style={{marginTop:20,border:'2px solid var(--green, #2E9E5B)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><span className="eyebrow" style={{marginBottom:0}}>Your daily protein target</span><TargetShareButton target={result.target} activity={activityLabel(result.activity)} goal={GOALS.find(g=>g.id===goal)?.label} profile={profile}/></div><div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:6}}><span className="mono motion-count" style={{fontSize:52,fontWeight:700,lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{displayTarget}</span><span style={{fontSize:18,fontWeight:700,opacity:.5}}>g / day</span></div><p className="subhead" style={{margin:'8px 0 14px'}}>Based on your weight, activity and goal: {Number.isInteger(result.weight)?result.weight:result.weight.toFixed(1)}kg · {result.goal}g/kg · {activityLabel(result.activity)} activity.</p><div style={{height:8,background:'var(--line,rgba(15,42,74,.12))',borderRadius:999,overflow:'hidden'}}><div style={{height:'100%',width:`${result.pct}%`,background:'var(--green, #2E9E5B)',borderRadius:999}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:10,opacity:.55,marginTop:5}}><span>0.8g/kg</span><span>2.2g/kg</span></div></section>
      <button className="btn-secondary motion-tap" aria-live="polite" style={{marginTop:12,background:'var(--green)',borderColor:'var(--green)',color:'var(--paper)',width:'100%',minWidth:0}} onClick={()=>{
        if(!result||isPending||saved)return;
        start(async()=>{
          const supabase=createClient();
          const {data:{session}}=await supabase.auth.getSession();
          if(session){await saveTarget(result.target);return;}
          try{localStorage.setItem('pendingTarget',JSON.stringify({target_g:Math.min(500,Math.max(20,Math.round(result.target))),savedAt:Date.now()}));}catch{}
          setSaveMessage('Create a free account or sign in to save your target.');
          window.setTimeout(()=>router.push('/login?next=/calculator'),100);
        });
      }} disabled={isPending||saved}>{saved?<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>Saved</span>:isPending?'Saving…':'Save my protein target'}</button>
      {saveMessage&&<p className="subhead" style={{marginTop:9,color:saveMessage==='Saved!'?'var(--green-dark)':'var(--ink-70)',fontWeight:saveMessage==='Saved!'?700:600}}>{saveMessage}</p>}
      {PROTLYS_CALCULATOR_PRODUCTS.length>0&&<div style={{marginTop:14}}>
        <div style={{fontSize:11,fontWeight:800,color:'var(--ink-45)',textTransform:'uppercase',letterSpacing:'.08em'}}>Shop Protlys</div>
        <div className="row-scroll" style={{padding:'10px 0 3px',margin:0}}>
          {PROTLYS_CALCULATOR_PRODUCTS.slice(0,3).map(product=><a key={product.url} href={product.url} target="_blank" rel="noopener noreferrer" style={{minWidth:150,maxWidth:180,flex:'0 0 150px',textDecoration:'none',background:'var(--white)',border:'1px solid var(--line)',borderRadius:14,padding:10}}>
            <div style={{height:82,borderRadius:10,overflow:'hidden',background:'var(--green-soft)',marginBottom:8}}>{product.image&&<img src={product.image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>
            <div style={{fontSize:12,fontWeight:800,lineHeight:1.25}}>{product.title}</div>
          </a>)}
        </div>
      </div>}
      {saved&&<button className="btn-secondary" style={{marginTop:10}} onClick={()=>router.push('/account')}>Open Hub dashboard →</button>}
      <p className="disclaimer" style={{marginTop:14}}>This is a starting estimate, not medical advice. Speak with a registered dietitian for personalised guidance.</p></div>}
    {saved&&!result&&<section className="section-card" style={{marginTop:20,border:'2px solid var(--green)'}}><span className="eyebrow">Saved!</span><p className="subhead" style={{marginTop:6}}>Your protein target has been saved to your Hub.</p><button className="btn-secondary" style={{marginTop:12}} onClick={()=>router.push('/account')}>Open Hub dashboard →</button></section>}
    {savedTarget&&!result&&!saved&&<p className="disclaimer" style={{marginTop:14}}>Your current saved target: <strong className="mono">{savedTarget}g / day</strong></p>}
  </div>;
}
