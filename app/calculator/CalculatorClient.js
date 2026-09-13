'use client';

import { useState, useTransition } from 'react';
import { saveTargetAction } from '@/app/actions';

const SEX = [
  { label: 'Male', v: 'male' },
  { label: 'Female', v: 'female' },
  { label: 'Prefer not to say', v: 'other' },
];
const ACTIVITY = [
  { label: 'Sedentary', detail: 'Desk job, little exercise', v: 1.0 },
  { label: 'Lightly active', detail: '1–2 days/week', v: 1.2 },
  { label: 'Moderately active', detail: '3–4 days/week', v: 1.375 },
  { label: 'Very active', detail: '5–6 days/week', v: 1.55 },
  { label: 'Athlete', detail: 'Twice daily / hard training', v: 1.725 },
];
const GOALS = [
  { id:'health', label:'General health', detail:'0.8g / kg body weight', v:0.8 },
  { id:'maintain', label:'Maintain & stay active', detail:'1.2–1.4g / kg', v:1.2 },
  { id:'muscle', label:'Build muscle', detail:'1.6–2.0g / kg', v:1.6 },
  { id:'performance', label:'Athletic performance', detail:'1.8–2.2g / kg', v:1.8 },
  { id:'lose', label:'Lose weight', detail:'1.2g / kg', v:1.2 },
];
function activityLabel(v){return ACTIVITY.find(a=>a.v===v)?.label?.toLowerCase()||'moderate';}

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

  const step={fontSize:13,fontWeight:800,letterSpacing:'.07em'};
  return <div className="screen-pad" style={{maxWidth:520,margin:'0 auto'}}>
    <span className="eyebrow">Protlys</span><h1 style={{fontSize:26}}>Find your daily protein target</h1><p className="subhead">Get a clear number you can actually use. Takes about 30 seconds.</p>
    <section className="section-card" style={{marginTop:18}}><span className="field-label" style={step}>STEP 1 — YOUR WEIGHT</span><div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}><input id="weight" type="number" min="30" max="250" value={weight} onChange={e=>setWeight(e.target.value)} className="field-input mono" style={{fontSize:28,fontWeight:700,flex:1}}/><span className="mono" style={{fontSize:18,opacity:.55}}>kg</span></div></section>
    <section className="section-card" style={{marginTop:14}}><span className="field-label" style={step}>STEP 2 — BIOLOGICAL SEX</span><div className="pill-select" style={{gridTemplateColumns:'repeat(3,1fr)'}}>{SEX.map(i=><button key={i.v} className={`pill-opt${sex===i.v?' active':''}`} onClick={()=>setSex(i.v)}>{i.label}</button>)}</div></section>
    <section className="section-card" style={{marginTop:14}}><span className="field-label" style={step}>STEP 3 — ACTIVITY LEVEL</span><div className="pill-select" style={{marginTop:8}}>{ACTIVITY.map(i=><button key={i.v} className={`pill-opt${activity===i.v?' active':''}`} onClick={()=>setActivity(i.v)}><span>{i.label}</span><small style={{display:'block',marginTop:2,opacity:.7}}>{i.detail}</small></button>)}</div></section>
    <section className="section-card" style={{marginTop:14}}><span className="field-label" style={step}>STEP 4 — YOUR GOAL</span><div className="pill-select" style={{marginTop:8}}>{GOALS.map(i=><button key={i.id} className={`pill-opt${goal===i.id?' active':''}`} onClick={()=>setGoal(i.id)}><span>{i.label}</span><small style={{display:'block',marginTop:2,opacity:.7}}>{i.detail}</small></button>)}</div></section>
    <button className="btn-secondary" style={{marginTop:18}} onClick={calculate}>Calculate my protein target →</button>
    {result&&<div style={{marginTop:26}}><div className="hr-tight"/><section className="section-card" style={{marginTop:20,border:'2px solid var(--green, #2E9E5B)'}}><span className="eyebrow">Your daily protein target</span><div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:6}}><span className="mono" style={{fontSize:52,fontWeight:700,lineHeight:1}}>{result.target}</span><span style={{fontSize:18,fontWeight:700,opacity:.5}}>g / day</span></div><p className="subhead" style={{margin:'8px 0 14px'}}>Based on your weight, activity and goal: {result.weight.toFixed(1)}kg · {result.goal}g/kg · {activityLabel(result.activity)} activity.</p><div style={{height:8,background:'var(--line,rgba(15,42,74,.12))',borderRadius:999,overflow:'hidden'}}><div style={{height:'100%',width:`${result.pct}%`,background:'var(--green, #2E9E5B)',borderRadius:999}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:10,opacity:.55,marginTop:5}}><span>0.8g/kg</span><span>2.2g/kg</span></div></section>
      <button className="btn-secondary" style={{marginTop:12,background:'var(--green,#2E9E5B)',borderColor:'var(--green,#2E9E5B)',color:'#fff'}} onClick={saveTarget} disabled={isPending||saved}>{saved?'Target saved to your Hub':isPending?'Saving…':'Save this target in the Hub →'}</button>
      {!savedTarget&&!saved&&<p className="disclaimer" style={{marginTop:9}}>We’ll carry this number into your Hub so you don’t have to enter it again.</p>}
      {savedTarget&&<button className="link-btn" style={{marginTop:12}} onClick={()=>{window.location.assign('/hub')}}>Just show me the number</button>}
      <p className="disclaimer" style={{marginTop:14}}>This is a starting estimate, not medical advice. Speak with a registered dietitian for personalised guidance.</p></div>}
    {savedTarget&&!result&&<p className="disclaimer" style={{marginTop:14}}>Your current saved target: <strong className="mono">{savedTarget}g / day</strong></p>}
  </div>;
}
