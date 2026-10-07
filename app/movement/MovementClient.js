'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logStepsAction } from '@/app/movement-actions';
import MovementActivity from '@/components/MovementActivity';
import ShareCardSheet, { ShareIconButton } from '@/components/ShareCardSheet';
import { getShareData } from '@/lib/share-data';

function localDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday:'short', day:'numeric', month:'short' });
}

function caloriesForSteps(steps) { return Math.round(Number(steps || 0) * 0.04); }
function distanceForSteps(steps) { return Number(steps || 0) * 0.00075; }

export default function MovementClient({ profile, todaySteps = 0, lastSync, source, weekSteps = [], movementDays = [], userId = null, currentStreak = 0, currentGoal = 7500 }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [manualSteps, setManualSteps] = useState('');
  const [manualDate, setManualDate] = useState(localDateStr());
  const [manualTime, setManualTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [toast, setToast] = useState('');
  const [shareData, setShareData] = useState(null);
  const addStepsInputRef = useRef(null);

  const totalSteps = Number(profile?.total_steps || 0);
  const today = new Date();
  const todayStr = localDateStr(today);
  const shareContext = { rows: movementDays, todaySteps, lifetimeSteps: totalSteps, currentStreak };
  const stepsShareData = getShareData('steps_today', shareContext);
  const activeDaysShareData = getShareData('movement_days', shareContext);
  const recent = stepsShareData.weeklyDays.map(d => ({ dateStr:d.key, steps:d.steps }));
  const recentTotal = recent.reduce((sum, d) => sum + d.steps, 0);
  const recentActiveDays = activeDaysShareData.value;
  const todayCalories = caloriesForSteps(todaySteps);
  const todayDistance = distanceForSteps(todaySteps);
  const hasMovement = stepsShareData.hasData;

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800); }
  function openShare(metric) { setShareData(getShareData(metric, shareContext)); }

  function handleLogSteps() {
    const steps = parseInt(manualSteps, 10);
    if (!steps || steps < 1 || steps > 99999) { showToast('Enter a number between 1 and 99,999'); return; }
    if (!manualDate || manualDate > todayStr) { showToast('Choose today or an earlier date'); return; }
    if (!/^\d{2}:\d{2}$/.test(manualTime)) { showToast('Choose a valid time'); return; }
    start(async () => {
      const result = await logStepsAction({ steps, source:'manual', stepDate:manualDate, stepTime:manualTime });
      if (result?.error) { showToast(result.error); return; }
      const loggedDate = manualDate;
      setManualSteps(''); setManualDate(todayStr); setManualTime(new Date().toTimeString().slice(0,5));
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
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:32}}>
            <div className="t">Steps today</div>
            <div style={{display:'flex',alignItems:'center',gap:0,marginRight:-8}}>
              {lastSync && <span style={{fontSize:12,color:'var(--ink-45)',fontWeight:500,whiteSpace:'nowrap'}}>{source === 'manual' ? 'Manual' : source === 'healthkit' ? 'Apple Health' : 'Health Connect'} · {new Date(lastSync).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}
              {hasMovement && <ShareIconButton variant="movement" label="Share steps today" onClick={()=>openShare('steps_today')}/>} 
            </div>
          </div>
          <div className="mono" style={{fontSize:38,fontWeight:800,marginTop:8}}>{todaySteps.toLocaleString()}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:9}}>
            <div style={{display:'flex',flexDirection:'column',padding:16,minHeight:96,borderRadius:11,background:'var(--green-soft)',boxSizing:'border-box'}}><div style={{minHeight:20,display:'flex',alignItems:'flex-start'}}><div className="t">Distance</div></div><div className="mono" style={{fontSize:18,lineHeight:1.2,fontWeight:800,marginTop:'auto'}}>{todayDistance.toFixed(1)} km</div></div>
            <div style={{display:'flex',flexDirection:'column',padding:16,minHeight:96,borderRadius:11,background:'var(--green-soft)',boxSizing:'border-box'}}><div style={{minHeight:20,display:'flex',alignItems:'flex-start'}}><div className="t">Calories</div></div><div className="mono" style={{fontSize:18,lineHeight:1.2,fontWeight:800,marginTop:'auto'}}>≈ {todayCalories}</div></div>
          </div>
          <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:7}}>Distance and calories are estimates from recorded steps.</div>
        </div>

        <div className="hub-card" style={{marginTop:10,padding:16}}>
          <div style={{fontWeight:800,fontSize:15}}>Add movement</div>
          <div style={{fontSize:12,color:'var(--ink-45)',marginTop:3}}>Enter the steps you want to record. You can add more later.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginTop:13}}>
            <label style={{fontSize:10.5,fontWeight:800,color:'var(--ink-70)'}}>Steps<input inputMode="numeric" type="number" min="1" max="99999" value={manualSteps} ref={addStepsInputRef} onChange={e => setManualSteps(e.target.value)} placeholder="e.g. 4500" style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid var(--line)',borderRadius:11,padding:'11px 10px',fontSize:14,fontFamily:'inherit',outline:'none'}} /></label>
            <label style={{fontSize:10.5,fontWeight:800,color:'var(--ink-70)'}}>Date<input type="date" value={manualDate} max={todayStr} onChange={e => setManualDate(e.target.value)} style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid var(--line)',borderRadius:11,padding:'10px 8px',fontSize:12,fontFamily:'inherit',outline:'none'}} /></label>
          </div>
          <label style={{display:'block',fontSize:10.5,fontWeight:800,color:'var(--ink-70)',marginTop:9}}>Time<input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid var(--line)',borderRadius:11,padding:'10px',fontSize:12,fontFamily:'inherit',outline:'none'}} /></label>
          <button type="button" className="btn-primary" disabled={isPending} onClick={handleLogSteps} style={{width:'100%',marginTop:12}}>{isPending ? 'Saving…' : 'Add steps'}</button>
        </div>

        <div className="hub-grid" style={{marginTop:10}}>
          <div className="hub-card" style={{position:'relative',minWidth:0}}>
            {hasMovement && <div style={{position:'absolute',top:10,right:10}}><ShareIconButton variant="movement" label="Share active days" onClick={()=>openShare('movement_days')}/></div>}
            <div className="t" style={{paddingRight:46}}>Days with movement</div>
            <div className="mono" style={{fontSize:23,fontWeight:800}}>{recentActiveDays}</div>
            <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>in the displayed range</div>
          </div>
          <div className="hub-card" style={{position:'relative',minWidth:0}}>
            {hasMovement && <div style={{position:'absolute',top:10,right:10}}><ShareIconButton variant="movement" label="Share lifetime steps" onClick={()=>openShare('lifetime_steps')}/></div>}
            <div className="t" style={{paddingRight:46}}>Lifetime steps</div>
            <div className="mono" style={{fontSize:20,fontWeight:800}}>{totalSteps >= 1000000 ? `${(totalSteps/1000000).toFixed(1)}M` : totalSteps >= 1000 ? `${Math.round(totalSteps/1000)}K` : totalSteps.toLocaleString()}</div>
            <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>all recorded movement</div>
          </div>
        </div>

        <div className="hub-card" style={{marginTop:10,padding:16}}>
          <div className="t">7-day totals</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:9}}>
            <div style={{fontSize:12,color:'var(--ink-70)'}}><strong className="mono">{recentTotal.toLocaleString()}</strong> steps</div>
            <div style={{fontSize:12,color:'var(--ink-70)',textAlign:'right'}}><strong className="mono">≈ {caloriesForSteps(recentTotal)}</strong> calories</div>
          </div>
        </div>

        <MovementActivity days={movementDays.length ? movementDays : weekSteps} title="Recent activity" userId={userId} stepGoal={currentGoal} currentStreak={currentStreak} profile={profile} onAddSteps={()=>{const node=addStepsInputRef.current;node?.scrollIntoView({behavior:'smooth',block:'center'});node?.focus();}} />
      </div>
      {shareData && <ShareCardSheet open={!!shareData} onClose={()=>setShareData(null)} data={shareData} username={profile?.display_name || 'protlys'} avatarUrl={profile?.avatar_url || ''} onAddSteps={()=>{const node=addStepsInputRef.current;node?.scrollIntoView({behavior:'smooth',block:'center'});node?.focus();}} />}
    </>
  );
}
