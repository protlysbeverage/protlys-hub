'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const todayKey = dateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  const endKey = sorted[sorted.length - 1];
  if (endKey !== todayKey && endKey !== yesterdayKey) return { current: 0, best };
  let current = 1;
  for (let i = sorted.length - 1; i > 0; i -= 1) {
    if (dayDiff(sorted[i], sorted[i - 1]) === 1) current += 1;
    else break;
  }
  return { current, best };
}

function caloriesForSteps(steps) {
  return Math.round(Number(steps || 0) * 0.04);
}

function distanceForSteps(steps) {
  return Number(steps || 0) * 0.00075;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
    end: dateKey(new Date(y, m + 1, 0)),
  };
}

function formatLongDate(key) {
  return parseKey(key).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatSyncTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ProgressRing({ steps, goal }) {
  const safeGoal = Math.max(Number(goal) || 0, 1);
  const pct = Math.min(Number(steps || 0) / safeGoal, 1);
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;
  const met = Number(steps || 0) >= safeGoal;
  return (
    <div className="movement-day-ring" aria-label={`${Number(steps || 0).toLocaleString()} of ${safeGoal.toLocaleString()} steps`}>
      <svg viewBox="0 0 104 104" width="104" height="104" aria-hidden="true">
        <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--green)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} transform="rotate(-90 52 52)" />
      </svg>
      <div className="movement-day-ring-center">{met ? '✓' : `${Math.round(pct * 100)}%`}</div>
    </div>
  );
}

