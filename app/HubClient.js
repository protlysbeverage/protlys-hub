'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboardingAction, logProteinAction, saveTargetAction } from './actions';

const QUICK = [15,20,25,30];

function nDate() {
  return new Intl.DateTimeFormat('en-GB', { timeZone:'Africa/Nairobi', weekday:'long', day:'numeric', month:'long' }).format(new Date());
}

function timeLabel(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone:'Africa/Nairobi', hour:'numeric', minute:'2-digit' }).format(new Date(value));
}

export default function HubClient({ profile, todayG, logs, movementDays = [], foundingCount = 0 }) {
  const router = useRouter();
  const [panel, setPanel] = useState(null);
  const [onboarding, setOnboarding] = useState(!profile?.onboarding_complete);
  const [target, setTarget] = useState(Number(profile?.target_g) || 120);
  const [calculatorTarget, setCalculatorTarget] = useState(null);
  const [custom, setCustom] = useState('');
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('protlys_calculator_target');
      if (raw) {
        const data = JSON.parse(raw);
        const value = Number(data?.target);
        if (value >= 20 && value <= 500) {
          setCalculatorTarget(value);
          setTarget(value);
          setOnboarding(true);
        }
      }
    } catch {}
  }, []);

  const remaining = Math.max(0, target - Number(todayG || 0));
  const progress = target > 0 ? Math.min(100, Math.round((Number(todayG || 0) / target) * 100)) : 0;
  const name = profile?.display_name?.split(' ')[0] || 'there';
  const count = Math.min(250, Number(foundingCount) || 0);

  function flash(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }

  function saveTarget(value) {
    startTransition(async () => {
      const result = await saveTargetAction({ targetG:value });
      if (result?.error) return flash(result.error);
      setTarget(value);
      setCalculatorTarget(null);
      try { localStorage.removeItem('protlys_calculator_target'); } catch {}
    });
  }

  function finishOnboarding() {
    startTransition(async () => {
      await completeOnboardingAction();
      setOnboarding(false);
      try { localStorage.removeItem('protlys_calculator_target'); } catch {}
      router.refresh();
    });
  }

  function log(value, label = 'Protein') {
    startTransition(async () => {
      const result = await logProteinAction({ productId:'custom', productLabel:label, grams:value });
      if (result?.error) return flash(result.error);
      setPanel(null);
      setOnboarding(false);
      try { localStorage.removeItem('protlys_calculator_target'); } catch {}
      flash(`+${value}g logged`);
      router.refresh();
    });
  }

  const week = useMemo(() => movementDays.slice(-7), [movementDays]);

  if (onboarding) return <>
    {toast && <Toast text={toast}/>} 
    <div className="screen-pad" style={{maxWidth:560,margin:'0 auto',paddingTop:28}}>
      <span className="eyebrow">Your Hub</span>
      <h1 style={{fontSize:28,lineHeight:1.08,marginTop:7}}>Start with your target.</h1>
      <p className="subhead" style={{marginTop:8}}>One clear number, then one simple log. Everything else can wait.</p>

      <section className="section-card" style={{marginTop:20,textAlign:'center',padding:'26px 18px'}}>
        <div style={{fontSize:12,color:'var(--ink-45)',fontWeight:700}}>Your daily target</div>
        <div className="mono" style={{fontSize:58,fontWeight:800,lineHeight:1,marginTop:6}}>{target}<span style={{fontSize:20,opacity:.5}}> g</span></div>
        <p style={{fontSize:13,color:'var(--ink-70)',margin:'10px auto 18px',maxWidth:390}}>{calculatorTarget ? 'This came from the calculator. Want to keep it or change it?' : 'This is your starting target. You can change it any time.'}</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
          <button className="btn-primary" onClick={() => saveTarget(target)} disabled={pending}>Keep {target} g</button>
          <button className="btn-secondary" onClick={() => setPanel('edit-target')} disabled={pending}>Edit</button>
        </div>
        {panel === 'edit-target' && <div style={{marginTop:16,textAlign:'left'}}><label className="field-label">DAILY TARGET (GRAMS)</label><input className="field-input mono" inputMode="numeric" type="number" min="20" max="500" value={target} onChange={e=>setTarget(e.target.value)} style={{fontSize:24,fontWeight:700}}/><button className="btn-primary" style={{marginTop:9}} onClick={()=>saveTarget(target)} disabled={pending}>Save target</button></div>}
      </section>

      <section className="section-card" style={{marginTop:14}}>
        <div style={{fontWeight:800,fontSize:18}}>Let’s log your first protein.</div>
        <p className="subhead" style={{marginTop:5}}>Pick a quick amount or add something else.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:14}}>{QUICK.map(g=><button key={g} className="btn-secondary" style={{padding:'13px 6px',margin:0}} onClick={()=>log(g,`Protein · ${g}g`)} disabled={pending}>+{g}g</button>)}</div>
        <button className="link-btn" style={{marginTop:13}} onClick={()=>setPanel('custom')}>Something else →</button>
        {panel === 'custom' && <div style={{marginTop:12}}><input className="field-input mono" inputMode="decimal" type="number" min="1" max="300" placeholder="Protein grams" value={custom} onChange={e=>setCustom(e.target.value)}/><button className="btn-primary" style={{marginTop:9}} onClick={()=>{const v=Number(custom);if(v>0)log(v,'Custom protein')}} disabled={pending}>Log protein</button></div>}
      </section>

      <button className="btn-secondary" style={{marginTop:14,width:'100%'}} onClick={finishOnboarding} disabled={pending}>Skip for now → Go to Today</button>
    </div>
  </>;

  return <>
    {toast && <Toast text={toast}/>} 
    <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14}}>
        <div><span className="eyebrow">Today</span><h1 style={{fontSize:18,marginTop:3}}>{nDate()}</h1></div>
        <button className="link-btn" style={{fontSize:12}} onClick={()=>setPanel('edit-target')}>Target {target}g</button>
      </div>

      <section className="section-card" style={{marginTop:16,padding:'22px 18px'}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--ink-45)'}}>Protein remaining</div>
        <div className="mono" style={{fontSize:'clamp(48px,13vw,68px)',fontWeight:800,lineHeight:.98,letterSpacing:'-.045em',marginTop:4}}>{remaining}<span style={{fontSize:20,opacity:.45}}> g</span></div>
        <div style={{fontSize:13,color:'var(--ink-70)',marginTop:7}}>of {target} g daily target</div>
        <div style={{height:9,background:'var(--green-soft)',borderRadius:999,overflow:'hidden',marginTop:17}}><div style={{height:'100%',width:`${progress}%`,background:'var(--green)',borderRadius:999,transition:'width .25s ease'}}/></div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:7,fontSize:11,color:'var(--ink-45)'}}><span>{todayG} g logged</span><span>{progress}%</span></div>
      </section>

      {panel === 'edit-target' && <section className="section-card" style={{marginTop:12}}><label className="field-label">CHANGE DAILY TARGET</label><div style={{display:'flex',gap:8,marginTop:7}}><input className="field-input mono" inputMode="numeric" type="number" min="20" max="500" value={target} onChange={e=>setTarget(e.target.value)} style={{fontSize:22,fontWeight:700}}/><button className="btn-primary" style={{margin:0,flex:'0 0 auto',width:'auto',padding:'10px 15px'}} onClick={()=>{saveTarget(target);setPanel(null)}} disabled={pending}>Save</button></div></section>}

      <button className="btn-primary" style={{marginTop:13}} onClick={()=>setPanel('log')} disabled={pending}>+ Log protein</button>
      <button className="btn-secondary" style={{marginTop:9}} onClick={()=>setPanel('week')}>See this week</button>

      {panel === 'log' && <LogPanel onLog={log} custom={custom} setCustom={setCustom} pending={pending} onClose={()=>setPanel(null)}/>} 
      {panel === 'week' && <section className="section-card" style={{marginTop:13}}><div style={{fontWeight:800}}>This week</div><div style={{display:'flex',alignItems:'flex-end',gap:7,height:90,marginTop:16}}>{week.length ? week.map((d,i)=><div key={i} style={{flex:1,textAlign:'center'}}><div style={{height:Math.max(8,Math.min(68,(Number(d.steps)||0)/200)) ,background:'var(--green)',borderRadius:'6px 6px 2px 2px'}} title={`${Number(d.steps||0).toLocaleString()} steps`}/><div style={{fontSize:9,color:'var(--ink-45)',marginTop:5}}>{new Date(`${d.step_date}T12:00:00`).toLocaleDateString([], {weekday:'short'}).slice(0,1)}</div></div>) : <p className="subhead">No movement recorded yet.</p>}</div><button className="link-btn" style={{marginTop:12}} onClick={()=>setPanel(null)}>Close</button></section>}

      <section style={{marginTop:22}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><h2 className="section-title" style={{fontSize:15,margin:0}}>Logged today</h2><span style={{fontSize:11,color:'var(--ink-45)'}}>{logs.length} {logs.length===1?'entry':'entries'}</span></div>
        <div style={{marginTop:8,border:'1.5px solid var(--line)',borderRadius:16,overflow:'hidden',background:'#fff'}}>
          {logs.length === 0 ? <div style={{padding:17,fontSize:13,color:'var(--ink-70)'}}>Nothing logged yet.<div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:3}}>Your first entry takes about 5 seconds.</div></div> : logs.map(logRow => <div key={logRow.id} className="list-row" style={{padding:'13px 15px'}}><div className="left"><div className="lbl" style={{fontSize:13}}>{logRow.product_label}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>{timeLabel(logRow.logged_at)}</div></div><span className="mono" style={{fontSize:13,fontWeight:800}}>+{logRow.grams}g</span></div>)}
        </div>
      </section>

      <section style={{marginTop:24,padding:'17px',border:'1.5px solid var(--line)',borderRadius:16,background:'#fff'}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--ink-45)'}}>Founding Members</div>
        <div style={{fontWeight:800,fontSize:18,marginTop:3}}>{count} of 250</div>
        <p style={{fontSize:12.5,lineHeight:1.45,color:'var(--ink-70)',margin:'6px 0 0'}}>Building the habit together — protein as a daily habit, not a gym-only thing.</p>
      </section>
    </div>
  </>;
}

