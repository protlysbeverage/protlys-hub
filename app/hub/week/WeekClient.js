'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProteinLogAction, updateProteinLogAction } from '@/app/actions';

function targetForDate(date, history, fallback) {
  const matches = history.filter(row => row.effective_from <= date);
  return Number(matches[matches.length - 1]?.target_g) || fallback;
}
function dayLabel(date) {
  return new Intl.DateTimeFormat('en-KE', { timeZone:'Africa/Nairobi', weekday:'short' }).format(new Date(date + 'T12:00:00+03:00'));
}
function prettyDate(date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone:'Africa/Nairobi', day:'numeric', month:'short' }).format(new Date(date + 'T12:00:00+03:00'));
}
function todayNairobi() {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
}
function timeLabel(value) {
  return new Intl.DateTimeFormat('en-GB', { timeZone:'Africa/Nairobi', hour:'numeric', minute:'2-digit' }).format(new Date(value));
}

export default function WeekClient({ dates, logs, currentTarget, history }) {
  const router = useRouter();
  const [entries, setEntries] = useState(logs || []);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editGrams, setEditGrams] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = todayNairobi();
  useEffect(() => setEntries(logs || []), [logs]);

  const days = useMemo(() => dates.map(date => {
    const dayLogs = entries.filter(row => row.log_date === date);
    const grams = dayLogs.reduce((sum, row) => sum + (Number(row.grams) || 0), 0);
    const target = targetForDate(date, history, currentTarget);
    return { date, grams, target, percent:target ? Math.min(100, Math.round(grams / target * 100)) : 0, logs:dayLogs };
  }), [dates, entries, currentTarget, history]);
  const recorded = days.filter(day => day.grams > 0);
  const average = recorded.length ? Math.round(recorded.reduce((sum, day) => sum + day.grams, 0) / recorded.length) : 0;
  const atTarget = days.filter(day => day.grams >= day.target && day.grams > 0).length;
  const isEarly = recorded.length < 3;
  const selectedDay = days.find(day => day.date === selected);

  function beginEdit(row) {
    setEditing(row.id); setEditGrams(String(row.grams)); setEditLabel(row.product_label || 'Protein'); setError('');
  }
  async function saveEdit(event) {
    event.preventDefault();
    if (busy || editing == null) return;
    setBusy(true); setError('');
    const result = await updateProteinLogAction({ logId:editing, productLabel:editLabel, grams:editGrams });
    if (result && result.error) setError(result.error);
    else {
      setEntries(current => current.map(row => String(row.id) === String(editing) ? result.log : row));
      setEditing(null); router.refresh();
    }
    setBusy(false);
  }
  async function removeLog(row) {
    if (busy || !window.confirm('Delete this protein entry?')) return;
    setBusy(true); setError('');
    const result = await deleteProteinLogAction({ logId:row.id });
    if (result && result.error) setError(result.error);
    else {
      setEntries(current => current.filter(item => String(item.id) !== String(row.id)));
      router.refresh();
    }
    setBusy(false);
  }

  return <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:24,paddingBottom:24}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span className="eyebrow">Protein</span><h1 style={{fontSize:25,marginTop:4}}>This week</h1></div><button className="link-btn" onClick={()=>router.push('/protein')}>Back</button></div>
    <section className="section-card" style={{marginTop:17,padding:'20px 16px'}}>
      {isEarly ? <div><div style={{fontSize:18,fontWeight:800}}>Your week view will fill in as you log.</div><p className="subhead" style={{marginTop:5}}>Check back after a few days. There is nothing to catch up on.</p></div> : <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:15}}><div><div style={{fontSize:11,color:'var(--ink-45)',fontWeight:700}}>Average on logged days</div><div className="mono" style={{fontSize:38,fontWeight:800,lineHeight:1.05,marginTop:4}}>{average} g</div></div><div style={{textAlign:'right'}}><div className="mono" style={{fontSize:24,fontWeight:800}}>{atTarget} of 7</div><div style={{fontSize:11,color:'var(--ink-45)',marginTop:2}}>days at target</div></div></div>}
    </section>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:6,marginTop:14}}>
      {days.map(day=>{
        const future=day.date>today, active=day.date===today, met=day.grams>=day.target&&day.grams>0;
        return <button key={day.date} type="button" onClick={()=>!future&&setSelected(selected===day.date?null:day.date)} disabled={future} style={{border:'1px solid var(--line)',borderRadius:14,padding:'10px 4px 11px',background:active?'var(--green-soft)':'#fff',opacity:future?.5:1,cursor:future?'default':'pointer',textAlign:'center',minWidth:0}}>
          <div style={{fontSize:10,fontWeight:800,color:active?'var(--green-dark)':'var(--ink-45)'}}>{dayLabel(day.date)}</div>
          <div style={{height:72,display:'flex',alignItems:'flex-end',justifyContent:'center',marginTop:7}}><div style={{width:'58%',height:Math.max(7,day.percent)+'%',maxHeight:'100%',background:met?'var(--green)':'var(--green-soft)',borderRadius:'6px 6px 3px 3px',border:met?'none':'1px solid var(--line)'}} /></div>
          <div className="mono" style={{fontSize:10.5,fontWeight:800,marginTop:7}}>{future?'—':day.grams+'g'}</div>
        </button>;
      })}
    </div>
    <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:9}}>Tap a day to view, edit or remove its entries. Green indicates the target was met.</div>
    {selectedDay && <section className="section-card" style={{marginTop:13}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><div><div className="eyebrow">{dayLabel(selectedDay.date)}</div><div style={{fontWeight:800,fontSize:18,marginTop:3}}>{prettyDate(selectedDay.date)}</div></div><span className="mono" style={{fontWeight:800}}>{selectedDay.grams} / {selectedDay.target} g</span></div>
      <div style={{marginTop:12,borderTop:'1px solid var(--line)'}}>
        {selectedDay.logs.length===0 ? <div style={{padding:'14px 0',fontSize:12.5,color:'var(--ink-45)'}}>Nothing logged on this day.</div> : selectedDay.logs.map(row=><div key={row.id} className="list-row" style={{padding:'11px 0',alignItems:'center'}}>
          <div className="left"><div className="lbl" style={{fontSize:12.5}}>{row.product_label}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>{timeLabel(row.logged_at)}</div></div>
          <div style={{display:'flex',alignItems:'center',gap:8,flex:'0 0 auto'}}><span className="mono" style={{fontSize:12,fontWeight:800}}>+{row.grams}g</span><button className="link-btn" type="button" onClick={()=>beginEdit(row)}>Edit</button><button className="link-btn" type="button" onClick={()=>removeLog(row)} style={{color:'#B3261E'}}>Delete</button></div>
        </div>)}
      </div>
    </section>}
    {error && <div role="alert" style={{fontSize:12,color:'#B3261E',marginTop:10}}>{error}</div>}
    {editing!=null && <div role="dialog" aria-modal="true" aria-labelledby="protein-week-edit-title" style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,.45)',display:'grid',placeItems:'center',padding:18}}>
      <form onSubmit={saveEdit} className="section-card" style={{width:'min(100%,420px)',boxSizing:'border-box',padding:18}}>
        <h2 id="protein-week-edit-title" style={{margin:'0 0 12px',fontSize:17}}>Edit protein entry</h2>
        <label style={{display:'block',fontSize:11,fontWeight:800}}>Description</label><input className="field-input" value={editLabel} maxLength={80} onChange={event=>setEditLabel(event.target.value)} style={{marginTop:5}} />
        <label style={{display:'block',fontSize:11,fontWeight:800,marginTop:12}}>Protein (grams)</label><input className="field-input mono" type="number" min="1" max="300" step="1" value={editGrams} onChange={event=>setEditGrams(event.target.value)} style={{marginTop:5}} />
        <div style={{display:'flex',gap:8,marginTop:15}}><button type="button" className="btn-secondary" onClick={()=>setEditing(null)} disabled={busy} style={{flex:1,margin:0}}>Cancel</button><button type="submit" className="btn-primary" disabled={busy || !Number(editGrams) || Number(editGrams)<1 || Number(editGrams)>300} style={{flex:1,margin:0}}>{busy?'Saving…':'Save changes'}</button></div>
      </form>
    </div>}
    <button className="btn-secondary" style={{marginTop:15}} onClick={()=>router.push('/hub/goal')}>View or edit your target</button>
  </div>;
}
