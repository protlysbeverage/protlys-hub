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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MovementClient({
  profile, todaySteps, lastSync, source, weekSteps, recentAchievements, currentGoal, activityLevel,
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [panel, setPanel] = useState(activityLevel ? null : 'setup');
  const [manualSteps, setManualSteps] = useState('');
  const [toast, setToast] = useState('');
  const [celebrate, setCelebrate] = useState(null);

  const stepGoal = currentGoal || profile?.step_goal || 7500;
  const streak = profile?.step_streak || 0;
  const totalSteps = profile?.total_steps || 0;
  const progressPct = Math.min(100, Math.round((todaySteps / stepGoal) * 100));

  // Build week chart data — last 7 days
  const today = new Date();
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - 6 + i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = weekSteps.find(w => w.step_date === dateStr);
    return { day: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1], steps: found?.steps || 0, isToday: i === 6 };
  });
  const weekMax = Math.max(...weekData.map(d => d.steps), stepGoal, 1);
  const weekTotal = weekData.reduce((s, d) => s + d.steps, 0);

  // Milestone ladder
  const ladder = GOAL_LADDER[activityLevel || 'moderate'] || GOAL_LADDER.moderate;
  const currentIdx = ladder.indexOf(stepGoal);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  function handleLogSteps() {
    const s = parseInt(manualSteps);
    if (!s || s < 1 || s > 99999) { showToast('Enter a number between 1 and 99,999'); return; }
    start(async () => {
      const result = await logStepsAction({ steps: s, source: 'manual' });
      if (result?.error) { showToast(result.error); return; }
      if (result.totalSteps >= result.goal) {
        setCelebrate({ steps: result.totalSteps, goal: result.goal });
        setTimeout(() => setCelebrate(null), 4000);
      }
      setManualSteps('');
      setPanel(null);
      showToast(`+${s.toLocaleString()} steps logged`);
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
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
          background:'var(--ink)', color:'#fff', borderRadius:999, padding:'10px 18px',
          fontSize:13, fontWeight:600, zIndex:999, whiteSpace:'nowrap', pointerEvents:'none' }}>
          {toast}
        </div>
      )}

      {/* Goal celebration */}
      {celebrate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,42,74,.7)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:24, padding:32, textAlign:'center', maxWidth:280, margin:20 }}>
            <div style={{ fontSize:52 }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:20, color:'var(--ink)', marginTop:8 }}>Goal reached!</div>
            <div style={{ fontSize:14, color:'var(--ink-70)', marginTop:6 }}>
              {celebrate.steps.toLocaleString()} steps · {celebrate.goal.toLocaleString()} goal
            </div>
            <div style={{ fontSize:13, color:'var(--green-dark)', fontWeight:700, marginTop:8 }}>
              New goal unlocked! +25 Protlys Points
            </div>
            <button className="btn-primary" style={{ marginTop:16 }} onClick={() => setCelebrate(null)}>Keep going →</button>
          </div>
        </div>
      )}

      <div className="screen-pad">
        <span className="eyebrow">Movement</span>
        <h1 style={{ fontSize: 22 }}>
          {activityLevel ? 'Today\'s movement' : 'Set up your movement'}
        </h1>
      </div>

      <div className="screen-pad" style={{ paddingTop: 6 }}>

        {/* ── SETUP (no activity level yet) ── */}
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

        {/* ── MAIN DASHBOARD ── */}
        {panel !== 'setup' && (
          <>
            {/* Today's progress */}
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
              <div className="pbar" style={{ marginTop:8 }}>
                <div className="pbar-fill" style={{ width:`${progressPct}%`, transition:'width .6s ease' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                <span style={{ fontSize:11.5, color:'var(--ink-45)' }}>{progressPct}% of daily goal</span>
                {progressPct >= 100 && <span style={{ fontSize:11.5, color:'var(--green-dark)', fontWeight:700 }}>✓ Goal reached!</span>}
              </div>
            </div>

            {/* Streak + Total */}
            <div className="hub-grid" style={{ marginTop:10 }}>
              <div className="hub-card">
                <div className="t">Step streak</div>
                <div className="mono" style={{ fontSize:24, fontWeight:700 }}>
                  {streak} {streak === 1 ? 'day' : 'days'}
                </div>
              </div>
              <div className="hub-card">
                <div className="t">Lifetime steps</div>
                <div className="mono" style={{ fontSize:20, fontWeight:700 }}>
                  {totalSteps >= 1000000
                    ? (totalSteps / 1000000).toFixed(1) + 'M'
                    : totalSteps >= 1000
                    ? Math.round(totalSteps / 1000) + 'K'
                    : totalSteps.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Weekly bar chart */}
            <div className="hub-card" style={{ marginTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
                <div className="t">This week</div>
                <span className="mono" style={{ fontSize:13, fontWeight:700 }}>{weekTotal.toLocaleString()} steps</span>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:72 }}>
                {weekData.map((d, i) => {
                  const h = Math.max(4, Math.round((d.steps / weekMax) * 72));
                  const hitGoal = d.steps >= stepGoal;
                  return (
                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <div style={{
                        width:'100%', height:h,
                        background: d.isToday ? 'var(--green)' : hitGoal ? 'var(--green-soft)' : 'var(--ink-20)',
                        borderRadius:6, border: hitGoal && !d.isToday ? '1.5px solid var(--green)' : 'none',
                        transition:'height .3s ease',
                      }} />
                      <span style={{ fontSize:9, color: d.isToday ? 'var(--green-dark)' : 'var(--ink-45)',
                        fontWeight: d.isToday ? 700 : 500 }}>{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart milestone ladder */}
            <div className="hub-card" style={{ marginTop:10 }}>
              <div className="t">Your milestone journey</div>
              <div style={{ display:'flex', gap:6, marginTop:10, overflowX:'auto', paddingBottom:4 }}>
                {ladder.map((target, i) => {
                  const done = i < currentIdx;
                  const current = i === currentIdx;
                  return (
                    <div key={target} style={{
                      minWidth:72, borderRadius:12, padding:'10px 8px', textAlign:'center',
                      background: done ? 'var(--green)' : current ? 'var(--green-soft)' : 'var(--ink-20)',
                      border: current ? '2px solid var(--green)' : '2px solid transparent',
                      flexShrink:0,
                    }}>
                      <div style={{ fontSize:14 }}>{done ? '✓' : current ? '🎯' : '🔒'}</div>
                      <div className="mono" style={{ fontSize:11, fontWeight:700,
                        color: done ? '#fff' : current ? 'var(--green-dark)' : 'var(--ink-45)', marginTop:3 }}>
                        {target >= 1000 ? (target/1000) + 'K' : target}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent achievements */}
            {recentAchievements.length > 0 && (
              <div className="hub-card" style={{ marginTop:10 }}>
                <div className="t">Recent achievements</div>
                {recentAchievements.map((a, i) => (
                  <div key={i} className="list-row" style={{ cursor:'default', paddingTop:10, paddingBottom:10 }}>
                    <div className="left" style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:22 }}>{a.icon}</span>
                      <div>
                        <span className="lbl" style={{ fontSize:13 }}>{a.name}</span>
                        <div style={{ fontSize:11.5, color:'var(--ink-45)' }}>{a.description}</div>
                      </div>
                    </div>
                    <span style={{ fontSize:11, color:'var(--ink-45)' }}>
                      {new Date(a.earned_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Log steps panel */}
            {panel === 'log' && (
              <div style={{ marginTop:16 }}>
                <div className="hr-tight" />
                <p className="subhead" style={{ marginBottom:10 }}>How many steps did you do?</p>
                <div style={{ display:'flex', gap:10 }}>
                  <input
                    type="number" value={manualSteps} onChange={e => setManualSteps(e.target.value)}
                    placeholder="e.g. 3500" min="1" max="99999"
                    className="field-input mono" style={{ fontSize:18, fontWeight:600, flex:1 }}
                    onKeyDown={e => e.key === 'Enter' && handleLogSteps()}
                  />
                  <button className="btn-primary" style={{ width:'auto', padding:'12px 20px', marginTop:0 }}
                    onClick={handleLogSteps} disabled={isPending}>
                    {isPending ? '…' : 'Log'}
                  </button>
                </div>
                <button className="link-btn" style={{ marginTop:10 }} onClick={() => setPanel(null)}>Cancel</button>
              </div>
            )}

            {/* Quick actions */}
            <div className="qa-grid" style={{ marginTop:16 }}>
              <button className="qa-btn" onClick={() => setPanel(panel === 'log' ? null : 'log')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/></svg>
                <span>Log steps</span>
              </button>
              <button className="qa-btn" onClick={() => setPanel(panel === 'setup' ? null : 'setup')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                <span>Change activity</span>
              </button>
            </div>

            {/* HealthKit / Health Connect info */}
            <div style={{ marginTop:20, background:'var(--green-soft)', borderRadius:16, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--green-dark)', marginBottom:6 }}>
                📱 Auto-sync coming soon
              </div>
              <p style={{ fontSize:12.5, color:'var(--ink-70)', lineHeight:1.55 }}>
                The Protlys Hub web app can't directly access Apple HealthKit or Android Health Connect
                — those require a native app. Log steps manually for now. The Protlys native app
                (coming soon) will sync automatically.
              </p>
            </div>

            <p className="disclaimer" style={{ marginTop:14 }}>
              Steps are private to your account by default. You can choose to share milestones to the community.
            </p>
          </>
        )}
      </div>
    </>
  );
}
