'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ShareCardSheet from '@/components/ShareCardSheet';
import { ShareIconButton } from '@/components/ShareIcon';
import { chooseMessage, currentStreak, messageForSession, monthlyCardData, rememberSessionMessage, sessionCardData, suggestions as meditationSuggestions } from '@/lib/meditation-share';
import { formatMinutes, groupSessionsByLocalDay, localDateKey, monthTotals, recentSessionDays } from '@/lib/stillness-history';

const STORAGE = {
  haptics: 'protlys-relaxation-haptics',
  chime: 'protlys-relaxation-chime',
};

const HAPTICS = {
  inhale: [40],
  hold: [15],
  exhale: [25, 50, 25],
  pause: [20],
  done: [100, 60, 100],
};

const SESSIONS = [
  {
    name: 'Reset',
    duration: 2 * 60,
    description: 'A quick breathing reset for any moment.',
    pattern: [['in', 4], ['out', 6]],
  },
  {
    name: 'Unwind',
    duration: 5 * 60,
    description: 'Slow down after a busy day.',
    pattern: [['in', 4], ['hold', 4], ['out', 6]],
  },
  {
    name: 'Wind down',
    duration: 10 * 60,
    description: 'A slower evening session to help you settle.',
    pattern: [['in', 4], ['hold', 7], ['out', 8]],
  },
];

const PHASES = {
  in: { label: 'Breathe in', cue: 'Slowly through your nose', haptic: 'inhale', tone: 440 },
  hold: { label: 'Hold', cue: 'Stay soft and still', haptic: 'hold' },
  out: { label: 'Breathe out', cue: 'Gently let it go', haptic: 'exhale', tone: 330 },
};

function readPreference(key, fallback = true) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  return value === null ? fallback : value === 'true';
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function phaseAt(pattern, elapsed) {
  const cycleLength = pattern.reduce((sum, [, seconds]) => sum + seconds, 0);
  const cycleElapsed = cycleLength ? elapsed % cycleLength : 0;
  let cursor = 0;
  for (let i = 0; i < pattern.length; i += 1) {
    const [type, seconds] = pattern[i];
    if (cycleElapsed < cursor + seconds || i === pattern.length - 1) {
      return {
        type,
        phaseIndex: i,
        phaseElapsed: Math.max(0, cycleElapsed - cursor),
        phaseDuration: seconds,
        cycleElapsed,
      };
    }
    cursor += seconds;
  }
  return { type: pattern[0][0], phaseIndex: 0, phaseElapsed: 0, phaseDuration: pattern[0][1], cycleElapsed: 0 };
}

function getScale(type, phaseElapsed, phaseDuration) {
  const progress = phaseDuration ? Math.min(1, Math.max(0, phaseElapsed / phaseDuration)) : 0;
  if (type === 'in') return 0.55 + 0.45 * progress;
  if (type === 'out') return 1 - 0.45 * progress;
  return 1;
}

function cycleCount(pattern, elapsed) {
  const cycleLength = pattern.reduce((sum, [, seconds]) => sum + seconds, 0);
  if (!cycleLength) return 0;
  return Math.floor(Math.max(0, elapsed) / cycleLength);
}

