'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logStepsAction, setActivityLevelAction } from '@/app/movement-actions';

const ACTIVITY_OPTIONS = [
  { value: 'low',      label: 'Low',      desc: 'Mostly sitting, light walks' },
  { value: 'moderate', label: 'Moderate', desc: 'Active a few days a week' },
  { value: 'high',     label: 'High',     desc: 'Daily exercise or sport' },
];

const GOAL_LADDER = {
  low:      [3000, 4000, 5000, 7500, 10000],
  moderate: [5000, 7500, 10000, 12500, 15000],
  high:     [7500, 10000, 12500, 15000, 20000],
};

function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function MovementClient({
  profile, todaySteps, lastSync, source, weekSteps, recentAchievements, currentGoal, activityLevel,
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [panel, setPanel] = useState(activityLevel ? null : 'setup');
  const [manualSteps, setManualSteps] = useState('');
  const [manualDate, setManualDate] = useState(localDateStr());
  const [manualTime, setManualTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [toast, setToast] = useState('');
  const [celebrate, setCelebrate] = useState(null);

  const stepGoal = currentGoal || profile?.step_goal || 7500;
  const streak = profile?.step_streak || 0;
  const totalSteps = profile?.total_steps || 0;
  const progressPct = Math.min(100, Math.round((todaySteps / stepGoal) * 100));
  const today = new Date();
  const todayStr = localDateStr(today);

  // Build a true seven-day local-calendar chart. Every day gets a visible bar,
  // including zero-step days, so entries never collapse into one apparent bar.
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - 6 + i);
    const dateStr = localDateStr(d);
    const found = weekSteps.find(w => w.step_date === dateStr);
    return {
      dateStr,
      day: d.toLocaleDateString([], { weekday: 'short' }),
      dateLabel: d.toLocaleDateString([], { day: 'numeric', month: 'short' }),
      steps: found?.steps || 0,
      isToday: dateStr === todayStr,
    };
  });
  const weekMax = Math.max(...weekData.map(d => d.steps), stepGoal, 1);
  const weekTotal = weekData.reduce((s, d) => s + d.steps, 0);

  const ladder = GOAL_LADDER[activityLevel || 'moderate'] || GOAL_LADDER.moderate;
  const currentIdx = Math.max(0, ladder.indexOf(stepGoal));
  const nextMilestone = ladder[currentIdx + 1] || null;
  const remainingToNext = nextMilestone ? Math.max(0, nextMilestone - todaySteps) : 0;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  function handleLogSteps() {
    const s = parseInt(manualSteps, 10);
    if (!s || s < 1 || s > 99999) { showToast('Enter a number between 1 and 99,999'); return; }
    if (!manualDate || manualDate > todayStr) { showToast('Choose today or an earlier date'); return; }
    if (!/^\d{2}:\d{2}$/.test(manualTime)) { showToast('Choose a valid time'); return; }

    start(async () => {
      const result = await logStepsAction({ steps: s, source: 'manual', stepDate: manualDate, stepTime: manualTime });
      if (result?.error) { showToast(result.error); return; }
      if (result.milestoneReached) {
        setCelebrate({ steps: result.totalSteps, goal: result.goal, nextGoal: result.nextGoal });
        setTimeout(() => setCelebrate(null), 4000);
      }
      setManualSteps('');
      setManualDate(todayStr);
      setManualTime(new Date().toTimeString().slice(0, 5));
      setPanel(null);
      showToast(`+${s.toLocaleString()} steps logged for ${formatDateLabel(manualDate)}`);
      router.refresh();
    });
  }

  function handleSetActivity(level) {
    start(async () => {
      await setActivityLevelAction({ activityLevel: level });
      setPanel(null);
      showToast('Activity level saved — your first goal is set!');
      router.refresh();
    });
  }

  return (
    <>
      {toast && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
          background:'var(--ink)', color:'#fff', borderRadius:999, padding:'10px 18px',
          fontSize:13, fontWeight:600, zIndex:999, whiteSpace:'nowrap', pointerEvents:'none' }}>
          {toast}
        </div>
      )}

      {celebrate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,42,74,.7)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:24, padding:32, textAlign:'center', maxWidth:300, margin:20 }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--green-soft)', color:'var(--green-dark)',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', fontSize:24, fontWeight:800 }}>✓</div>
            <div style={{ fontWeight:800, fontSize:20, color:'var(--ink)', marginTop:12 }}>Milestone reached</div>
            <div style={{ fontSize:14, color:'var(--ink-70)', marginTop:6 }}>
              {celebrate.steps.toLocaleString()} steps · {celebrate.goal.toLocaleString()} goal
            </div>
            {celebrate.nextGoal && (
              <div style={{ fontSize:13, color:'var(--green-dark)', fontWeight:700, marginTop:10 }}>
                Next milestone: {celebrate.nextGoal.toLocaleString()} steps
              </div>
            )}
            <button className="btn-primary" style={{ marginTop:16 }} onClick={() => setCelebrate(null)}>Keep going</button>
          </div>
        </div>
      )}

      <div className="screen-pad">
        <span className="eyebrow">Movement</span>
        <h1 style={{ fontSize: 22 }}>{activityLevel ? 'Today\'s movement' : 'Set up your movement'}</h1>
      </div>

      <div className="screen-pad" style={{ paddingTop: 6 }}>
        {panel === 'setup' && (
          <div>
            <p className="subhead">Tell us your activity level to set your first personalised step goal.</p>
            {ACTIVITY_OPTIONS.map(opt => (
              <div key={opt.value} className="list-row" style={{ cursor:'pointer', borderRadius:14, marginBottom:8,
                border:'2px solid var(--line)', background:'#fff', padding:'14px 16px' }}
                onClick={() => !isPending && handleSetActivity(opt.value)}>
                <div className="left">
                  <span className="lbl">{opt.label}</span>
                  <div style={{ fontSize:12, color:'var(--ink-45)', marginTop:2 }}>{opt.desc}</div>
                </div>
                <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            ))}
          </div>
        )}

        {panel !== 'setup' && (
          <>
            <div className="hub-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div className="t">Today's steps</div>
                {lastSync && (
                  <span style={{ fontSize:10.5, color:'var(--ink-45)', fontWeight:500 }}>
                    {source === 'manual' ? 'Manual' : source === 'healthkit' ? 'Apple Health' : 'Health Connect'}
                    {' '}· {new Date(lastSync).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                  </span>
                )}
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                <span className="mono" style={{ fontSize:36, fontWeight:700 }}>{todaySteps.toLocaleString()}</span>
                <span className="mono" style={{ fontSize:14, color:'var(--ink-45)' }}>/ {stepGoal.toLocaleString()}</span>
              </div>
              <div className="pbar" style={{ marginTop:8 }}><div className="pbar-fill" style={{ width:`${progressPct}%`, transition:'width .6s ease' }} /></div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <span style={{ fontSize:11.5, color:'var(--ink-45)' }}>{progressPct}% of daily goal</span>
                {progressPct >= 100 && <span style={{ fontSize:11.5, color:'var(--green-dark)', fontWeight:700 }}>Goal reached</span>}
              </div>
            </div>

            <div className="hub-grid" style={{ marginTop:10 }}>
              <div className="hub-card"><div className="t">Step streak</div><div className="mono" style={{ fontSize:24, fontWeight:700 }}>{streak} {streak === 1 ? 'day' : 'days'}</div></div>
              <div className="hub-card"><div className="t">Lifetime steps</div><div className="mono" style={{ fontSize:20, fontWeight:700 }}>{totalSteps >= 1000000 ? (totalSteps / 1000000).toFixed(1) + 'M' : totalSteps >= 1000 ? Math.round(totalSteps / 1000) + 'K' : totalSteps.toLocaleString()}</div></div>
            </div>

            <div className="hub-card" style={{ marginTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
                <div className="t">Last 7 days</div>
                <span className="mono" style={{ fontSize:13, fontWeight:700 }}>{weekTotal.toLocaleString()} steps</span>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:7, height:104 }}>
                {weekData.map(d => {
                  const h = d.steps > 0 ? Math.max(8, Math.round((d.steps / weekMax) * 78)) : 6;
                  const hitGoal = d.steps >= stepGoal;
                  return (
                    <div key={d.dateStr} title={`${formatDateLabel(d.dateStr)}: ${d.steps.toLocaleString()} steps`}
                      style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', gap:5 }}>
                      <span className="mono" style={{ fontSize:8, color:'var(--ink-45)', minHeight:10 }}>{d.steps > 0 ? (d.steps >= 1000 ? `${Math.round(d.steps / 100) / 10}K` : d.steps) : ''}</span>
                      <div style={{ width:'100%', height:h, background:d.isToday ? 'var(--green)' : hitGoal ? 'var(--green-soft)' : 'var(--ink-20)',
                        borderRadius:6, border:hitGoal && !d.isToday ? '1.5px solid var(--green)' : 'none', transition:'height .3s ease' }} />
                      <span style={{ fontSize:9, color:d.isToday ? 'var(--green-dark)' : 'var(--ink-45)', fontWeight:d.isToday ? 700 : 500 }}>{d.day}</span>
                      <span style={{ fontSize:8, color:'var(--ink-45)' }}>{d.dateLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hub-card" style={{ marginTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div>
                  <div className="t">Step milestones</div>
                  <div style={{ fontSize:12, color:'var(--ink-45)', marginTop:3 }}>Progress based on your {activityLevel || 'moderate'} activity level</div>
                </div>
                {nextMilestone && <span className="mono" style={{ fontSize:11, fontWeight:700, color:'var(--green-dark)', whiteSpace:'nowrap' }}>{remainingToNext.toLocaleString()} to go</span>}
              </div>

              <div style={{ marginTop:16 }}>
                {ladder.map((target, i) => {
                  const done = i < currentIdx || (i === currentIdx && todaySteps >= target);
                  const current = i === currentIdx && !done;
                  const locked = i > currentIdx;
                  const previousTarget = i > 0 ? ladder[i - 1] : 0;
                  const pct = Math.min(100, Math.max(0, ((todaySteps - previousTarget) / Math.max(1, target - previousTarget)) * 100));
                  return (
                    <div key={target} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i === ladder.length - 1 ? 0 : 10 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                        background:done ? 'var(--green)' : current ? 'var(--green-soft)' : 'var(--ink-20)',
                        color:done ? '#fff' : current ? 'var(--green-dark)' : 'var(--ink-45)',
                        border:current ? '2px solid var(--green)' : '1px solid transparent', fontSize:12, fontWeight:800 }}>{done ? '✓' : i + 1}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                          <span className="mono" style={{ fontSize:12, fontWeight:800, color:locked ? 'var(--ink-45)' : 'var(--ink)' }}>{target.toLocaleString()}</span>
                          <span style={{ fontSize:10, color:done ? 'var(--green-dark)' : current ? 'var(--green-dark)' : 'var(--ink-45)', fontWeight:done || current ? 700 : 500 }}>
                            {done ? 'Completed' : current ? 'Current' : 'Locked'}
                          </span>
                        </div>
                        <div style={{ height:5, marginTop:5, background:'var(--ink-10)', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${done ? 100 : current ? pct : 0}%`, background:'var(--green)', borderRadius:99, transition:'width .4s ease' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop:14, padding:'10px 12px', borderRadius:12, background:'var(--green-soft)' }}>
                <span style={{ fontSize:12, color:'var(--green-dark)', fontWeight:700 }}>
                  {nextMilestone ? `${remainingToNext.toLocaleString()} steps until ${nextMilestone.toLocaleString()}` : 'Top milestone reached'}
                </span>
              </div>
            </div>

            {recentAchievements.length > 0 && (
              <div className="hub-card" style={{ marginTop:10 }}>
                <div className="t">Recent achievements</div>
                {recentAchievements.map((a, i) => (
                  <div key={i} className="list-row" style={{ cursor:'default', paddingTop:10, paddingBottom:10 }}>
                    <div className="left" style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:22 }}>{a.icon}</span>
                      <div><span className="lbl" style={{ fontSize:13 }}>{a.name}</span><div style={{ fontSize:11.5, color:'var(--ink-45)' }}>{a.description}</div></div>
                    </div>
                    <span style={{ fontSize:11, color:'var(--ink-45)' }}>{new Date(a.earned_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {panel === 'log' && (
              <div style={{ marginTop:16 }}>
                <div className="hr-tight" />
                <p className="subhead" style={{ marginBottom:10 }}>Log your steps</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <label style={{ fontSize:11.5, fontWeight:700, color:'var(--ink-70)' }}>
                    Date
                    <input type="date" value={manualDate} max={todayStr} onChange={e => setManualDate(e.target.value)}
                      className="field-input" style={{ width:'100%', marginTop:5 }} />
                  </label>
                  <label style={{ fontSize:11.5, fontWeight:700, color:'var(--ink-70)' }}>
                    Time
                    <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)}
                      className="field-input" style={{ width:'100%', marginTop:5 }} />
                  </label>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <input type="number" value={manualSteps} onChange={e => setManualSteps(e.target.value)} placeholder="e.g. 3500" min="1" max="99999"
                    className="field-input mono" style={{ fontSize:18, fontWeight:600, flex:1 }} onKeyDown={e => e.key === 'Enter' && handleLogSteps()} />
                  <button className="btn-primary" style={{ width:'auto', padding:'12px 20px', marginTop:0 }} onClick={handleLogSteps} disabled={isPending}>
                    {isPending ? '…' : 'Log'}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'var(--ink-45)', marginTop:7 }}>Entries on the same date are added together.</div>
                <button className="link-btn" style={{ marginTop:10 }} onClick={() => setPanel(null)}>Cancel</button>
              </div>
            )}

            <div className="qa-grid" style={{ marginTop:16 }}>
              <button className="qa-btn" onClick={() => setPanel(panel === 'log' ? null : 'log')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                <span>Log steps</span>
              </button>
              <button className="qa-btn" onClick={() => setPanel(panel === 'setup' ? null : 'setup')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                <span>Change activity</span>
              </button>
            </div>

            <div style={{ marginTop:20, background:'var(--green-soft)', borderRadius:16, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--green-dark)', marginBottom:6 }}>Auto-sync coming soon</div>
              <p style={{ fontSize:12.5, color:'var(--ink-70)', lineHeight:1.55 }}>
                The Protlys Hub web app can't directly access Apple HealthKit or Android Health Connect — those require a native app. Log steps manually for now. The Protlys native app will sync automatically.
              </p>
            </div>

            <p className="disclaimer" style={{ marginTop:14 }}>Steps are private to your account by default. You can choose to share milestones to the community.</p>
          </>
        )}
      </div>
    </>
  );
}