function LogPanel({onLog,custom,setCustom,pending,onClose}) {
  return <section className="section-card" style={{marginTop:13}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div className="eyebrow">Add protein</div><div style={{fontWeight:800,fontSize:18,marginTop:3}}>How much?</div></div><button className="link-btn" onClick={onClose}>Close</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:15}}>{QUICK.map(g=><button key={g} className="btn-secondary" style={{padding:'13px 6px',margin:0}} onClick={()=>onLog(g,`Protein · ${g}g`)} disabled={pending}>+{g}g</button>)}</div><div style={{marginTop:14}}><label className="field-label">CUSTOM GRAMS</label><div style={{display:'flex',gap:8,marginTop:6}}><input className="field-input mono" inputMode="decimal" type="number" min="1" max="300" placeholder="e.g. 22" value={custom} onChange={e=>setCustom(e.target.value)}/><button className="btn-primary" style={{width:'auto',margin:0}} onClick={()=>{const v=Number(custom);if(v>0)onLog(v,'Custom protein')}} disabled={pending}>Log</button></div></div></section>;
}

function Toast({text}) { return <div style={{position:'fixed',left:'50%',bottom:84,transform:'translateX(-50%)',zIndex:999,background:'var(--ink)',color:'#fff',borderRadius:999,padding:'10px 16px',fontSize:12.5,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,.15)',whiteSpace:'nowrap'}}>{text}</div>; }
