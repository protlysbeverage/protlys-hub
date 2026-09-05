'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logStepsAction } from '@/app/movement-actions';

function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday:'short', day:'numeric', month:'short' });
}

export default function MovementClient({ profile, todaySteps = 0, lastSync, source, weekSteps = [] }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [manualSteps, setManualSteps] = useState('');
  const [manualDate, setManualDate] = useState(localDateStr());
  const [manualTime, setManualTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [toast, setToast] = useState('');

  const totalSteps = profile?.total_steps || 0;
  const today = new Date();
  const todayStr = localDateStr(today);
  const weekData = Array.from({ length:7 }, (_, i) => {
    const d = new Date(today);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - 6 + i);
    const dateStr = localDateStr(d);
    const found = weekSteps.find(w => w.step_date === dateStr);
    return { dateStr, day:d.toLocaleDateString([], { weekday:'short' }), dateLabel:d.toLocaleDateString([], { day:'numeric', month:'short' }), steps:Number(found?.steps || 0), isToday:dateStr === todayStr };
  });
  const weekMax = Math.max(...weekData.map(d => d.steps), 1);
  const weekTotal = weekData.reduce((sum, d) => sum + d.steps, 0);
  const activeDays = weekData.filter(d => d.steps > 0).length;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  function handleLogSteps() {
    const steps = parseInt(manualSteps, 10);
    if (!steps || steps < 1 || steps > 99999) { showToast('Enter a number between 1 and 99,999'); return; }
    if (!manualDate || manualDate > todayStr) { showToast('Choose today or an earlier date'); return; }
    if (!/^\d{2}:\d{2}$/.test(manualTime)) { showToast('Choose a valid time'); return; }

    start(async () => {
      const result = await logStepsAction({ steps, source:'manual', stepDate:manualDate, stepTime:manualTime });
      if (result?.error) { showToast(result.error); return; }
      const loggedDate = manualDate;
      setManualSteps('');
      setManualDate(todayStr);
      setManualTime(new Date().toTimeString().slice(0, 5));
      showToast(`+${steps.toLocaleString()} steps logged for ${formatDateLabel(loggedDate)}`);
      router.refresh();
    });
  }

  return (
    <>
      {toast && <div style={{position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',background:'var(--ink)',color:'#fff',borderRadius:999,padding:'10px 18px',fontSize:13,fontWeight:600,zIndex:999,whiteSpace:'nowrap',pointerEvents:'none'}}>{toast}</div>}

      <div className="screen-pad">
        <span className="eyebrow">Movement</span>
        <h1 style={{fontSize:22}}>Your movement</h1>
        <p className="subhead">Record your movement whenever you want. There is no daily target to hit.</p>
      </div>

      <div className="screen-pad" style={{paddingTop:6}}>
        <div className="hub-card" style={{padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
            <div className="t">Steps today</div>
            {lastSync && <span style={{fontSize:10.5,color:'var(--ink-45)',fontWeight:500}}>{source === 'manual' ? 'Manual' : source === 'healthkit' ? 'Apple Health' : 'Health Connect'} · {new Date(lastSync).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}
          </div>
          <div className="mono" style={{fontSize:38,fontWeight:800,marginTop:4}}>{todaySteps.toLocaleString()}</div>
          <div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:4}}>steps recorded today</div>
        </div>

        <div className="hub-card" style={{marginTop:10,padding:16}}>
          <div style={{fontWeight:800,fontSize:15}}>Add movement</div>
          <div style={{fontSize:12,color:'var(--ink-45)',marginTop:3}}>Enter the steps you want to record. You can add more later.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginTop:13}}>
            <label style={{fontSize:10.5,fontWeight:800,color:'var(--ink-70)'}}>Steps<input inputMode="numeric" type="number" min="1" max="99999" value={manualSteps} onChange={e => setManualSteps(e.target.value)} placeholder="e.g. 4500" style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid var(--line)',borderRadius:11,padding:'11px 10px',fontSize:14,fontFamily:'inherit',outline:'none'}} /></label>
            <label style={{fontSize:10.5,fontWeight:800,color:'var(--ink-70)'}}>Date<input type="date" value={manualDate} max={todayStr} onChange={e => setManualDate(e.target.value)} style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid var(--line)',borderRadius:11,padding:'10px 8px',fontSize:12,fontFamily:'inherit',outline:'none'}} /></label>
          </div>
          <label style={{display:'block',fontSize:10.5,fontWeight:800,color:'var(--ink-70)',marginTop:9}}>Time<input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid var(--line)',borderRadius:11,padding:'10px',fontSize:12,fontFamily:'inherit',outline:'none'}} /></label>
          <button type="button" className="btn-primary" disabled={isPending} onClick={handleLogSteps} style={{width:'100%',marginTop:12}}>{isPending ? 'Saving…' : 'Add steps'}</button>
        </div>

        <div className="hub-grid" style={{marginTop:10}}>
          <div className="hub-card"><div className="t">Days with movement</div><div className="mono" style={{fontSize:23,fontWeight:800}}>{activeDays}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>in the last 7 days</div></div>
          <div className="hub-card"><div className="t">Lifetime steps</div><div className="mono" style={{fontSize:20,fontWeight:800}}>{totalSteps >= 1000000 ? `${(totalSteps/1000000).toFixed(1)}M` : totalSteps >= 1000 ? `${Math.round(totalSteps/1000)}K` : totalSteps.toLocaleString()}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>all recorded movement</div></div>
        </div>

        <div className="hub-card" style={{marginTop:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}>
            <div className="t">Last 7 days</div>
            <span className="mono" style={{fontSize:13,fontWeight:700}}>{weekTotal.toLocaleString()} steps</span>
          </div>
          <div style={{display:'flex',alignItems:'flex-end',gap:7,height:112}}>
            {weekData.map(d => {
              const h = d.steps > 0 ? Math.max(8, Math.round((d.steps / weekMax) * 78)) : 6;
              return <div key={d.dateStr} title={`${formatDateLabel(d.dateStr)}: ${d.steps.toLocaleString()} steps`} style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',gap:5}}>
                <span className="mono" style={{fontSize:8,color:'var(--ink-45)',minHeight:10}}>{d.steps > 0 ? (d.steps >= 1000 ? `${Math.round(d.steps/100)/10}K` : d.steps) : ''}</span>
                <div style={{width:'100%',height:h,background:d.isToday ? 'var(--green)' : 'var(--green-soft)',borderRadius:6,transition:'height .3s ease'}} />
                <span style={{fontSize:9,color:d.isToday ? 'var(--green-dark)' : 'var(--ink-45)',fontWeight:d.isToday ? 700 : 500}}>{d.day}</span>
                <span style={{fontSize:8,color:'var(--ink-45)'}}>{d.dateLabel}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
    </>
  );
}