export default function RelaxationClient() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('list');
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState({ type: 'in', phaseIndex: 0, phaseElapsed: 0, phaseDuration: 4 });
  const [haptics, setHaptics] = useState(true);
  const [chime, setChime] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [meditationRows, setMeditationRows] = useState([]);
  const [profileUsername, setProfileUsername] = useState('protlys');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [shareSuggestions, setShareSuggestions] = useState([]);
  const [showEarlierMonths,setShowEarlierMonths]=useState(false);

  const elapsedRef = useRef(0);
  const phaseRef = useRef(phase);
  const statusRef = useRef(status);
  const rafRef = useRef(null);
  const lastFrameRef = useRef(null);
  const previousPhaseRef = useRef(null);
  const wakeLockRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeTonesRef = useRef(new Set());
  const savedCompletionRef = useRef(false);

  useEffect(() => {
    let cancelled=false;
    (async()=>{
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)return;
      const [{data:rows},{data:profile}]=await Promise.all([
        supabase.from('meditation_sessions').select('id,user_id,minutes,completed_at').order('completed_at',{ascending:false}).limit(1000),
        supabase.from('profiles').select('display_name').eq('id',user.id).maybeSingle(),
      ]);
      if(cancelled)return;
      setMeditationRows(rows||[]);
      setProfileUsername(profile?.display_name||'protlys');
    })().catch(error=>console.error('[Protlys Meditation] load failed',error));
    return()=>{cancelled=true};
  },[]);

  useEffect(() => {
    setHaptics(readPreference(STORAGE.haptics, true));
    setChime(readPreference(STORAGE.chime, true));
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopVibration = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(0);
    } catch {}
  }, []);

  const vibrate = useCallback((pattern) => {
    if (!haptics || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('[Protlys Meditation] haptics unavailable', error);
    }
  }, [haptics]);

  const stopTones = useCallback(() => {
    activeTonesRef.current.forEach((oscillator) => {
      try { oscillator.stop(); } catch {}
      try { oscillator.disconnect(); } catch {}
    });
    activeTonesRef.current.clear();
  }, []);

  const playTone = useCallback(async (frequency) => {
    if (!chime || !frequency || typeof window === 'undefined' || !window.AudioContext) return;
    try {
      const AudioContextClass = window.AudioContext;
      const context = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === 'suspended') await context.resume();
      if (!chime) return;

      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      activeTonesRef.current.add(oscillator);
      oscillator.addEventListener('ended', () => {
        activeTonesRef.current.delete(oscillator);
        try { oscillator.disconnect(); } catch {}
      }, { once: true });
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 1);
    } catch (error) {
      console.warn('[Protlys Meditation] soft chime unavailable', error);
    }
  }, [chime]);

  useEffect(() => {
    if (!chime) stopTones();
  }, [chime, stopTones]);

  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {}
    wakeLockRef.current = null;
  }, []);

  const syncPhase = useCallback((nextElapsed, announce = true) => {
    if (!selected) return;
    const nextPhase = phaseAt(selected.pattern, nextElapsed);
    const previous = phaseRef.current;
    elapsedRef.current = nextElapsed;
    setElapsed(nextElapsed);
    setPhase(nextPhase);

    if (announce && previous && (previous.type !== nextPhase.type || previous.phaseIndex !== nextPhase.phaseIndex)) {
      const config = PHASES[nextPhase.type];
      vibrate(HAPTICS[config.haptic]);
      if (config.tone) void playTone(config.tone);
    }
  }, [selected, vibrate, playTone]);

  const saveCompletedMeditation = useCallback(async (minutes, completedAt) => {
    if (savedCompletionRef.current) return;
    savedCompletionRef.current = true;
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){savedCompletionRef.current=false;return;}
    const row={user_id:user.id,minutes,completed_at:completedAt.toISOString()};
    const {data,error}=await supabase.from('meditation_sessions').insert(row).select('id,user_id,minutes,completed_at').single();
    if(error){console.error('[Protlys Meditation] save failed',error);savedCompletionRef.current=false;return;}
    const nextRows=[data,...meditationRows];
    setMeditationRows(nextRows);
    const message=chooseMessage();
    rememberSessionMessage(data.id,message);
    const card=sessionCardData(nextRows,minutes,completedAt,message);
    setShareData(card);
    setShareSuggestions(meditationSuggestions(minutes,card.currentStreak,nextRows,completedAt));
    setShareOpen(true);
  },[meditationRows]);


  const animationFrame = useCallback((timestamp) => {
    if (statusRef.current !== 'running' || !selected) return;

    if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
    const delta = Math.min(0.25, Math.max(0, (timestamp - lastFrameRef.current) / 1000));
    lastFrameRef.current = timestamp;

    const nextElapsed = Math.min(selected.duration, elapsedRef.current + delta);
    syncPhase(nextElapsed, true);

    if (nextElapsed >= selected.duration) {
      stopVibration();
      void releaseWakeLock();
      stopTones();
      setStatus('complete');
      statusRef.current = 'complete';
      setCompleted(true);
      lastFrameRef.current = null;
      void saveCompletedMeditation(Math.max(1, Math.round(selected.duration / 60)), new Date());
      return;
    }

    rafRef.current = window.requestAnimationFrame(animationFrame);
  }, [selected, syncPhase, stopVibration, releaseWakeLock, vibrate, chime, playTone, saveCompletedMeditation]);

  useEffect(() => {
    if (status !== 'running' || !selected) return;
    lastFrameRef.current = null;
    rafRef.current = window.requestAnimationFrame(animationFrame);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = null;
    };
  }, [status, selected, animationFrame]);

  const pauseSession = useCallback((auto = false) => {
    if (statusRef.current !== 'running') return;
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastFrameRef.current = null;
    stopVibration();
    void releaseWakeLock();
    setStatus('paused');
    statusRef.current = 'paused';
  }, [releaseWakeLock, stopVibration, vibrate]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        pauseSession(true);
      } else if (statusRef.current === 'running') {
        lastFrameRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pauseSession]);

  useEffect(() => () => {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    stopVibration();
    void releaseWakeLock();
    stopTones();
    try { audioContextRef.current?.close(); } catch {}
  }, [stopVibration, releaseWakeLock, stopTones]);

  useEffect(() => {
    const handleBeforeUnload = () => stopVibration();
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => window.removeEventListener('pagehide', handleBeforeUnload);
  }, [stopVibration]);

  const beginSession = async () => {
    if (!selected) return;
    // This is the first user gesture: safe point for vibration and audio autoplay rules.
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const AudioContextClass = window.AudioContext;
        const context = audioContextRef.current || new AudioContextClass();
        audioContextRef.current = context;
        if (context.state === 'suspended') await context.resume();
      } catch {}
    }
    elapsedRef.current = 0;
    setElapsed(0);
    syncPhase(0, false);
    previousPhaseRef.current = 'in';
    vibrate(HAPTICS.inhale);
    void playTone(440);
    await acquireWakeLock();
    setStatus('running');
    statusRef.current = 'running';
    setCompleted(false);
    savedCompletionRef.current=false;
  };

  const resumeSession = async () => {
    if (!selected) return;
    await acquireWakeLock();
    setStatus('running');
    statusRef.current = 'running';
    lastFrameRef.current = null;
  };

  const endSession = useCallback(() => {
    if (!selected) return;
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastFrameRef.current = null;
    stopVibration();
    void releaseWakeLock();
    setCompleted(false);
    setStatus('complete');
    statusRef.current = 'complete';
  }, [selected, releaseWakeLock, stopVibration]);

  const goBack = () => {
    if (status === 'list') {
      router.back();
      return;
    }
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastFrameRef.current = null;
    stopVibration();
    void releaseWakeLock();
    setSelected(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setCompleted(false);
    setStatus('list');
    statusRef.current = 'list';
  };

  const chooseSession = (session) => {
    stopVibration();
    setSelected(session);
    setElapsed(0);
    elapsedRef.current = 0;
    setPhase(phaseAt(session.pattern, 0));
    setStatus('ready');
    statusRef.current = 'ready';
    setCompleted(false);
  };

  const goAgain = () => {
    if (!selected) return;
    setElapsed(0);
    elapsedRef.current = 0;
    setPhase(phaseAt(selected.pattern, 0));
    setCompleted(false);
    savedCompletionRef.current=false;
    setStatus('ready');
    statusRef.current = 'ready';
  };

  const finishToList = () => {
    stopVibration();
    void releaseWakeLock();
    setSelected(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setCompleted(false);
    setStatus('list');
    statusRef.current = 'list';
  };

  const progress = selected ? Math.min(1, elapsed / selected.duration) : 0;
  const scale = getScale(phase.type, phase.phaseElapsed, phase.phaseDuration);
  const phaseRemaining = Math.max(0, Math.ceil(phase.phaseDuration - phase.phaseElapsed));
  const cycles = selected ? cycleCount(selected.pattern, elapsed) : 0;
  const minutesCompleted = Math.max(1, Math.round(elapsed / 60));
  const isSessionScreen = status !== 'list';
  const localTimeZone=typeof Intl!=='undefined'?(Intl.DateTimeFormat().resolvedOptions().timeZone||'Africa/Nairobi'):'Africa/Nairobi';
  const todayKey=localDateKey(new Date(),localTimeZone); const monthKey=todayKey.slice(0,7);
  const historyDays=recentSessionDays(meditationRows,localTimeZone,5); const currentMonth=monthTotals(meditationRows,monthKey,localTimeZone);
  const allDays=groupSessionsByLocalDay(meditationRows,localTimeZone); const byDate=new Map(allDays.map(d=>[d.date,d]));
  const stripDays=Array.from({length:14},(_,i)=>{const d=new Date(todayKey+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(13-i));return d.toISOString().slice(0,10);});
  const olderMonthKeys=[...new Set(allDays.map(d=>d.date.slice(0,7)).filter(k=>k!==monthKey))].sort().reverse();

  const stageStyle = useMemo(() => ({
    '--relax-progress': `${progress * 100}%`,
  }), [progress]);

  return (
    <div className="screen-pad relaxation-page" style={{ paddingBottom: 'calc(112px + env(safe-area-inset-bottom))' }}>
      {status === 'list' && (
        <>
          <button type="button" className="relax-back" onClick={() => router.back()} aria-label="Go back">
            <span aria-hidden="true">←</span><span>Back</span>
          </button>
          <span className="eyebrow">Relaxation</span>
          <h1 className="relax-heading">Take a moment.</h1>
          <p className="subhead relax-subhead">Simple breathing sessions to help you reset, unwind and slow things down.</p>

          <div className="relax-session-list">
            {SESSIONS.map((session) => (
              <button key={session.name} type="button" className="relax-session" onClick={() => chooseSession(session)} aria-label={`${session.name}, ${Math.round(session.duration / 60)} minutes`}>
                <div>
                  <div className="relax-kicker">{Math.round(session.duration / 60)} min</div>
                  <div className="relax-title">{session.name}</div>
                  <div className="relax-desc">{session.description}</div>
                </div>
                <span className="relax-start">Start</span>
              </button>
            ))}
          </div>

          <div className="relax-settings" aria-label="Relaxation settings">
            <label className="relax-setting">
              <span><strong>Haptics</strong><small>Gentle cues during the session</small></span>
              <input type="checkbox" checked={haptics} onChange={(event) => { setHaptics(event.target.checked); localStorage.setItem(STORAGE.haptics, String(event.target.checked)); }} />
              <span className="relax-switch" aria-hidden="true"><span /></span>
            </label>
            <label className="relax-setting">
              <span><strong>Soft chime</strong><small>Quiet tones at phase changes</small></span>
              <input type="checkbox" checked={chime} onChange={(event) => { setChime(event.target.checked); localStorage.setItem(STORAGE.chime, String(event.target.checked)); }} />
              <span className="relax-switch" aria-hidden="true"><span /></span>
            </label>
          </div>

          <section className="relax-history" aria-label="Meditation history">
            <div className="relax-history-head"><div><span className="eyebrow">Stillness</span><h2>Past sessions</h2></div><button type="button" className="relax-monthly-link" onClick={()=>{setShareData(monthlyCardData(meditationRows));setShareSuggestions([]);setShareOpen(true);}}>Monthly recap <span aria-hidden="true">→</span></button></div>
            {meditationRows.length ? <><div className="relax-month-summary"><div className="relax-summary-grid"><div><strong>{currentMonth.sessions}</strong><span>Sessions</span></div><div><strong>{formatMinutes(currentMonth.minutes)}</strong><span>Total time</span></div><div><strong>{currentMonth.activeDays}</strong><span>Active days</span></div></div><div className="relax-strip" aria-label="Last 14 days">{stripDays.map(key=>{const day=byDate.get(key);const count=day?.sessions.length||0;const label=new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(key+'T12:00:00Z'));return <span key={key} className={(count?'active ':'')+(key===todayKey?'today':'')} aria-label={`${label}: ${count} ${count===1?'session':'sessions'}`}/>} )}</div></div>
            <div className="relax-history-list">{historyDays.map(day=>{const dateText=new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day.date+'T12:00:00Z'));return <details className="relax-history-day" key={day.date}><summary><span><strong>{dateText}</strong>{day.date===todayKey&&<em>Today</em>}</span><span>{day.sessions.length} {day.sessions.length===1?'session':'sessions'} · {day.minutes} min</span></summary><div className="relax-day-sessions">{day.sessions.map((row,i)=><div key={row.id}><span>Session {i+1}</span><span>{row.minutes} min · {new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZone:localTimeZone}).format(new Date(row.completed_at))}</span></div>)}<ShareIconButton variant="movement" label={`Share ${dateText} meditation`} onClick={()=>{const row=day.sessions[0];setShareData(sessionCardData(meditationRows,day.minutes,new Date(row.completed_at),messageForSession(row.id)));setShareSuggestions([]);setShareOpen(true);}}/></div></details>})}</div>
            <button type="button" className="relax-earlier" onClick={()=>setShowEarlierMonths(v=>!v)} aria-expanded={showEarlierMonths}>See earlier months <span aria-hidden="true">{showEarlierMonths?'↑':'↓'}</span></button>
            {showEarlierMonths&&<div className="relax-older-months">{olderMonthKeys.length?olderMonthKeys.map(key=>{const totals=monthTotals(meditationRows,key,localTimeZone);const label=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'-01T12:00:00Z'));return <div key={key}><strong>{label}</strong><span>{totals.sessions} sessions · {formatMinutes(totals.minutes)} · {totals.activeDays} active days</span></div>}):<div>No earlier months yet.</div>}</div>}</> : <div className="relax-history-empty">No sessions yet. Your first one will show up here.</div>}
          </section>

          <section className="relax-note">
            <div className="relax-note-title">A little reset goes a long way.</div>
            <div>Relaxation here is about everyday recovery — no pressure, no perfect routine.</div>
          </section>
        </>
      )}

      {isSessionScreen && selected && (
        <>
          <header className="relax-session-header">
            <button type="button" className="relax-back session-back" onClick={goBack} aria-label="Back to relaxation sessions">
              <span aria-hidden="true">←</span><span>Back</span>
            </button>
            <span className="relax-session-name">{selected.name}</span>
          </header>

          {status === 'complete' ? (
            <section className="relax-complete" aria-live="polite">
              <div className="relax-complete-mark" aria-hidden="true">🍃</div>
              <h1>Nicely done.</h1>
              <p>{completed ? `You completed ${selected.name}. Notice how you feel.` : `Every pause counts — even a short one helps.`}</p>
              <div className="relax-stats">
                <div><strong>{minutesCompleted}</strong><span>minutes completed</span></div>
                <div><strong>{cycles}</strong><span>breath cycles completed</span></div>
              </div>
              <div className="relax-complete-actions">
                <button type="button" className="btn-secondary" onClick={goAgain}>Go again</button>
                <button type="button" className="btn-primary" onClick={finishToList}>Done</button>
              </div>
            </section>
          ) : (
            <section className={`relax-session-screen ${reducedMotion ? 'is-reduced-motion' : ''}`} aria-label={`${selected.name} breathing session`}>
              <div className="relax-stage" style={stageStyle}>
                <div className="relax-progress-ring" aria-hidden="true">
                  <div className="relax-orb" style={{ transform: `scale(${reducedMotion ? 1 : scale})` }}>
                    <span className="relax-countdown mono">{phaseRemaining}</span>
                  </div>
                </div>
              </div>

              <div className="relax-phase-block">
                <div className="relax-phase-label" aria-live="polite">{status === 'paused' ? 'Paused' : PHASES[phase.type].label}</div>
                <div className="relax-cue">{status === 'paused' ? 'Paused — take your time' : PHASES[phase.type].cue}</div>
              </div>

              <div className="relax-whole-timer mono">{formatTime(selected.duration - elapsed)} left</div>

              {status === 'ready' && <button type="button" className="btn-primary relax-primary" onClick={beginSession} aria-label={`Begin ${selected.name} breathing session`}>Begin</button>}
              {status === 'running' && (
                <div className="relax-controls">
                  <button type="button" className="btn-primary relax-primary" onClick={() => pauseSession(false)}>Pause</button>
                  <button type="button" className="btn-secondary relax-end" onClick={endSession}>End</button>
                </div>
              )}
              {status === 'paused' && (
                <div className="relax-controls">
                  <button type="button" className="btn-primary relax-primary" onClick={resumeSession}>Resume</button>
                  <button type="button" className="btn-secondary relax-end" onClick={endSession}>End</button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <style>{`
        .relaxation-page{min-height:100%;}
        .relax-history{margin-top:20px;padding-top:18px;border-top:1px solid var(--line);}
        .relax-history-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px;}
        .relax-history-head h2{font-size:18px;margin:4px 0 0;}
        .relax-monthly-link{border:0;background:none;color:var(--green-dark);font-size:11px;font-weight:800;padding:6px 0;cursor:pointer;white-space:nowrap;}
        .relax-month-summary{border:1px solid var(--line);border-radius:16px;padding:13px;background:var(--white);margin-bottom:10px}.relax-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.relax-summary-grid>div{min-width:0}.relax-summary-grid strong,.relax-summary-grid span{display:block}.relax-summary-grid strong{font-size:16px}.relax-summary-grid span{font-size:9.5px;color:var(--ink-45);margin-top:3px}.relax-strip{display:grid;grid-template-columns:repeat(14,1fr);gap:4px;margin-top:13px}.relax-strip span{aspect-ratio:1;border-radius:3px;background:var(--line);border:1px solid transparent}.relax-strip span.active{background:var(--green)}.relax-strip span.today{outline:1px solid var(--green-dark);outline-offset:2px}.relax-history-list{display:grid;gap:1px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--line);}
        .relax-history-day{background:var(--white)}.relax-history-day summary{min-height:48px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;list-style:none}.relax-history-day summary::-webkit-details-marker{display:none}.relax-history-day summary>span{font-size:11px}.relax-history-day summary>span:first-child{display:flex;align-items:center;gap:7px}.relax-history-day summary em{font-style:normal;font-size:9px;border:1px solid var(--line);border-radius:999px;padding:2px 6px;color:var(--green-dark)}.relax-day-sessions{padding:0 12px 10px;border-top:1px solid var(--line)}.relax-day-sessions>div{min-height:36px;display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:var(--ink-45)}.relax-earlier{width:100%;min-height:48px;margin-top:8px;border:1px solid var(--line);border-radius:14px;background:var(--white);color:inherit;display:flex;align-items:center;justify-content:space-between;padding:0 13px;font-weight:750}.relax-older-months{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-top:8px}.relax-older-months>div{min-height:48px;padding:9px 12px;background:var(--white);display:flex;flex-direction:column;justify-content:center;border-bottom:1px solid var(--line)}.relax-older-months>div:last-child{border-bottom:0}.relax-older-months strong{font-size:11.5px}.relax-older-months span{font-size:9.5px;color:var(--ink-45);margin-top:2px}
        .relax-history-row>div{display:flex;align-items:baseline;gap:8px;min-width:0;}
        .relax-history-row strong{font-size:13px;white-space:nowrap;}
        .relax-history-row small{font-size:10.5px;color:var(--ink-45);white-space:nowrap;}
        .relax-history-empty{padding:14px;border:1px dashed var(--line);border-radius:14px;color:var(--ink-45);font-size:11px;}
        html.protlys-dark .relax-history-day,html.protlys-dark .relax-month-summary,html.protlys-dark .relax-earlier,html.protlys-dark .relax-older-months>div{background:#151815;}


        .relax-back{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:48px;padding:6px 4px;border:0;background:none;color:var(--ink-70);font-size:13px;font-weight:800;cursor:pointer;}
        .relax-back span:first-child{font-size:20px;line-height:1;}
        .relax-back:focus-visible,.relax-session:focus-visible,.relax-primary:focus-visible,.relax-end:focus-visible{outline:2px solid var(--green);outline-offset:2px;}
        .relax-setting input:focus-visible + .relax-switch{box-shadow:0 0 0 3px rgba(107,203,69,.28);}
        .relax-heading{font-size:28px;margin-bottom:5px;}
        .relax-subhead{max-width:440px;}
        .relax-session-list{display:grid;gap:10px;margin-top:22px;}
        .relax-session{width:100%;min-height:74px;display:flex;align-items:center;justify-content:space-between;gap:14px;text-align:left;padding:14px 16px;border:1.5px solid var(--line);border-radius:18px;background:var(--white);color:inherit;cursor:pointer;}
        .relax-kicker{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-45);font-weight:800;}
        .relax-title{font-size:17px;font-weight:800;margin-top:3px;}
        .relax-desc{font-size:11.5px;color:var(--ink-45);margin-top:3px;}
        .relax-start{flex:0 0 auto;color:var(--green-dark);font-size:12px;font-weight:800;border:1px solid var(--line);padding:8px 11px;border-radius:999px;background:var(--green-soft);}
        .relax-settings{display:grid;gap:1px;margin-top:16px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--line);}
        .relax-setting{position:relative;display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:64px;padding:10px 14px;background:var(--white);cursor:pointer;}
        .relax-setting > span:first-child{display:flex;flex-direction:column;gap:2px;}
        .relax-setting strong{font-size:13px;}
        .relax-setting small{font-size:10.5px;color:var(--ink-45);}
        .relax-setting input{position:absolute;opacity:0;pointer-events:none;}
        .relax-switch{width:48px;height:28px;flex:0 0 48px;border-radius:999px;background:var(--ink-20);padding:3px;display:flex;align-items:center;justify-content:flex-start;transition:background 180ms var(--ease-out);}
        .relax-switch span{width:22px;height:22px;border-radius:50%;background:var(--white);box-shadow:0 1px 3px var(--ink-20);transition:transform 180ms var(--ease-out);}
        .relax-setting input:checked + .relax-switch{background:var(--green);}
        .relax-setting input:checked + .relax-switch span{transform:translateX(20px);}
        .relax-support-note{margin:7px 2px 0;font-size:10px;color:var(--ink-45);text-align:right;}
        .relax-note{margin-top:18px;padding:14px 15px;border-radius:16px;background:var(--green-soft);color:var(--ink-70);font-size:11.5px;line-height:1.45;}
        .relax-note-title{font-size:13px;font-weight:800;color:var(--ink);margin-bottom:2px;}

        .relax-session-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:-5px 0 0;}
        .relax-session-header .session-back{flex:0 0 auto;}
        .relax-session-name{font:600 10.5px/1 'IBM Plex Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;color:var(--green-dark);}
        .relax-session-screen{display:flex;flex-direction:column;align-items:center;padding:8px 0 0;}
        .relax-stage{width:min(320px,82vw);height:min(320px,82vw);display:grid;place-items:center;margin:8px auto 0;}
        .relax-progress-ring{position:relative;width:100%;height:100%;display:grid;place-items:center;border-radius:50%;padding:4px;background:conic-gradient(var(--green) var(--relax-progress),var(--line) 0);}
        .relax-progress-ring::after{content:'';position:absolute;width:calc(min(320px,82vw) - 8px);height:calc(min(320px,82vw) - 8px);border-radius:50%;background:var(--paper);}
        .relax-orb{position:relative;z-index:1;width:70%;height:70%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 42% 36%,var(--green) 0%,var(--green-dark) 78%);box-shadow:0 0 34px var(--green-soft),0 0 70px var(--green-soft);will-change:transform;}
        .relax-countdown{font-size:clamp(42px,13vw,58px);font-weight:700;letter-spacing:-.05em;color:var(--white);text-shadow:0 1px 2px var(--ink-20);}
        .relax-session-screen.is-reduced-motion .relax-orb{transform:scale(1)!important;animation:relax-opacity-pulse 2.4s ease-in-out infinite;}
        .relax-phase-block{text-align:center;margin-top:10px;min-height:62px;}
        .relax-phase-label{font-size:22px;font-weight:850;line-height:1.15;}
        .relax-cue{font-size:11.5px;color:var(--ink-45);margin-top:6px;}
        .relax-whole-timer{font-size:14px;font-weight:700;color:var(--ink-70);margin-top:8px;}
        .relax-primary{min-height:52px;margin-top:17px;color:var(--ink)!important;}
        .relax-controls{width:100%;display:flex;flex-direction:column;gap:9px;margin-top:17px;}
        .relax-end{min-height:48px;width:100%;font-size:12.5px;padding:11px 20px;}
        .relax-complete{text-align:center;padding:38px 0 10px;}
        .relax-complete-mark{font-size:54px;line-height:1;margin-bottom:12px;}
        .relax-complete h1{font-size:32px;}
        .relax-complete p{max-width:310px;margin:8px auto 0;color:var(--ink-70);font-size:13.5px;line-height:1.5;}
        .relax-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:24px 0 18px;}
        .relax-stats > div{min-height:98px;padding:15px 10px;border:1px solid var(--line);border-radius:16px;background:var(--white);display:flex;flex-direction:column;justify-content:center;}
        .relax-stats strong{font:700 28px/1 'IBM Plex Mono',monospace;color:var(--green-dark);}
        .relax-stats span{font-size:10.5px;color:var(--ink-45);margin-top:7px;}
        .relax-complete-actions{display:grid;gap:9px;}
        .relax-complete-actions button{min-height:50px;}
        @keyframes relax-opacity-pulse{0%,100%{opacity:.82}50%{opacity:1}}
        @media(max-width:380px){
          .relax-stage{width:282px;height:282px;}
          .relax-progress-ring::after{width:274px;height:274px;}
          .relax-phase-label{font-size:20px;}
        }
        @media(prefers-reduced-motion:reduce){
          .relax-switch,.relax-switch span{transition:none;}
          .relax-session-screen.is-reduced-motion .relax-orb{animation:relax-opacity-pulse 3s ease-in-out infinite;}
        }
      `}</style>
      <ShareCardSheet open={shareOpen} onClose={()=>setShareOpen(false)} data={shareData} type={shareData?.type} metric={shareData?.metric} username={profileUsername} lookSet="meditation" cardWidth={320} cardHeight={640} sheetTitle={shareData?.type==='meditation-monthly'?'Monthly recap':'Your session'} primaryLabel="Share" showSave={false} showCopy={false} onDone={()=>setShareOpen(false)} suggestions={shareSuggestions} />
    </div>
  );
}
