'use client';

import { useState, useTransition } from 'react';
import { saveTargetAction } from '@/app/actions';

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
function StepProgress({step}){return <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:900,letterSpacing:'.05em',color:'#aeb9b0',marginBottom:6}}>Step {step} of 4</div><div style={{height:4,background:'#232b25',borderRadius:999,overflow:'hidden'}}><div style={{height:'100%',width:`${step*25}%`,background:'#4ADE80',borderRadius:999}}/></div></div>;}
function OptionGrid({items,value,onChange,getValue,height}){return <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:8}}>{items.map(i=>{const selected=value===getValue(i);return <button key={getValue(i)} type="button" onClick={()=>onChange(getValue(i))} aria-pressed={selected} style={{position:'relative',height,boxSizing:'border-box',padding:'14px 12px',borderRadius:14,border:selected?'1.5px solid #4ADE80':'0.5px solid #2a332c',background:selected?'#16281c':'#161d18',color:selected?'#c8f7d8':'#e6e9e6',textAlign:'left',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'flex-start',minWidth:0,cursor:'pointer'}}><span style={{height:20,color:'#8a978c'}}><OptionIcon icon={i.icon}/></span><span style={{marginTop:9,fontSize:13,fontWeight:800,lineHeight:1.2,paddingRight:18}}>{i.label}</span>{i.detail&&<small style={{marginTop:4,fontSize:10.5,lineHeight:1.25,fontWeight:600,color:selected?'#7fd99b':'#7c887e'}}>{i.detail}</small>}{selected&&<span style={{position:'absolute',top:9,right:9,width:18,height:18,borderRadius:'50%',background:'#4ADE80',color:'#07110a',display:'grid',placeItems:'center',fontSize:12,fontWeight:900}}>✓</span>}</button>})}</div>;}


export default function CalculatorClient({ savedTarget }) {
  const [weight,setWeight]=useState(70); const [sex,setSex]=useState('male'); const [activity,setActivity]=useState(1.375); const [goal,setGoal]=useState('maintain');
  const [result,setResult]=useState(null); const [saved,setSaved]=useState(false); const [isPending,start]=useTransition();

  function calculate(){
    const w=Number(weight); if(!w||w<20||w>300)return;
    const selected=GOALS.find(i=>i.id===goal)||GOALS[1]; const sexFactor=sex==='female'?0.92:sex==='other'?0.96:1;
    const target=Math.round(w*selected.v*sexFactor); const min=Math.round(w*.8); const max=Math.round(w*2.2); const pct=Math.min(100,Math.max(0,Math.round(((target-min)/(max-min))*100)));
    setResult({target,min,max,pct,goal:selected.v,activity,sex,weight:w}); setSaved(false);
  }

  function saveTarget(){
    if(!result)return;
    if(!savedTarget){
      try{localStorage.setItem('protlys_calculator_target',JSON.stringify({target:result.target,weight:result.weight,activity:result.activity,sex:result.sex,goal:result.goal,savedAt:Date.now()}));}catch{}
      window.location.assign('/login?next=/hub'); return;
    }
    start(async()=>{const response=await saveTargetAction({targetG:result.target}); if(response?.error)return; setSaved(true);});
  }

  const step={fontSize:14,fontWeight:900,letterSpacing:'.05em',color:'#e6e9e6'};
  return <div className="screen-pad" style={{maxWidth:520,margin:'0 auto'}}>
    <span className="eyebrow">Protlys</span><h1 style={{fontSize:26}}>Find your daily protein target</h1><p className="subhead">Get a clear number you can actually use. Takes about 30 seconds.</p>
    <section className="section-card" style={{marginTop:18}}><span className="field-label" style={step}>STEP 1 — YOUR WEIGHT</span><div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}><input id="weight" type="number" min="30" max="250" value={weight} onChange={e=>setWeight(e.target.value)} className="field-input mono" style={{fontSize:28,fontWeight:700,flex:1}}/><span className="mono" style={{fontSize:18,opacity:.55}}>kg</span></div></section>
    <section className="section-card" style={{marginTop:14}}><StepProgress step={2}/><span className="field-label" style={step}>STEP 2 — BIOLOGICAL SEX</span><OptionGrid items={SEX} value={sex} onChange={setSex} getValue={i=>i.v} height={112}/></section>
    <section className="section-card" style={{marginTop:14}}><StepProgress step={3}/><span className="field-label" style={step}>STEP 3 — ACTIVITY LEVEL</span><OptionGrid items={ACTIVITY} value={activity} onChange={setActivity} getValue={i=>i.v} height={126}/></section>
    <section className="section-card" style={{marginTop:14}}><StepProgress step={4}/><span className="field-label" style={step}>STEP 4 — YOUR GOAL</span><OptionGrid items={GOALS} value={goal} onChange={setGoal} getValue={i=>i.id} height={126}/></section>
    <button className="btn-secondary" style={{marginTop:18}} onClick={calculate}>Calculate my protein target →</button>
    {result&&<div style={{marginTop:26}}><div className="hr-tight"/><section className="section-card" style={{marginTop:20,border:'2px solid var(--green, #2E9E5B)'}}><span className="eyebrow">Your daily protein target</span><div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:6}}><span className="mono" style={{fontSize:52,fontWeight:700,lineHeight:1}}>{result.target}</span><span style={{fontSize:18,fontWeight:700,opacity:.5}}>g / day</span></div><p className="subhead" style={{margin:'8px 0 14px'}}>Based on your weight, activity and goal: {result.weight.toFixed(1)}kg · {result.goal}g/kg · {activityLabel(result.activity)} activity.</p><div style={{height:8,background:'var(--line,rgba(15,42,74,.12))',borderRadius:999,overflow:'hidden'}}><div style={{height:'100%',width:`${result.pct}%`,background:'var(--green, #2E9E5B)',borderRadius:999}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:10,opacity:.55,marginTop:5}}><span>0.8g/kg</span><span>2.2g/kg</span></div></section>
      <button className="btn-secondary" style={{marginTop:12,background:'var(--green,#2E9E5B)',borderColor:'var(--green,#2E9E5B)',color:'#fff'}} onClick={saveTarget} disabled={isPending||saved}>{saved?'Target saved to your Hub':isPending?'Saving…':'Save this target in the Hub →'}</button>
      {!savedTarget&&!saved&&<p className="disclaimer" style={{marginTop:9}}>We’ll carry this number into your Hub so you don’t have to enter it again.</p>}
      {savedTarget&&<button className="link-btn" style={{marginTop:12}} onClick={()=>{window.location.assign('/hub')}}>Just show me the number</button>}
      <p className="disclaimer" style={{marginTop:14}}>This is a starting estimate, not medical advice. Speak with a registered dietitian for personalised guidance.</p></div>}
    {savedTarget&&!result&&<p className="disclaimer" style={{marginTop:14}}>Your current saved target: <strong className="mono">{savedTarget}g / day</strong></p>}
  </div>;
}
