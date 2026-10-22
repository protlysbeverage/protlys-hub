'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MovementActivity from '@/components/MovementActivity';
import ShareCardSheet from '@/components/ShareCardSheet';
import { ShareIconButton } from '@/components/ShareIcon';
import { getShareData } from '@/lib/share-data';

function localDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}
function caloriesForSteps(steps) { return Math.round(Number(steps || 0) * 0.04); }
function distanceForSteps(steps) { return Number(steps || 0) * 0.00075; }

function AnimatedNumber({ value, formatter = n => Math.round(n).toLocaleString() }) {
  const target = Number(value || 0);
  const [display, setDisplay] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    const from = Number(previous.current || 0);
    if (from === target) return;
    previous.current = target;
    const start = performance.now();
    let frame = 0;
    const tick = now => {
      const progress = Math.min(1, (now - start) / 400);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return formatter(display);
}

export default function MovementClient({ userId = null, currentGoal = 7500 }) {
  const todayKey = localDateStr();
  const cacheKey = `protlys_movement_cache_v2_${userId || 'unknown'}`;
  const [ready, setReady] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [source, setSource] = useState(null);
  const [weekSteps, setWeekSteps] = useState([]);
  const [lifetimeSteps, setLifetimeSteps] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [stepGoal, setStepGoal] = useState(Number(currentGoal || 7500));
  const [displayName, setDisplayName] = useState('protlys');
  const [shareData, setShareData] = useState(null);
  const refreshInFlight = useRef(null);
  const debounceTimer = useRef(null);
  const intervalRef = useRef(null);
  const weekLoadedRef = useRef(false);
  const displayedTodayRef = useRef(0);
  const weekStepsRef = useRef([]);
  const lifetimeStepsRef = useRef(0);

  const persist = useCallback((patch = {}) => {
    try {
      const current = JSON.parse(window.localStorage.getItem(cacheKey) || '{}');
      window.localStorage.setItem(cacheKey, JSON.stringify({
        ...current,
        ...patch,
        date: todayKey,
      }));
    } catch {}
  }, [cacheKey, todayKey]);

  const applyToday = useCallback((data) => {
    if (!data) return;
    const incoming = Number(data.steps || 0);
    const current = Number(displayedTodayRef.current || 0);
    // Same-day reconciliation is monotonic: a stale response can never make
    // the number on screen drop.
    const next = data.date === todayKey ? Math.max(current, incoming) : incoming;
    displayedTodayRef.current = next;
    const nextLifetime = Math.max(Number(lifetimeStepsRef.current || 0), Number(data.totalSteps || 0));
    const nextWeek = (() => {
      const currentRows = weekStepsRef.current || [];
      const withoutToday = currentRows.filter(row => row.step_date !== todayKey);
      return [...withoutToday, ...(data.date === todayKey ? [{ step_date: todayKey, steps: next, source: data.source || null, synced_at: data.syncedAt || null }] : [])].sort((a, b) => a.step_date.localeCompare(b.step_date));
    })();
    setTodaySteps(next);
    setLastSync(data.syncedAt || null);
    setSource(data.source || null);
    setLifetimeSteps(nextLifetime);
    setCurrentStreak(Number(data.currentStreak || 0));
    setStepGoal(Number(data.stepGoal || currentGoal || 7500));
    setDisplayName(data.displayName || 'protlys');
    setWeekSteps(nextWeek);
    weekStepsRef.current = nextWeek;
    lifetimeStepsRef.current = nextLifetime;
    persist({
      todaySteps: next,
      lastSync: data.syncedAt || null,
      source: data.source || null,
      lifetimeSteps: nextLifetime,
      currentStreak: Number(data.currentStreak || 0),
      stepGoal: Number(data.stepGoal || currentGoal || 7500),
      displayName: data.displayName || 'protlys',
      weekSteps: nextWeek,
    });
  }, [currentGoal, persist, todayKey]);

  const refreshToday = useCallback(async () => {
    if (!userId || refreshInFlight.current) return refreshInFlight.current;
    refreshInFlight.current = fetch('/api/movement/today', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }).then(async response => {
      if (!response.ok) return null;
      return response.json();
    }).then(data => {
      applyToday(data);
      return data;
    }).catch(() => null).finally(() => {
      refreshInFlight.current = null;
    });
    return refreshInFlight.current;
  }, [applyToday, userId]);

  const scheduleRefresh = useCallback((delay = 7000) => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
      refreshToday();
    }, delay);
  }, [refreshToday]);

  const loadWeekOnce = useCallback(async () => {
    if (weekLoadedRef.current) return;
    weekLoadedRef.current = true;
    try {
      const response = await fetch('/api/movement/week', {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      const data = await response.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      weekStepsRef.current = rows;
      setWeekSteps(rows);
      persist({ weekSteps: rows });
    } catch {}
  }, [persist]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    // Cache-first: paint the saved snapshot before any network request.
    try {
      const cached = JSON.parse(window.localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.date === todayKey) {
        if (Number.isFinite(Number(cached.todaySteps))) {
          displayedTodayRef.current = Number(cached.todaySteps);
          setTodaySteps(Number(cached.todaySteps));
        }
        if (cached.lastSync) setLastSync(cached.lastSync);
        if (cached.source) setSource(cached.source);
        if (Array.isArray(cached.weekSteps)) { weekStepsRef.current = cached.weekSteps; setWeekSteps(cached.weekSteps); }
        if (Number.isFinite(Number(cached.lifetimeSteps))) { lifetimeStepsRef.current = Number(cached.lifetimeSteps); setLifetimeSteps(Number(cached.lifetimeSteps)); }
        if (Number.isFinite(Number(cached.currentStreak))) setCurrentStreak(Number(cached.currentStreak));
        if (Number.isFinite(Number(cached.stepGoal))) setStepGoal(Number(cached.stepGoal));
        if (cached.displayName) setDisplayName(cached.displayName);
        setReady(true);
      }
    } catch {}

    // The shell never waits for Health Connect or the network.
    if (!cancelled) setReady(true);

    const foreground = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleRefresh(5000);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        if (document.visibilityState === 'visible') scheduleRefresh(7000);
      }, 45000);
    };
    const background = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const onVisibility = () => document.visibilityState === 'visible' ? foreground() : background();

    window.addEventListener('focus', foreground, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    foreground();

      return () => {
      cancelled = true;
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.removeEventListener('focus', foreground);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cacheKey, todayKey, userId, scheduleRefresh]);

  useEffect(() => {
    if (!userId || !ready || weekLoadedRef.current || weekSteps.length) return;
    loadWeekOnce();
  }, [loadWeekOnce, ready, userId, weekSteps.length]);

  // Optional app-to-app signal for native Health Connect integrations.
  useEffect(() => {
    const onCustom = () => scheduleRefresh(7000);
    window.addEventListener('protlys:steps-updated', onCustom);
    return () => window.removeEventListener('protlys:steps-updated', onCustom);
  }, [scheduleRefresh]);

  const currentTodaySteps = todaySteps;
  const recent = weekSteps.map(row => ({ dateStr: row.step_date, steps: Number(row.steps || 0) }));
  const recentTotal = recent.reduce((sum, d) => sum + d.steps, 0);
  const recentActiveDays = recent.filter(d => d.steps > 0).length;
  const todayCalories = caloriesForSteps(currentTodaySteps);
  const todayDistance = distanceForSteps(currentTodaySteps);
  const shareContext = { rows: weekSteps, todaySteps: currentTodaySteps, lifetimeSteps, currentStreak };
  const stepsShareData = getShareData('steps_today', shareContext);
  const hasMovement = stepsShareData.hasData;

  function openShare(metric) { setShareData(getShareData(metric, shareContext)); }

  return (
    <>
      <div className="screen-pad">
        <span className="eyebrow">Movement</span>
        <h1 style={{fontSize:22}}>Your movement</h1>
        <p className="subhead">Your steps are tracked automatically.</p>
      </div>

      <div className="screen-pad" style={{paddingTop:6}}>
        <div className="hub-card" style={{padding:16,minHeight:196}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:32}}>
            <div className="t">Steps today</div>
            <div style={{display:'flex',alignItems:'center',gap:0,marginRight:-8,minHeight:32}}>
              {lastSync && <span style={{fontSize:12,color:'var(--ink-45)',fontWeight:500,whiteSpace:'nowrap'}}>{source === 'manual' ? 'Manual' : source === 'healthkit' ? 'Apple Health' : 'Health Connect'} · {new Date(lastSync).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}
              {hasMovement && <ShareIconButton label="Share steps today" onClick={()=>openShare('steps_today')}/>}
            </div>
          </div>
          <div className="mono" style={{fontSize:38,fontWeight:800,marginTop:8,minHeight:46}}>
            {ready ? <AnimatedNumber value={currentTodaySteps}/> : <span aria-hidden="true" style={{display:'inline-block',width:120,height:42,borderRadius:8,background:'var(--surface)'}} />}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:9}}>
            <div style={{display:'flex',flexDirection:'column',padding:16,minHeight:96,borderRadius:11,background:'var(--green-soft)',boxSizing:'border-box'}}><div style={{display:'flex',alignItems:'center',gap:6,minWidth:0,minHeight:20}}><div className="t" style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Distance</div>{hasMovement && <ShareIconButton label="Share distance" onClick={()=>openShare('distance')} />}</div><div className="mono" style={{fontSize:18,lineHeight:1.2,fontWeight:800,marginTop:'auto'}}>{ready ? <AnimatedNumber value={todayDistance} formatter={n => `${n.toFixed(1)} km`} /> : '—'}</div></div>
            <div style={{display:'flex',flexDirection:'column',padding:16,minHeight:96,borderRadius:11,background:'var(--green-soft)',boxSizing:'border-box'}}><div style={{minHeight:20,display:'flex',alignItems:'flex-start'}}><div className="t">Calories</div></div><div className="mono" style={{fontSize:18,lineHeight:1.2,fontWeight:800,marginTop:'auto'}}>≈ {ready ? <AnimatedNumber value={todayCalories}/> : '—'}</div></div>
          </div>
          <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:7,minHeight:16}}>Distance and calories are estimates from recorded steps.</div>
        </div>

        <div className="hub-grid" style={{marginTop:10}}>
          <div className="hub-card" style={{minWidth:0,minHeight:96}}>
            <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}><div className="t" style={{flex:1,minWidth:0}}>Days with movement</div>{hasMovement && <ShareIconButton label="Share active days" onClick={()=>openShare('movement_days')}/>}</div>
            <div className="mono" style={{fontSize:23,fontWeight:800}}>{ready ? <AnimatedNumber value={recentActiveDays}/> : '—'}</div>
            <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>in the displayed range</div>
          </div>
          <div className="hub-card" style={{minWidth:0,minHeight:96}}>
            <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}><div className="t" style={{flex:1,minWidth:0}}>Lifetime steps</div>{hasMovement && <ShareIconButton label="Share lifetime steps" onClick={()=>openShare('lifetime_steps')}/>}</div>
            <div className="mono" style={{fontSize:20,fontWeight:800}}>{ready ? <AnimatedNumber value={lifetimeSteps} formatter={n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n/1000)}K` : Math.round(n).toLocaleString()} /> : '—'}</div>
            <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>all recorded movement</div>
          </div>
        </div>

        <div className="hub-card" style={{marginTop:10,padding:16,minHeight:88}}>
          <div className="t">7-day totals</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:9}}>
            <div style={{fontSize:12,color:'var(--ink-70)'}}><strong className="mono">{ready ? <AnimatedNumber value={recentTotal}/> : '—'}</strong> steps</div>
            <div style={{fontSize:12,color:'var(--ink-70)',textAlign:'right'}}><strong className="mono">≈ {ready ? <AnimatedNumber value={caloriesForSteps(recentTotal)}/> : '—'}</strong> calories</div>
          </div>
        </div>

        <MovementActivity days={weekSteps} title="Recent activity" userId={userId} stepGoal={stepGoal} currentStreak={currentStreak} profile={{ total_steps: lifetimeSteps }} />
      </div>
      {shareData && <ShareCardSheet open={!!shareData} onClose={()=>setShareData(null)} data={shareData} username={displayName} />}
    </>
  );
}