export default function MovementActivity({ days = [], compact = false, title = 'Recent activity', stepGoal = 7500, userId = null, currentStreak = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [monthCache, setMonthCache] = useState({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTouchStart = useRef(null);

  const byDate = useMemo(() => new Map(days.map(d => [d.step_date, Number(d.steps || 0)])), [days]);
  const movementKeys = useMemo(() => days.filter(d => Number(d.steps || 0) > 0).map(d => d.step_date), [days]);
  const recentStreaks = useMemo(() => streaks(movementKeys), [movementKeys]);
  const current = Number(currentStreak || recentStreaks.current || 0);
  const best = Math.max(Number(currentStreak || 0), recentStreaks.best || 0);

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

  const calendarBounds = useMemo(() => ({ max: new Date(today.getFullYear(), today.getMonth(), 1) }), [todayKey]);

  const calendar = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const last = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
    for (let d = 1; d <= last.getDate(); d += 1) cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d));
    return cells;
  }, [calendarMonth]);

  const currentMonthKey = monthKey(calendarMonth);
  const monthRows = monthCache[currentMonthKey] || [];
  const monthByDate = useMemo(() => new Map(monthRows.map(d => [d.step_date, d])), [monthRows]);
  const selected = selectedKey ? monthByDate.get(selectedKey) : null;
  const selectedSteps = Number(selected?.steps || 0);
  const selectedFuture = selectedKey ? selectedKey > todayKey : false;
  const selectedIndexInStreak = useMemo(() => {
    if (!selectedKey || !selectedSteps) return 0;
    let n = 1;
    let cursor = parseKey(selectedKey);
    for (let i = 0; i < 366; i += 1) {
      cursor.setDate(cursor.getDate() - 1);
      const key = dateKey(cursor);
      const row = monthByDate.get(key);
      if (!row || Number(row.steps || 0) <= 0) break;
      n += 1;
    }
    return n;
  }, [selectedKey, selectedSteps, monthRows]);

  useEffect(() => {
    if (!expanded || monthCache[currentMonthKey]) return;
    let cancelled = false;
    async function loadMonth() {
      setMonthLoading(true);
      const { start, end } = monthRange(calendarMonth);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_steps')
        .select('step_date, steps, source, synced_at')
        .eq('user_id', userId)
        .gte('step_date', start)
        .lte('step_date', end)
        .order('step_date', { ascending: true });
      if (cancelled) return;
      if (!error) setMonthCache(prev => ({ ...prev, [currentMonthKey]: data || [] }));
      setMonthLoading(false);
    }
    loadMonth();
    return () => { cancelled = true; };
  }, [expanded, currentMonthKey, calendarMonth, monthCache, userId]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event) => { if (event.key === 'Escape') setSheetOpen(false); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen]);

  function openDay(key) {
    if (!key || key > todayKey || !monthCache[currentMonthKey]) return;
    setSelectedKey(key);
    setSheetOpen(true);
  }

  function moveSelected(offset) {
    if (!selectedKey) return;
    const next = new Date(parseKey(selectedKey));
    next.setDate(next.getDate() + offset);
    const key = dateKey(next);
    if (key > todayKey || key.slice(0, 7) !== currentMonthKey) return;
    setSelectedKey(key);
  }

  const closeSheet = () => setSheetOpen(false);

  return (
    <div className="hub-card movement-activity-card" style={{ marginTop: 10 }}>
      <style>{`
        .movement-activity-card{position:relative;overflow:hidden;box-sizing:border-box;}
        .movement-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;}
        .movement-calendar-day{min-width:44px;min-height:44px;width:100%;aspect-ratio:1/1;border-radius:10px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;position:relative;}
        .movement-calendar-day.empty{min-width:0;min-height:0;aspect-ratio:auto;}
        .movement-calendar-day:not(:disabled){cursor:pointer;}
        .movement-calendar-day:focus-visible{outline:2px solid var(--green);outline-offset:2px;}
        .movement-calendar-day.selected{box-shadow:inset 0 0 0 2px var(--green-dark),0 0 0 1px var(--green);}
        .movement-sheet-backdrop{position:fixed;inset:0;background:rgba(7,15,12,.42);z-index:10000;display:flex;align-items:flex-end;justify-content:center;}
        .movement-sheet{width:min(760px,100%);max-height:min(78dvh,680px);overflow:auto;background:var(--paper);border-radius:24px 24px 0 0;padding:9px 18px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;box-shadow:0 -18px 50px rgba(0,0,0,.18);animation:movement-sheet-in .25s ease-out;}
        .movement-sheet-handle{width:42px;height:5px;border-radius:999px;background:var(--line);margin:0 auto 14px;}
        .movement-sheet-header{display:flex;align-items:center;justify-content:space-between;gap:10px;}
        .movement-sheet-title{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:800;color:var(--ink);}
        .movement-today-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;background:var(--green-soft);color:var(--green-dark);font-size:9.5px;font-weight:850;margin-left:7px;vertical-align:middle;}
        .movement-sheet-close{width:44px;height:44px;border:1px solid var(--line);border-radius:50%;background:var(--surface);color:var(--ink);font-size:20px;display:flex;align-items:center;justify-content:center;}
        .movement-sheet-main{display:flex;align-items:center;justify-content:center;gap:18px;margin:16px 0;}
        .movement-day-ring{width:104px;height:104px;position:relative;flex:0 0 104px;}
        .movement-day-ring-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:800;color:var(--green-dark);}
        .movement-sheet-steps{min-width:0;}
        .movement-sheet-big{font-family:'Space Grotesk',sans-serif;font-size:34px;font-weight:800;line-height:1;letter-spacing:-.035em;color:var(--ink);}
        .movement-sheet-sub{font-size:11.5px;color:var(--ink-45);margin-top:7px;}
        .movement-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
        .movement-stat-tile{min-width:0;padding:11px 10px;background:var(--green-soft);border-radius:12px;box-sizing:border-box;}
        .movement-stat-label{font-size:9.5px;font-weight:800;color:var(--ink-45);text-transform:uppercase;letter-spacing:.65px;}
        .movement-stat-value{font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:800;color:var(--ink);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .movement-stat-meta{font-size:9.5px;color:var(--ink-45);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .movement-sheet-streak{margin:12px 0 0;padding:11px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);font-size:11.5px;color:var(--ink-70);}
        .movement-sheet-nav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;}
        .movement-sheet-nav button{min-width:44px;min-height:44px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);font-size:18px;}
        .movement-sheet-empty{text-align:center;padding:12px 8px 16px;}
        .movement-sheet-empty strong{display:block;font-family:'Space Grotesk',sans-serif;font-size:17px;color:var(--ink);}
        .movement-sheet-empty span{display:block;font-size:11.5px;color:var(--ink-45);margin-top:5px;}
        @keyframes movement-sheet-in{from{transform:translateY(100%);opacity:.75}to{transform:translateY(0);opacity:1}}
        @media (prefers-reduced-motion:reduce){.movement-sheet{animation:none;}}
        @media (max-width:380px){.movement-calendar-grid{gap:3px;}.movement-calendar-day{min-width:44px;min-height:44px;}.movement-sheet{padding-left:14px;padding-right:14px;}.movement-sheet-main{gap:10px;}.movement-day-ring{transform:scale(.9);margin:-5px;}.movement-sheet-big{font-size:29px;}.movement-stat-tile{padding:9px 7px;}.movement-stat-value{font-size:12.5px;}}
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10 }}>
        <div>
          <div className="t">{title}</div>
          <div style={{ fontSize:11, color:'var(--ink-45)', marginTop:3 }}>
            {current > 0 ? `${current} ${current === 1 ? 'day' : 'days'} movement streak` : 'Start a movement streak'}{best > current ? ` · best ${best} ${best === 1 ? 'day' : 'days'}` : ''}
          </div>
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)} style={{ border:0, background:'transparent', color:'var(--green-dark)', fontSize:11, fontWeight:800, cursor:'pointer', padding:4, minHeight:44 }}>
          {expanded ? '7-day view' : 'View calendar'}
        </button>
      </div>

      {!expanded ? (
        <>
          <div style={{ display:'flex', alignItems:'flex-end', gap:7, height:105, marginTop:12 }}>
            {recent.map(d => {
              const h = d.steps > 0 ? Math.max(8, Math.round((d.steps / max) * 70)) : 5;
              return <div key={d.key} style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', gap:5 }}>
                <span className="mono" style={{ fontSize:8, color:'var(--ink-45)', minHeight:10 }}>{d.steps ? (d.steps >= 1000 ? `${Math.round(d.steps / 100) / 10}K` : d.steps) : ''}</span>
                <div style={{ width:'100%', height:h, background:d.steps ? (d.isToday ? 'var(--green)' : 'var(--green-soft)') : 'var(--line)', borderRadius:6 }} />
                <span style={{ fontSize:9, color:d.isToday ? 'var(--green-dark)' : 'var(--ink-45)', fontWeight:d.isToday ? 800 : 500 }}>{d.date.toLocaleDateString([], { weekday:'short' })}</span>
              </div>;
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
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:10 }}>
            <button type="button" onClick={() => canGoPrev && setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} disabled={!canGoPrev} aria-label="Previous month" style={{width:44,height:44,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface)',color:'var(--ink-70)',opacity:canGoPrev?1:.35,cursor:canGoPrev?'pointer':'default'}}>‹</button>
            <div style={{textAlign:'center'}}><strong style={{ fontSize:13 }}>{calendarMonth.toLocaleDateString([], { month:'long', year:'numeric' })}</strong><div style={{fontSize:9.5,color:'var(--ink-45)',marginTop:2}}>Movement history</div></div>
            <button type="button" onClick={() => canGoNext && setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} disabled={!canGoNext} aria-label="Next month" style={{width:44,height:44,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface)',color:'var(--ink-70)',opacity:canGoNext?1:.35,cursor:canGoNext?'pointer':'default'}}>›</button>
          </div>
          <div style={{fontSize:10.5,color:'var(--ink-45)',marginBottom:8,textAlign:'center'}}>{monthLoading ? 'Loading movement…' : 'Green = movement logged'}</div>
          <div className="movement-calendar-grid">
            {['S','M','T','W','T','F','S'].map((d, i) => <div key={`${d}-${i}`} style={{textAlign:'center',fontSize:9,color:'var(--ink-45)',fontWeight:800,paddingBottom:2,minHeight:16}}>{d}</div>)}
            {calendar.map((d, i) => {
              if (!d) return <div className="movement-calendar-day empty" key={`blank-${i}`} />;
              const key = dateKey(d);
              const row = monthByDate.get(key);
              const steps = Number(row?.steps || 0);
              const active = steps > 0;
              const isToday = key === todayKey;
              const future = key > todayKey;
              const selectedClass = selectedKey === key ? ' selected' : '';
              return <button key={key} type="button" className={`movement-calendar-day${selectedClass}`} disabled={future || monthLoading} onClick={() => openDay(key)} aria-label={future ? `${formatLongDate(key)}, future` : `${formatLongDate(key)}, ${steps.toLocaleString()} steps`} style={{background:active?'var(--green-soft)':'var(--surface)',border:isToday?'2px solid var(--green)':'1px solid var(--line)',color:active?'var(--green-dark)':'var(--ink-45)',fontWeight:active||isToday?800:500,opacity:future?.38:1}}>
                {d.getDate()}
              </button>;
            })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
            <div className="hub-card" style={{ padding:12, margin:0 }}><div className="t">Current streak</div><div className="mono" style={{ fontSize:22, fontWeight:800 }}>{current} {current === 1 ? 'day' : 'days'}</div></div>
            <div className="hub-card" style={{ padding:12, margin:0 }}><div className="t">Best streak</div><div className="mono" style={{ fontSize:22, fontWeight:800 }}>{best} {best === 1 ? 'day' : 'days'}</div></div>
          </div>
        </div>
      )}

      {!compact && <div style={{fontSize:10,color:'var(--ink-45)',marginTop:9}}>Calories are an estimate based on recorded steps and an average adult energy cost. They are not a medical measurement.</div>}

      {sheetOpen && selectedKey && (
        <div className="movement-sheet-backdrop" role="presentation" onClick={closeSheet}>
          <div className="movement-sheet" role="dialog" aria-modal="true" aria-label={formatLongDate(selectedKey)} onClick={e => e.stopPropagation()} onTouchStart={e => { sheetTouchStart.current = e.touches[0].clientY; }} onTouchEnd={e => { if (sheetTouchStart.current != null && e.changedTouches[0].clientY - sheetTouchStart.current > 70) closeSheet(); sheetTouchStart.current = null; }}>
            <div className="movement-sheet-handle" aria-hidden="true" />
            <div className="movement-sheet-header">
              <div className="movement-sheet-title">{formatLongDate(selectedKey)}{selectedKey === todayKey && <span className="movement-today-pill">Today</span>}</div>
              <button type="button" className="movement-sheet-close" onClick={closeSheet} aria-label="Close day details">×</button>
            </div>
            {selectedSteps > 0 ? (
              <>
                <div className="movement-sheet-main">
                  <ProgressRing steps={selectedSteps} goal={stepGoal} />
                  <div className="movement-sheet-steps">
                    <div className="movement-sheet-big">{selectedSteps.toLocaleString()}</div>
                    <div className="movement-sheet-sub">{selectedSteps.toLocaleString()} / {Number(stepGoal || 7500).toLocaleString()} · {Math.min(100, Math.round(selectedSteps / Math.max(Number(stepGoal || 7500),1) * 100))}%{selectedSteps >= Number(stepGoal || 7500) ? ' · Goal met' : ''}</div>
                  </div>
                </div>
                <div className="movement-stat-grid">
                  <div className="movement-stat-tile"><div className="movement-stat-label">Distance</div><div className="movement-stat-value">{distanceForSteps(selectedSteps).toFixed(1)} km</div></div>
                  <div className="movement-stat-tile"><div className="movement-stat-label">Calories</div><div className="movement-stat-value">≈ {caloriesForSteps(selectedSteps)}</div><div className="movement-stat-meta">estimated</div></div>
                  <div className="movement-stat-tile"><div className="movement-stat-label">Source</div><div className="movement-stat-value">{selected?.source === 'manual' ? 'Manual' : 'Synced'}</div><div className="movement-stat-meta">{formatSyncTime(selected?.synced_at)}</div></div>
                </div>
                {selectedIndexInStreak > 0 && selectedIndexInStreak <= Math.max(current, 1) && <div className="movement-sheet-streak">Day {selectedIndexInStreak} of your current streak</div>}
              </>
            ) : (
              <div className="movement-sheet-empty"><strong>No movement recorded</strong><span>There are no recorded steps for this day yet.</span></div>
            )}
            <div className="movement-sheet-nav">
              <button type="button" onClick={() => moveSelected(-1)} disabled={!selectedKey || selectedKey.slice(0,7) !== currentMonthKey || selectedKey <= currentMonthKey + '-01'} aria-label="Previous day">‹</button>
              <span style={{fontSize:10.5,color:'var(--ink-45)'}}>Day details</span>
              <button type="button" onClick={() => moveSelected(1)} disabled={!selectedKey || selectedKey >= todayKey} aria-label="Next day">›</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
