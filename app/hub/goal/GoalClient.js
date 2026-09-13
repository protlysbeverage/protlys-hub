'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveTargetAction } from '../../actions';

export default function GoalClient({ targetG, history=[] }) {
  const router = useRouter();
  const [value,setValue] = useState(Number(targetG)||120);
  const [applyToday,setApplyToday] = useState(true);
  const [pending,startTransition] = useTransition();
  const [message,setMessage] = useState('');
  const latestCalculator = history.find(x=>x.source==='calculator');

  function save() {
    const next=Math.round(Number(value));
    if (!Number.isFinite(next)||next<20||next>500) return setMessage('Choose a target between 20g and 500g.');
    const effectiveDate=applyToday?null:new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000));
    startTransition(async()=>{
      const result=await saveTargetAction({targetG:next,source:'custom',effectiveDate});
      if(result?.error) return setMessage(result.error);
      setMessage(applyToday?`Target updated to ${next} g.`:`Target set to ${next} g from tomorrow.`);
      router.refresh();
    });
  }

  function resetCalculator(){ if(latestCalculator){setValue(Number(latestCalculator.target_g));setMessage('Calculator target loaded. Save to apply it.');} else setMessage('No saved calculator target yet.'); }

  return <div className="screen-pad" style={{maxWidth:560,margin:'0 auto',paddingTop:24}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span className="eyebrow">Goal</span><h1 style={{fontSize:25,marginTop:4}}>Your daily protein target</h1></div><button className="link-btn" onClick={()=>router.push('/hub')}>Back</button></div>
    <section className="section-card" style={{marginTop:18,textAlign:'center',padding:'28px 18px'}}>
      <div className="mono" style={{fontSize:68,fontWeight:800,lineHeight:1,letterSpacing:'-.05em'}}>{value}<span style={{fontSize:21,opacity:.5}}> g</span></div>
      <div style={{fontSize:12,color:'var(--ink-45)',marginTop:8}}>Daily protein target</div>
      <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:18}}>
        <button className="btn-secondary" style={{margin:0}} onClick={()=>setValue(v=>Math.max(20,Number(v)-10))}>−10 g</button>
        <button className="btn-secondary" style={{margin:0}} onClick={()=>setValue(v=>Math.min(500,Number(v)+10))}>+10 g</button>
      </div>
      <input className="field-input mono" aria-label="Daily protein target" inputMode="numeric" type="number" min="20" max="500" value={value} onChange={e=>setValue(e.target.value)} style={{marginTop:13,textAlign:'center',fontSize:22,fontWeight:800}} />
      <p style={{fontSize:12.5,lineHeight:1.5,color:'var(--ink-70)',maxWidth:390,margin:'14px auto 0'}}>This number is a practical daily guide based on your weight and activity. You can change it whenever you want.</p>
      <div style={{textAlign:'left',marginTop:17,padding:'12px 13px',borderRadius:13,background:'var(--paper)',border:'1px solid var(--line)'}}>
        <label style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:12.5,color:'var(--ink-70)',cursor:'pointer'}}><input type="checkbox" checked={applyToday} onChange={e=>setApplyToday(e.target.checked)} style={{marginTop:2}}/><span><strong>Use this target today</strong><br/><span style={{fontSize:11,color:'var(--ink-45)'}}>Turn this off to start the new target tomorrow.</span></span></label>
      </div>
      <button className="btn-primary" style={{marginTop:12}} onClick={save} disabled={pending}>{pending?'Saving…':'Save target'}</button>
      {latestCalculator && <button className="link-btn" style={{marginTop:13}} onClick={resetCalculator}>Reset to calculator ({latestCalculator.target_g} g)</button>}
      {message && <div style={{fontSize:11.5,color:message.includes('updated')||message.includes('set to')?'var(--green-dark)':'#B3261E',marginTop:10}}>{message}</div>}
    </section>
    <section style={{marginTop:18}}><div className="section-title" style={{fontSize:14}}>Target history</div><div className="section-card" style={{marginTop:8,padding:0,overflow:'hidden'}}>{history.length===0?<div style={{padding:15,fontSize:12,color:'var(--ink-45)'}}>History will appear as you update your target.</div>:history.slice(0,8).map((row,i)=><div key={`${row.effective_from}-${i}`} className="list-row" style={{padding:'12px 14px'}}><div className="left"><div className="lbl" style={{fontSize:12.5}}>{row.target_g} g</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>{row.effective_from} · {row.source==='calculator'?'Protein Calculator':'Custom'}</div></div></div>)}</div></section>
  </div>;
}
