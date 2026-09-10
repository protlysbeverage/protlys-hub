'use client';

import { useMemo, useState } from 'react';

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayDiff(a, b) {
  return Math.round((parseKey(a) - parseKey(b)) / 86400000);
}

function streaks(keys) {
  const sorted = [...new Set(keys)].sort();
  if (!sorted.length) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (dayDiff(sorted[i], sorted[i - 1]) === 1) run += 1;
    else run = 1;
    best = Math.max(best, run);
  }

  const today = new Date();
  const todayKey = dateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  let endKey = sorted[sorted.length - 1];
  if (endKey !== todayKey && endKey !== yesterdayKey) return { current: 0, best };

  let current = 1;
  for (let i = sorted.length - 1; i > 0; i -= 1) {
    if (dayDiff(sorted[i], sorted[i - 1]) === 1) current += 1;
    else break;
  }
  return { current, best };
}

function caloriesForSteps(steps) {
  // Simple active-calorie estimate until user-specific weight is available.
  return Math.round(Number(steps || 0) * 0.04);
}

function distanceForSteps(steps) {
  return Number(steps || 0) * 0.00075;
}

export default function MovementActivity({ days = [], compact = false, title = 'Recent activity' }) {
  const [expanded, setExpanded] = useState(false);
  const byDate = useMemo(() => new Map(days.map(d => [d.step_date, Number(d.steps || 0)])), [days]);
  const movementKeys = useMemo(() => days.filter(d => Number(d.steps || 0) > 0).map(d => d.step_date), [days]);
  const { current, best } = useMemo(() => streaks(movementKeys), [movementKeys]);

  const today = new Date();
  const todayKey = dateKey(today);
  const recent = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - 6 + i);
    const key = dateKey(d);
    return { key, date: d, steps: byDate.get(key) || 0, isToday: key === todayKey };
  });
  const max = Math.max(...recent.map(d => d.steps), 1);
  const recentTotal = recent.reduce((sum, d) => sum + d.steps, 0);
  const recentCalories = caloriesForSteps(recentTotal);

  const calendar = useMemo(() => {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const leading = first.getDay();
    const cells = [];
    for (let i = 0; i < leading; i += 1) cells.push(null);
    for (let d = 1; d <= last.getDate(); d += 1) cells.push(new Date(today.getFullYear(), today.getMonth(), d));
    return cells;
  }, [today.getFullYear(), today.getMonth()]);

  return (
    <div className="hub-card" style={{ marginTop: 10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10 }}>
        <div>
          <div className="t">{title}</div>
          <div style={{ fontSize:11, color:'var(--ink-45)', marginTop:3 }}>
            {current > 0 ? `${current} day movement streak` : 'Start a movement streak'}{best > current ? ` · best ${best} days` : ''}
          </div>
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)} style={{ border:0, background:'transparent', color:'var(--green-dark)', fontSize:11, fontWeight:800, cursor:'pointer', padding:4 }}>
          {expanded ? '7-day view' : 'View calendar'}
        </button>
      </div>

      {!expanded ? (
        <>
          <div style={{ display:'flex', alignItems:'flex-end', gap:7, height:105, marginTop:12 }}>
            {recent.map(d => {
              const h = d.steps > 0 ? Math.max(8, Math.round((d.steps / max) * 70)) : 5;
              return (
                <div key={d.key} style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', gap:5 }}>
                  <span className="mono" style={{ fontSize:8, color:'var(--ink-45)', minHeight:10 }}>{d.steps ? (d.steps >= 1000 ? `${Math.round(d.steps / 100) / 10}K` : d.steps) : ''}</span>
                  <div style={{ width:'100%', height:h, background:d.steps ? (d.isToday ? 'var(--green)' : 'var(--green-soft)') : 'var(--line)', borderRadius:6 }} />
                  <span style={{ fontSize:9, color:d.isToday ? 'var(--green-dark)' : 'var(--ink-45)', fontWeight:d.isToday ? 800 : 500 }}>{d.date.toLocaleDateString([], { weekday:'short' })}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:10 }}>
            <div style={{ padding:'9px 10px', background:'var(--green-soft)', borderRadius:11 }}><div className="t">Days active</div><div className="mono" style={{ fontSize:17, fontWeight:800 }}>{recent.filter(d => d.steps > 0).length}/7</div></div>
            <div style={{ padding:'9px 10px', background:'var(--green-soft)', borderRadius:11 }}><div className="t">Distance</div><div className="mono" style={{ fontSize:17, fontWeight:800 }}>{distanceForSteps(recentTotal).toFixed(1)} km</div></div>
            <div style={{ padding:'9px 10px', background:'var(--green-soft)', borderRadius:11 }}><div className="t">Calories</div><div className="mono" style={{ fontSize:17, fontWeight:800 }}>≈ {recentCalories}</div></div>
          </div>
        </>
      ) : (
        <div style={{ marginTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
            <strong style={{ fontSize:13 }}>{today.toLocaleDateString([], { month:'long', year:'numeric' })}</strong>
            <span style={{ fontSize:10.5, color:'var(--ink-45)' }}>Green = movement logged</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:5 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => <div key={`${d}-${i}`} style={{ textAlign:'center', fontSize:9, color:'var(--ink-45)', fontWeight:800, paddingBottom:2 }}>{d}</div>)}
            {calendar.map((d, i) => {
              if (!d) return <div key={`blank-${i}`} />;
              const key = dateKey(d);
              const steps = byDate.get(key) || 0;
              const active = steps > 0;
              const isToday = key === todayKey;
              return <div key={key} title={active ? `${steps.toLocaleString()} steps` : 'No movement logged'} style={{ aspectRatio:'1 / 1', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:active ? 'var(--green-soft)' : 'var(--surface)', border:isToday ? '2px solid var(--green)' : '1px solid var(--line)', color:active ? 'var(--green-dark)' : 'var(--ink-45)', fontSize:10.5, fontWeight:active || isToday ? 800 : 500 }}>{d.getDate()}</div>;
            })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
            <div className="hub-card" style={{ padding:12, margin:0 }}><div className="t">Current streak</div><div className="mono" style={{ fontSize:22, fontWeight:800 }}>{current} days</div></div>
            <div className="hub-card" style={{ padding:12, margin:0 }}><div className="t">Best streak</div><div className="mono" style={{ fontSize:22, fontWeight:800 }}>{best} days</div></div>
          </div>
        </div>
      )}

      {!compact && <div style={{ fontSize:10, color:'var(--ink-45)', marginTop:9 }}>Calories are an estimate based on recorded steps and an average adult energy cost. They are not a medical measurement.</div>}
    </div>
  );
}
