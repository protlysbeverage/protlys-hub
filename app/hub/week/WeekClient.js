'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

function targetForDate(date, history, fallback){
  const matches=history.filter(x=>x.effective_from<=date);
  return Number(matches[matches.length-1]?.target_g)||fallback;
}
function dayLabel(date){return new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(new Date(`${date}T12:00:00`));}
function prettyDate(date){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00`));}
function todayNairobi(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function timeLabel(value){return new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',hour:'numeric',minute:'2-digit'}).format(new Date(value));}

export default function WeekClient({dates,logs,currentTarget,history}){
  const router=useRouter();
  const [selected,setSelected]=useState(null);
  const today=todayNairobi();
  const days=useMemo(()=>dates.map(date=>{
    const dayLogs=logs.filter(x=>x.log_date===date);
    const grams=dayLogs.reduce((s,x)=>s+(Number(x.grams)||0),0);
    const target=targetForDate(date,history,currentTarget);
    return {date,grams,target,percent:target?Math.min(100,Math.round(grams/target*100)):0,logs:dayLogs};
  }),[dates,logs,currentTarget,history]);
  const recorded=days.filter(d=>d.grams>0);
  const average=recorded.length?Math.round(recorded.reduce((s,d)=>s+d.grams,0)/recorded.length):0;
  const atTarget=days.filter(d=>d.grams>=d.target&&d.grams>0).length;
  const isEarly=recorded.length<3;

  return <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:24}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span className="eyebrow">Protein</span><h1 style={{fontSize:25,marginTop:4}}>This week</h1></div><button className="link-btn" onClick={()=>router.push('/hub')}>Back</button></div>
    <section className="section-card" style={{marginTop:17,padding:'20px 16px'}}>
      {isEarly?<div><div style={{fontSize:18,fontWeight:800}}>Your week view will fill in as you log.</div><p className="subhead" style={{marginTop:5}}>Check back after a few days. There is nothing to catch up on.</p></div>:<div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:15}}><div><div style={{fontSize:11,color:'var(--ink-45)',fontWeight:700}}>Average</div><div className="mono" style={{fontSize:38,fontWeight:800,lineHeight:1.05,marginTop:4}}>{average} g</div></div><div style={{textAlign:'right'}}><div className="mono" style={{fontSize:24,fontWeight:800}}>{atTarget} of 7</div><div style={{fontSize:11,color:'var(--ink-45)',marginTop:2}}>days at target</div></div></div>}
    </section>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:6,marginTop:14}}>
      {days.map(day=>{
        const future=day.date>today; const active=day.date===today; const met=day.grams>=day.target&&day.grams>0;
        return <button key={day.date} type="button" onClick={()=>!future&&setSelected(selected===day.date?null:day.date)} disabled={future} style={{border:'1px solid var(--line)',borderRadius:14,padding:'10px 4px 11px',background:active?'var(--green-soft)':'#fff',opacity:future?.5:1,cursor:future?'default':'pointer',textAlign:'center',minWidth:0}}>
          <div style={{fontSize:10,fontWeight:800,color:active?'var(--green-dark)':'var(--ink-45)'}}>{dayLabel(day.date)}</div>
          <div style={{height:72,display:'flex',alignItems:'flex-end',justifyContent:'center',marginTop:7}}><div style={{width:'58%',height:`${Math.max(7,day.percent)}%`,maxHeight:'100%',background:met?'var(--green)':'var(--green-soft)',borderRadius:'6px 6px 3px 3px',border:met?'none':'1px solid var(--line)'}} /></div>
          <div className="mono" style={{fontSize:10.5,fontWeight:800,marginTop:7}}>{future?'—':`${day.grams}g`}</div>
        </button>;
      })}
    </div>
    <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:9}}>Tap a day to view what you logged. Green indicates the target was met.</div>
    {selected&&<section className="section-card" style={{marginTop:13}}>{(()=>{const day=days.find(x=>x.date===selected);return <><div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><div><div className="eyebrow">{dayLabel(day.date)}</div><div style={{fontWeight:800,fontSize:18,marginTop:3}}>{prettyDate(day.date)}</div></div><span className="mono" style={{fontWeight:800}}>{day.grams} / {day.target} g</span></div><div style={{marginTop:12,borderTop:'1px solid var(--line)'}}>{day.logs.length===0?<div style={{padding:'14px 0',fontSize:12.5,color:'var(--ink-45)'}}>Nothing logged on this day.</div>:day.logs.map(row=><div key={row.id} className="list-row" style={{padding:'11px 0'}}><div className="left"><div className="lbl" style={{fontSize:12.5}}>{row.product_label}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>{timeLabel(row.logged_at)}</div></div><span className="mono" style={{fontSize:12,fontWeight:800}}>+{row.grams}g</span></div>)}</div></>})()}</section>}
    <button className="btn-secondary" style={{marginTop:15}} onClick={()=>router.push('/hub/goal')}>View or edit your target</button>
  </div>;
}
