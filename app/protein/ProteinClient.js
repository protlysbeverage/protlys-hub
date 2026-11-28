'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteProteinLogAction, logProteinAction, updateProteinLogAction } from '@/app/actions';

function timeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-KE', { timeZone:'Africa/Nairobi', hour:'numeric', minute:'2-digit' }).format(date);
}
function dayLabel(value) {
  return new Intl.DateTimeFormat('en-KE', { timeZone:'Africa/Nairobi', weekday:'short' }).format(new Date(value + 'T12:00:00+03:00'));
}

export default function ProteinClient({ today, targetG = 120, initialLogs = [], weekDays = [] }) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs || []);
  const [grams, setGrams] = useState('20');
  const [label, setLabel] = useState('Protein');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [editGrams, setEditGrams] = useState('');
  const [editLabel, setEditLabel] = useState('');
  useEffect(() => setLogs(initialLogs || []), [initialLogs]);

  const target = Math.max(20, Number(targetG) || 120);
  const total = useMemo(() => logs.reduce((sum, row) => sum + (Number(row.grams) || 0), 0), [logs]);
  const remaining = Math.max(0, target - total);
  const progress = Math.min(100, Math.round((total / target) * 100));
  const todayLabel = new Intl.DateTimeFormat('en-KE', { timeZone:'Africa/Nairobi', weekday:'long', day:'numeric', month:'long' }).format(new Date(today + 'T12:00:00+03:00'));

  async function addLog(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await logProteinAction({ productId:'custom', productLabel:label, grams });
      if (result && result.error) setError(result.error);
      else if (result && result.log) {
        setLogs(current => [...current, result.log].sort((a,b) => new Date(a.logged_at) - new Date(b.logged_at)));
        setNotice(result.warning || 'Protein added to today’s log.');
        setLabel('Protein'); setGrams('20'); router.refresh();
      }
    } catch {
      setError('Could not add this protein entry. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  function beginEdit(row) {
    setEditing(row.id); setEditGrams(String(row.grams)); setEditLabel(row.product_label || 'Protein');
    setError(''); setNotice('');
  }
  async function saveEdit(event) {
    event.preventDefault();
    if (busy || editing == null) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await updateProteinLogAction({ logId:editing, productLabel:editLabel, grams:editGrams });
      if (result && result.error) setError(result.error);
      else if (result?.log) {
        setLogs(current => current.map(row => String(row.id) === String(editing) ? result.log : row));
        setEditing(null); setNotice('Entry updated.'); router.refresh();
      } else setError('The updated entry could not be confirmed. Refresh and try again.');
    } catch {
      setError('Could not update this protein entry. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  async function removeLog(row) {
    if (busy || !window.confirm('Delete this protein entry?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await deleteProteinLogAction({ logId:row.id });
      if (result && result.error) setError(result.error);
      else {
        setLogs(current => current.filter(item => String(item.id) !== String(row.id)));
        setNotice('Entry deleted.'); router.refresh();
      }
    } catch {
      setError('Could not delete this protein entry. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:24,paddingBottom:24}}>
    <span className="eyebrow">Protein</span>
    <h1 style={{fontSize:27,marginTop:5}}>Your daily intake</h1>
    <p className="subhead" style={{marginTop:5}}>{todayLabel}</p>
    <section className="hub-card" style={{padding:18,marginTop:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
        <div><div className="t" style={{fontSize:10}}>TODAY’S PROTEIN</div><div className="mono" style={{fontSize:42,lineHeight:1.1,fontWeight:850,marginTop:6}}>{total}<span style={{fontSize:18,color:'var(--ink-45)'}}> g</span></div><div style={{fontSize:12,color:'var(--ink-45)',marginTop:4}}>{remaining > 0 ? remaining + ' g remaining to your target' : 'Daily target reached'}</div></div>
        <div style={{textAlign:'right',flex:'0 0 auto'}}><div className="mono" style={{fontSize:23,fontWeight:850}}>{target} g</div><div style={{fontSize:10.5,color:'var(--ink-45)'}}>Daily target</div><Link href="/hub/goal" className="link-btn" style={{display:'inline-block',marginTop:6}}>Edit target</Link></div>
      </div>
      <div role="progressbar" aria-label="Daily protein target progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{height:9,background:'var(--green-soft)',borderRadius:999,overflow:'hidden',marginTop:17}}><div style={{height:'100%',width:progress+'%',background:'var(--green)',borderRadius:999,transition:'width 250ms ease'}} /></div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:10.5,color:'var(--ink-45)',marginTop:7}}><span>{progress}% of target</span><span>{total >= target ? 'On target' : 'Keep building steadily'}</span></div>
    </section>
    <section className="section-card" style={{marginTop:13}}>
      <div style={{fontWeight:850,fontSize:16}}>Add protein</div>
      <p style={{fontSize:11.5,color:'var(--ink-45)',lineHeight:1.45,margin:'5px 0 13px'}}>Log the amount shown on the food or drink label, or use your best estimate.</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:12}}>{[10,15,20,25,30,40].map(value=><button key={value} type="button" className={Number(grams)===value?'btn-primary':'btn-secondary'} onClick={()=>setGrams(String(value))} style={{width:'auto',minWidth:52,margin:0,padding:'9px 12px'}}>{value} g</button>)}</div>
      <form onSubmit={addLog}>
        <label style={{display:'block',fontSize:10,fontWeight:800,letterSpacing:'.08em',color:'var(--ink-45)'}}>WHAT DID YOU HAVE?</label>
        <input className="field-input" value={label} maxLength={80} onChange={event=>setLabel(event.target.value)} placeholder="e.g. Protein milk, yoghurt, eggs" style={{marginTop:6}} />
        <label style={{display:'block',fontSize:10,fontWeight:800,letterSpacing:'.08em',color:'var(--ink-45)',marginTop:12}}>PROTEIN (GRAMS)</label>
        <input className="field-input mono" type="number" inputMode="numeric" min="1" max="300" step="1" required value={grams} onChange={event=>setGrams(event.target.value)} style={{marginTop:6,fontSize:19,fontWeight:800}} />
        <button className="btn-primary" type="submit" disabled={busy || !Number(grams) || Number(grams)<1 || Number(grams)>300} style={{marginTop:12}}>{busy?'Saving…':'Add to today’s log'}</button>
      </form>
      {error && <div role="alert" style={{color:'#B3261E',fontSize:12,marginTop:10}}>{error}</div>}
      {notice && <div role="status" style={{color:'var(--green-dark)',fontSize:12,marginTop:10}}>{notice}</div>}
    </section>
    <section style={{marginTop:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:9}}><h2 style={{fontSize:16,margin:0}}>Today’s entries</h2><span className="mono" style={{fontSize:12,fontWeight:850}}>{logs.length} logged</span></div>
      <div className="section-card" style={{padding:'2px 14px'}}>
        {logs.length===0 ? <div style={{padding:'17px 0',fontSize:12.5,color:'var(--ink-45)'}}>Nothing logged yet. Add your first entry above.</div> : logs.map(row=><div key={row.id} className="list-row" style={{padding:'12px 0',alignItems:'center'}}>
          <div className="left" style={{minWidth:0}}><div className="lbl" style={{fontSize:12.5}}>{row.product_label || 'Protein'}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:3}}>{timeLabel(row.logged_at)}</div></div>
          <div style={{display:'flex',alignItems:'center',gap:8,flex:'0 0 auto'}}><span className="mono" style={{fontSize:13,fontWeight:850}}>+{row.grams}g</span><button type="button" className="link-btn" onClick={()=>beginEdit(row)} aria-label={'Edit '+(row.product_label||'protein')}>Edit</button><button type="button" className="link-btn" onClick={()=>removeLog(row)} aria-label={'Delete '+(row.product_label||'protein')} style={{color:'#B3261E'}}>Delete</button></div>
        </div>)}
      </div>
    </section>
    {editing!=null && <div role="dialog" aria-modal="true" aria-labelledby="protein-edit-title" style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,.45)',display:'grid',placeItems:'center',padding:18}}>
      <form onSubmit={saveEdit} className="section-card" style={{width:'min(100%,420px)',boxSizing:'border-box',padding:18}}>
        <h2 id="protein-edit-title" style={{margin:'0 0 12px',fontSize:17}}>Edit protein entry</h2>
        <label style={{display:'block',fontSize:11,fontWeight:800}}>Description</label><input className="field-input" value={editLabel} maxLength={80} onChange={event=>setEditLabel(event.target.value)} style={{marginTop:5}} />
        <label style={{display:'block',fontSize:11,fontWeight:800,marginTop:12}}>Protein (grams)</label><input className="field-input mono" type="number" min="1" max="300" step="1" value={editGrams} onChange={event=>setEditGrams(event.target.value)} style={{marginTop:5}} />
        {error && <div role="alert" style={{color:'#B3261E',fontSize:12,marginTop:8}}>{error}</div>}
        <div style={{display:'flex',gap:8,marginTop:15}}><button type="button" className="btn-secondary" onClick={()=>setEditing(null)} disabled={busy} style={{flex:1,margin:0}}>Cancel</button><button type="submit" className="btn-primary" disabled={busy || !Number(editGrams) || Number(editGrams)<1 || Number(editGrams)>300} style={{flex:1,margin:0}}>{busy?'Saving…':'Save changes'}</button></div>
      </form>
    </div>}
    <section style={{marginTop:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><h2 style={{fontSize:16,margin:0}}>This week</h2><Link href="/hub/week" className="link-btn">Full history →</Link></div>
      <div className="section-card" style={{marginTop:9,padding:14}}><div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:7,alignItems:'end',height:104}}>
        {weekDays.map(day=>{const value=Number(day.grams||0),goal=Number(day.target||target),height=value>0?Math.max(8,Math.min(100,value/Math.max(1,goal)*100)):3;return <div key={day.date} style={{minWidth:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:5}}><span className="mono" style={{fontSize:9,color:'var(--ink-45)',fontWeight:700}}>{value?value+'g':'—'}</span><div style={{width:'70%',height:height+'%',minHeight:3,borderRadius:'6px 6px 2px 2px',background:value>=goal?'var(--green)':'var(--green-soft)',border:value?'none':'1px solid var(--line)'}} /><span style={{fontSize:9,color:'var(--ink-45)',fontWeight:700}}>{dayLabel(day.date)}</span></div>;})}
      </div></div>
    </section>
    <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:17}}><Link href="/calculator" className="btn-secondary" style={{flex:1,textAlign:'center',textDecoration:'none',margin:0}}>Protein calculator</Link><Link href="/hub/goal" className="btn-secondary" style={{flex:1,textAlign:'center',textDecoration:'none',margin:0}}>Edit daily target</Link></div>
  </div>;
}
