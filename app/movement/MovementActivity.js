'use client';

import ShareCardSheet, { ShareIconButton } from '@/components/ShareCardSheet';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function dateKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
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
  const dashOffset = circumference * (1 - pct);
  const met = Number(steps || 0) >= safeGoal;
  const [visible,setVisible]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setVisible(true);return;}
    const node=ref.current;
    if(!node)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
    },{threshold:.15});
    observer.observe(node);
    return()=>observer.disconnect();
  },[]);

  return (
    <div ref={ref} className="movement-day-ring" aria-label={`${Number(steps || 0).toLocaleString()} of ${safeGoal.toLocaleString()} steps`}>
      <svg viewBox="0 0 104 104" width="104" height="104" aria-hidden="true">
        <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--green)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={visible ? dashOffset : circumference} style={{transition:'stroke-dashoffset 700ms var(--ease-out)',willChange:visible?'auto':'stroke-dashoffset'}} transform="rotate(-90 52 52)" />
      </svg>
      <div className="movement-day-ring-center">{met ? '✓' : `${Math.round(pct * 100)}%`}</div>
    </div>
  );
}

export default function MovementActivity({ days = [], compact = false, title = 'Recent activity', stepGoal = 7500, userId = null, currentStreak = 0, profile = null }) {
  const [expanded, setExpanded] = useState(false);
  const [calendarMonthKey, setCalendarMonthKey] = useState(() => monthKey(new Date()));
  const [monthCache, setMonthCache] = useState(() => ({ [monthKey(new Date())]: days.filter(d => String(d.step_date || '').startsWith(monthKey(new Date())) ) }));
  const [monthLoading, setMonthLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [sheetClosing, setSheetClosing] = useState(false);
  const [sheetDirection, setSheetDirection] = useState(1);
  const sheetRef = useRef(null);
  const returnFocusRef = useRef(null);
  const sheetDragY = useRef(0);
  const sheetDragStart = useRef(null);
  const sheetDragRaf = useRef(0);
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

  const todayMonthKey = monthKey(new Date(today.getFullYear(), today.getMonth(), 1));
  const [calendarYear, calendarMonthIndex] = calendarMonthKey.split('-').map(Number);
  const calendarMonth = useMemo(() => new Date(calendarYear, calendarMonthIndex - 1, 1), [calendarYear, calendarMonthIndex]);
  const calendarMonthIndexNumber = calendarYear * 12 + (calendarMonthIndex - 1);
  const todayMonthIndexNumber = today.getFullYear() * 12 + today.getMonth();
  const canGoToNextMonth = calendarMonthIndexNumber < todayMonthIndexNumber;

  const calendar = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const last = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
    for (let d = 1; d <= last.getDate(); d += 1) cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d));
    return cells;
  }, [calendarMonth]);

  const currentMonthKey = calendarMonthKey;
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
    if (!expanded || !userId) return;
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
      if (!error) {
        const incoming = data || [];
        setMonthCache(prev => {
          const existing = prev[currentMonthKey] || [];
          const merged = new Map(existing.map(row => [row.step_date, row]));
          incoming.forEach(row => merged.set(row.step_date, row));
          return { ...prev, [currentMonthKey]: [...merged.values()].sort((x,y) => String(x.step_date).localeCompare(String(y.step_date))) };
        });
      }
      setMonthLoading(false);
    }
    loadMonth();
    return () => { cancelled = true; };
  }, [expanded, currentMonthKey, calendarMonth, userId]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeSheet(); return; }
      if (event.key !== 'Tab') return;
      const root=sheetRef.current;
      if(!root)return;
      const focusables=[...root.querySelectorAll('button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')];
      if(!focusables.length)return;
      const first=focusables[0], last=focusables[focusables.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(()=>sheetRef.current?.querySelector('button')?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen]);

  useEffect(()=>{
    if(sheetOpen || !returnFocusRef.current)return;
    const node=returnFocusRef.current;
    window.requestAnimationFrame(()=>node?.focus?.());
    returnFocusRef.current=null;
  },[sheetOpen]);

  useEffect(()=>()=>{if(sheetDragRaf.current)cancelAnimationFrame(sheetDragRaf.current);},[]);

  function shareLast30Days() {
    const end = new Date(); end.setHours(12,0,0,0);
    const start = new Date(end); start.setDate(end.getDate()-29);
    const byKey = new Map(days.map(row => [row.step_date, row]));
    return Array.from({length:30},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const k=dateKey(d);return byKey.get(k)||{step_date:k,steps:0};});
  }
  function openMovementShare() {
    const last30 = shareLast30Days();
    const activeDays = last30.filter(row => Number(row.steps || 0) > 0).length;
    setShareData({metric:'movement_days',value:String(activeDays),unit:'days',label:'Movement days',subtext:activeDays+' active days in the last 30 days',progress:Math.min(1,activeDays/30),heatmapDays:last30,weeklyDays:recent});
  }
  function openStreakShare(type) {
    const value = type === 'current' ? current : best;
    setShareData({metric:'best_streak',value:String(value),unit:'days',label:type === 'current' ? 'Current streak' : 'Best streak',subtext:'Movement days in a row',progress:0,heatmapDays:monthRows,highlightBestRun:true});
  }

  function openDay(key, element) {
    if (!key || key > todayKey || !monthCache[currentMonthKey]) return;
    returnFocusRef.current=element||document.activeElement;
    setSelectedKey(key);
    setSheetDirection(1);
    setSheetClosing(false);
    setSheetOpen(true);
  }

  function moveSelected(offset) {
    if (!selectedKey) return;
    const next = new Date(parseKey(selectedKey));
    next.setDate(next.getDate() + offset);
    const key = dateKey(next);
    if (key > todayKey) return;
    const targetMonth = new Date(next.getFullYear(), next.getMonth(), 1);
    if (monthKey(targetMonth) !== currentMonthKey) setCalendarMonthKey(monthKey(targetMonth));
    setSheetDirection(offset > 0 ? 1 : -1);
    setSelectedKey(key);
  }

  function closeSheet() {
    if(!sheetOpen || sheetClosing)return;
    setSheetClosing(true);
    window.setTimeout(()=>{setSheetOpen(false);setSheetClosing(false);sheetDragY.current=0;},200);
  }

  function handleSheetTouchStart(event){
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    sheetDragStart.current={y:event.touches[0].clientY,time:performance.now()};
    sheetDragY.current=0;
    sheetRef.current?.style.setProperty('will-change','transform');
  }

  function handleSheetTouchMove(event){
    if(!sheetDragStart.current || !sheetRef.current)return;
    const dy=Math.max(0,event.touches[0].clientY-sheetDragStart.current.y);
    sheetDragY.current=dy;
    if(sheetDragRaf.current)return;
    sheetDragRaf.current=requestAnimationFrame(()=>{
      sheetDragRaf.current=0;
      if(sheetRef.current)sheetRef.current.style.transform='translateY('+sheetDragY.current+'px)';
    });
  }

  function handleSheetTouchEnd(event){
    if(!sheetDragStart.current)return;
    const start=sheetDragStart.current;
    const dy=Math.max(0,event.changedTouches[0].clientY-start.y);
    const dt=Math.max(1,performance.now()-start.time);
    const velocity=dy/dt;
    sheetDragStart.current=null;
    if(dy>110 || velocity>.65){ sheetRef.current?.style.removeProperty('will-change'); closeSheet(); }
    else {
      const node=sheetRef.current;
      if(node){node.style.removeProperty('will-change');node.style.transition='transform 200ms var(--ease-out)';node.style.transform='translateY(0)';window.setTimeout(()=>node?.style.removeProperty('transition'),210);}
    }
    sheetDragY.current=0;
  }

  return (
    <div className="hub-card movement-activity-card" style={{ marginTop: 10 }}>
      <style>{`
        .movement-activity-card{position:relative;overflow:hidden;box-sizing:border-box;}
        .movement-streak-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px;}
        .movement-streak-tile{position:relative;min-width:0;min-height:92px;padding:14px 12px;border-radius:16px;background:var(--white);border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;}
        .movement-streak-label{font-family:'IBM Plex Mono',monospace;font-size:9.5px;line-height:1.2;font-weight:800;letter-spacing:.8px;color:var(--ink-45);white-space:nowrap;padding-right:38px;}
        .streak-label-short{display:none;}
        .movement-streak-tile > .motion-tap{position:absolute;top:9px;right:9px;}
        .movement-streak-value{display:flex;align-items:baseline;gap:6px;white-space:nowrap;line-height:1;margin-top:10px;}
        .movement-streak-value span{font-family:'Space Grotesk',sans-serif;font-size:40px;font-weight:800;letter-spacing:-.045em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap;}
        .movement-streak-value small{font-size:12px;font-weight:700;color:var(--ink-45);white-space:nowrap;}
        @media (max-width:340px){.movement-streak-label{padding-right:38px}.streak-label-long{display:none}.streak-label-short{display:inline}}
        .movement-calendar-toolbar{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:8px;margin-bottom:10px;}
        .movement-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;}
        .movement-calendar-day{min-width:44px;min-height:44px;width:100%;aspect-ratio:1/1;border-radius:10px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;position:relative;}
        .movement-calendar-day.empty{min-width:0;min-height:0;aspect-ratio:auto;}
        .movement-calendar-day:not(:disabled){cursor:pointer;}
        .movement-calendar-day:focus-visible{outline:2px solid var(--green);outline-offset:2px;}
        .movement-calendar-day.selected{box-shadow:inset 0 0 0 2px var(--green-dark),0 0 0 1px var(--green);transition:box-shadow 150ms var(--ease-out),transform 100ms var(--ease-out);}
        .movement-sheet-backdrop{position:fixed;inset:0;background:rgba(7,15,12,.42);z-index:10000;display:flex;align-items:flex-end;justify-content:center;animation:movement-backdrop-in 200ms ease-out;transition:opacity 200ms ease-out;}
        .movement-sheet{width:min(760px,100%);max-height:min(78dvh,680px);overflow:auto;background:var(--paper);border-radius:24px 24px 0 0;padding:9px 18px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;box-shadow:0 -18px 50px rgba(0,0,0,.18);animation:movement-sheet-in .25s var(--ease-out);transition:transform 200ms var(--ease-out);touch-action:pan-y;}
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
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <button type="button" onClick={() => setExpanded(v => !v)} style={{ border:0, background:'transparent', color:'var(--green-dark)', fontSize:11, fontWeight:800, cursor:'pointer', padding:4, minHeight:40 }}>
            7-day view
          </button>
          <ShareIconButton label="Share movement calendar" onClick={openMovementShare}/>
        </div>
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
          <div className="movement-calendar-toolbar">
            <button type="button" onClick={() => setCalendarMonthKey(monthKey(new Date(calendarYear, calendarMonthIndex - 2, 1))) aria-label="Previous month" style={{width:42,height:42,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface)',color:'var(--ink-70)',}}>‹</button>
            <div style={{textAlign:'center',minWidth:0}}>
              <strong style={{fontSize:13}}>{calendarMonth.toLocaleDateString([], { month:'long', year:'numeric' })}</strong>
              <div style={{fontSize:9.5,color:'var(--ink-45)',marginTop:2}}>Movement history</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <button type="button" onClick={() => setCalendarMonthKey(monthKey(new Date(calendarYear, calendarMonthIndex, 1)))} disabled={!canGoToNextMonth} aria-label="Next month" style={{width:42,height:42,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--surface)',color:'var(--ink-70)',opacity:canGoToNextMonth?1:.35,cursor:canGoToNextMonth?'pointer':'default'}}>›</button>
            </div>
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
              return <button key={key} type="button" className={`movement-calendar-day${selectedClass}`} disabled={future || monthLoading} onClick={(event) => openDay(key,event.currentTarget)} aria-label={future ? `${formatLongDate(key)}, future` : `${formatLongDate(key)}, ${steps.toLocaleString()} steps`} style={{background:active?'var(--green-soft)':'var(--surface)',border:isToday?'2px solid var(--green)':'1px solid var(--line)',color:active?'var(--green-dark)':'var(--ink-45)',fontWeight:active||isToday?800:500,opacity:future?.38:1}}>
                {d.getDate()}
              </button>;
            })}
          </div>
          <div className="movement-streak-grid">
            <div className="movement-streak-tile">
              <div className="movement-streak-label"><span className="streak-label-long">CURRENT STREAK</span><span className="streak-label-short">CURRENT</span></div>
              <span style={{position:'absolute',top:9,right:9}}><ShareIconButton label="Share current streak" onClick={()=>openStreakShare('current')}/></span>
              <div className="movement-streak-value"><span>{current}</span><small>{current === 1 ? 'day' : 'days'}</small></div>
            </div>
            <div className="movement-streak-tile">
              <div className="movement-streak-label"><span className="streak-label-long">BEST STREAK</span><span className="streak-label-short">BEST</span></div>
              <span style={{position:'absolute',top:9,right:9}}><ShareIconButton label="Share best streak" onClick={()=>openStreakShare('best')}/></span>
              <div className="movement-streak-value"><span>{best}</span><small>{best === 1 ? 'day' : 'days'}</small></div>
            </div>
          </div>
        </div>
      )}

      {!compact && <div style={{fontSize:10,color:'var(--ink-45)',marginTop:9}}>Calories are an estimate based on recorded steps and an average adult energy cost. They are not a medical measurement.</div>}

      {sheetOpen && selectedKey && (
        <div className={`movement-sheet-backdrop${sheetClosing?' closing':''}`} role="presentation" onClick={closeSheet}>
          <div ref={sheetRef} className={`movement-sheet${sheetClosing?' closing':''}`} role="dialog" aria-modal="true" aria-label={formatLongDate(selectedKey)} onClick={e => e.stopPropagation()} onTouchStart={handleSheetTouchStart} onTouchMove={handleSheetTouchMove} onTouchEnd={handleSheetTouchEnd}>
            <div className="movement-sheet-handle" aria-hidden="true" />
            <div className="movement-sheet-header">
              <div className="movement-sheet-title">{formatLongDate(selectedKey)}{selectedKey === todayKey && <span className="movement-today-pill">Today</span>}</div>
              <button type="button" className="movement-sheet-close" onClick={closeSheet} aria-label="Close day details">×</button>
            </div>
            <div className={`movement-sheet-content movement-sheet-content-${sheetDirection > 0 ? 'next' : 'prev'}`} key={selectedKey}>
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
            </div>
            <div className="movement-sheet-nav">
              <button type="button" onClick={() => moveSelected(-1)} disabled={!selectedKey || selectedKey <= '2000-01-01'} aria-label="Previous day">‹</button>
              <span style={{fontSize:10.5,color:'var(--ink-45)'}}>Day details</span>
              <button type="button" onClick={() => moveSelected(1)} disabled={!selectedKey || selectedKey >= todayKey} aria-label="Next day">›</button>
            </div>
          </div>
        </div>
      )}
      {shareData && <ShareCardSheet open={!!shareData} onClose={()=>setShareData(null)} metric={shareData.metric} value={shareData.value} unit={shareData.unit} label={shareData.label} subtext={shareData.subtext} progress={shareData.progress} username={profile?.display_name || 'protlys'} heatmapDays={shareData.heatmapDays || []} highlightBestRun={shareData.highlightBestRun || false} weeklyDays={shareData.weeklyDays || []} />}
    </div>
  );
}
