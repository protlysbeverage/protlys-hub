'use client';

import { useEffect, useState } from 'react';
import MovementActivity from '@/components/MovementActivity';
import ShareCardSheet from '@/components/ShareCardSheet';
import { ShareIconButton } from '@/components/ShareIcon';
import { getShareData } from '@/lib/share-data';
import { createClient } from '@/lib/supabase/client';
import WeeklyGroupLeaderboard from '@/components/WeeklyGroupLeaderboard';
import AndroidStepTrackingCard from '@/components/AndroidStepTrackingCard';

function localDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}

function caloriesForSteps(steps) { return Math.round(Number(steps || 0) * 0.04); }
function distanceForSteps(steps) { return Number(steps || 0) * 0.00075; }

export default function MovementClient({ profile, todaySteps = 0, lastSync, source, weekSteps = [], movementDays = [], userId = null, currentStreak = 0, currentGoal = 7500 }) {
  const [shareData, setShareData] = useState(null);
  const [liveTodaySteps, setLiveTodaySteps] = useState(Number(todaySteps || 0));
  const [liveLastSync, setLiveLastSync] = useState(lastSync || null);
  const [liveSource, setLiveSource] = useState(source || null);
  const [liveWeekSteps, setLiveWeekSteps] = useState(weekSteps || []);
  const [liveMovementDays, setLiveMovementDays] = useState(movementDays || []);
  const [movementView, setMovementView] = useState('overview');
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get('tab'); if (requested === 'leaderboard') setMovementView('leaderboard'); }, []);

  useEffect(() => {
    const cacheKey = `protlys_movement_cache_v1_${userId || 'unknown'}`;

    try {
      const cached = JSON.parse(window.localStorage.getItem(cacheKey) || 'null');
      if (cached) {
        if (Number.isFinite(Number(cached.todaySteps))) setLiveTodaySteps(Number(cached.todaySteps));
        if (cached.lastSync) setLiveLastSync(cached.lastSync);
        if (cached.source) setLiveSource(cached.source);
        if (Array.isArray(cached.weekSteps)) setLiveWeekSteps(cached.weekSteps);
        if (Array.isArray(cached.movementDays)) setLiveMovementDays(cached.movementDays);
      }
    } catch {}

    const supabase = createClient();

    const refreshMovement = async () => {
      if (!userId) return;
      const now = new Date();
      const todayStr = localDateStr(now);
      const weekStartDate = new Date(now);
      weekStartDate.setDate(weekStartDate.getDate() - 6);
      const weekStart = localDateStr(weekStartDate);

      const { data: recentRows } = await supabase
        .from('daily_steps')
        .select('step_date, steps, source, synced_at')
        .eq('user_id', userId)
        .gte('step_date', weekStart)
        .lte('step_date', todayStr)
        .order('step_date');

      const recent = recentRows || [];
      const todayRow = recent.find((row) => row.step_date === todayStr) || null;
      const nextToday = Number(todayRow?.steps || 0);
      const nextLastSync = todayRow?.synced_at || null;
      const nextSource = todayRow?.source || null;

      setLiveTodaySteps(nextToday);
      setLiveLastSync(nextLastSync);
      setLiveSource(nextSource);
      setLiveWeekSteps(recent);
      setLiveMovementDays(recent);

      try {
        window.localStorage.setItem(cacheKey, JSON.stringify({
          todaySteps: nextToday,
          lastSync: nextLastSync,
          source: nextSource,
          weekSteps: recent,
          movementDays: recent,
        }));
      } catch {}
    };

    refreshMovement();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshMovement();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const channel = supabase
      .channel(`movement-steps-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_steps',
          filter: `user_id=eq.${userId}`,
        },
        () => refreshMovement()
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const totalSteps = Number(profile?.total_steps || 0);
  const currentTodaySteps = liveTodaySteps;
  const today = new Date();
  const todayStr = localDateStr(today);
  const shareContext = { rows: liveMovementDays, todaySteps: currentTodaySteps, lifetimeSteps: totalSteps, currentStreak };
  const stepsShareData = getShareData('steps_today', shareContext);
  const activeDaysShareData = getShareData('movement_days', shareContext);
  const recent = stepsShareData.weeklyDays.map(d => ({ dateStr:d.key, steps:d.steps }));
  const recentTotal = recent.reduce((sum, d) => sum + d.steps, 0);
  const recentActiveDays = activeDaysShareData.value;
  const todayCalories = caloriesForSteps(currentTodaySteps);
  const todayDistance = distanceForSteps(currentTodaySteps);
  const hasMovement = stepsShareData.hasData;

  function openShare(metric) { setShareData(getShareData(metric, shareContext)); }

  return (
    <>
      <div className="screen-pad">
        <span className="eyebrow">Movement</span>
        <h1 style={{fontSize:22}}>Your movement</h1>
        <p className="subhead">Record your movement whenever you want. There is no daily target to hit.</p>
      </div>
      <div className="screen-pad" style={{paddingTop:6}}>
        <div className="protlys-segmented-tabs" role="tablist" aria-label="Movement view">
          <button type="button" role="tab" aria-selected={movementView === 'overview'} className={'protlys-segmented-tab ' + (movementView === 'overview' ? 'is-active' : '')} onClick={() => setMovementView('overview')}>Overview</button>
          <button type="button" role="tab" aria-selected={movementView === 'leaderboard'} className={'protlys-segmented-tab ' + (movementView === 'leaderboard' ? 'is-active' : '')} onClick={() => setMovementView('leaderboard')}>Leaderboard</button>
          <span className="protlys-segmented-indicator" aria-hidden="true" style={{transform:movementView === 'leaderboard' ? 'translateX(100%)' : 'translateX(0)'}} />
        </div>
      </div>
      {movementView === 'leaderboard' ? <div className="screen-pad" style={{paddingTop:0,paddingBottom:'calc(112px + env(safe-area-inset-bottom))'}}><WeeklyGroupLeaderboard userId={userId} mode="leaderboard" onModeChange={setMovementView}/></div> : <div className="screen-pad" style={{paddingTop:6}}>
        <AndroidStepTrackingCard />
        <div className="hub-card" style={{padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:32}}>
            <div className="t">Steps today</div>
            <div style={{display:'flex',alignItems:'center',gap:0,marginRight:-8}}>
              {liveLastSync && <span style={{fontSize:12,color:'var(--ink-45)',fontWeight:500,whiteSpace:'nowrap'}}>{liveSource === 'manual' ? 'Manual' : liveSource === 'healthkit' ? 'Apple Health' : 'Health Connect'} · {new Date(liveLastSync).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}
              {hasMovement && <ShareIconButton label="Share steps today" onClick={()=>openShare('steps_today')}/>} 
            </div>
          </div>
          <div className="mono" style={{fontSize:38,fontWeight:800,marginTop:8}}>{currentTodaySteps.toLocaleString()}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:9}}>
            <div style={{display:'flex',flexDirection:'column',padding:16,minHeight:96,borderRadius:11,background:'var(--green-soft)',boxSizing:'border-box'}}><div style={{display:'flex',alignItems:'center',gap:6,minWidth:0,minHeight:20}}><div className="t" style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Distance</div>{hasMovement && <ShareIconButton label="Share distance" onClick={()=>openShare('distance')} />}</div><div className="mono" style={{fontSize:18,lineHeight:1.2,fontWeight:800,marginTop:'auto'}}>{todayDistance.toFixed(1)} km</div></div>
            <div style={{display:'flex',flexDirection:'column',padding:16,minHeight:96,borderRadius:11,background:'var(--green-soft)',boxSizing:'border-box'}}><div style={{minHeight:20,display:'flex',alignItems:'flex-start'}}><div className="t">Calories</div></div><div className="mono" style={{fontSize:18,lineHeight:1.2,fontWeight:800,marginTop:'auto'}}>≈ {todayCalories}</div></div>
          </div>
          <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:7}}>Distance and calories are estimates from recorded steps.</div>
        </div>

        <div className="hub-grid" style={{marginTop:10}}>
          <div className="hub-card" style={{minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}><div className="t" style={{flex:1,minWidth:0}}>Days with movement</div>{hasMovement && <ShareIconButton label="Share active days" onClick={()=>openShare('movement_days')}/>}</div>
            <div className="mono" style={{fontSize:23,fontWeight:800}}>{recentActiveDays}</div>
            <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>in the displayed range</div>
          </div>
          <div className="hub-card" style={{minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
              <div className="t" style={{flex:1,minWidth:0}}>Lifetime steps</div>
              {totalSteps > 0 && <ShareIconButton label="Share lifetime steps" onClick={()=>openShare('lifetime_steps')}/>}
            </div>
            <div className="mono" style={{fontSize:23,fontWeight:800}}>{totalSteps.toLocaleString()}</div>
            <div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>all recorded steps</div>
          </div>
        </div>

        <div className="hub-card" style={{marginTop:10,padding:16}}>
          <div className="t">7-day totals</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:9}}>
            <div style={{fontSize:12,color:'var(--ink-70)'}}><strong className="mono">{recentTotal.toLocaleString()}</strong> steps</div>
            <div style={{fontSize:12,color:'var(--ink-70)',textAlign:'right'}}><strong className="mono">≈ {caloriesForSteps(recentTotal)}</strong> calories</div>
          </div>
        </div>

        <MovementActivity days={liveMovementDays.length ? liveMovementDays : liveWeekSteps} title="Recent activity" userId={userId} stepGoal={currentGoal} currentStreak={currentStreak} profile={profile} />
      </div>}
      {shareData && <ShareCardSheet open={!!shareData} onClose={()=>setShareData(null)} data={shareData} username={profile?.display_name || 'protlys'} avatarUrl={profile?.avatar_url || ''} />}
    </>
  );
}
