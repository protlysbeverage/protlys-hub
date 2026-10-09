'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import MemberShareSheet from '@/components/MemberShareSheet';
import { ProtlysLoader } from '@/app/calculator/ProtlysLoader';
import TargetHistory from './TargetHistory';

function Icon({ name, size = 19 }) {
  const paths = {
    steps: <><path d="M8.5 4.5c1.4 2 1.8 4.2.8 6.2-.8 1.7-2.5 2.7-4.1 2.5-1.6-.2-2.5-1.7-1.9-3.1.6-1.4 2-2 3.3-2.7 1.1-.5 1.5-1.4 1.9-2.9Z"/><path d="M15.5 19.5c-1.4-2-1.8-4.2-.8-6.2.8-1.7 2.5-2.7 4.1-2.5 1.6.2 2.5 1.7 1.9 3.1-.6 1.4-2 2-3.3 2.7-1.1.5-1.5 1.4-1.9 2.9Z"/></>,
    challenge: <><path d="M8 4h8l-1 6a3 3 0 0 1-6 0L8 4Z"/><path d="M12 13v5M8 21h8M5 4h3M16 4h3"/></>,
    community: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5M14.5 15.5c2.5-.2 4.5 1.3 5 3.5"/></>,
    profile: <><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.6-3.6 2.9-5.5 7-5.5s6.4 1.9 7 5.5"/></>,
    leaderboard: <><path d="M4 19V9h4v10M10 19V5h4v14M16 19v-7h4v7"/><path d="M3 21h18"/></>,
    share: <><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></>,
    box: <><path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="M4 8v9l8 4 8-4V8M12 12v9"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v11H4V7Z"/><circle cx="12" cy="12.5" r="3.2"/></>,
    chevronDown: <path d="m6 9 6 6 6-6"/>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function formatDistance(km) { if (km < 1) return `${Math.round(km * 1000)} m`; return `${km.toFixed(1)} km`; }
function dateLabel(key) {
  return new Intl.DateTimeFormat('en-US', { timeZone:'Africa/Nairobi', weekday:'short', month:'short', day:'numeric' }).format(new Date(key + 'T12:00:00+03:00'));
}

function CircularProgress({ steps, goal, dayKey }) {
  const size=40, stroke=4, radius=16, circumference=2*Math.PI*radius;
  const reached=goal>0 && steps>=goal;
  const progress=goal>0 ? Math.min(1,steps/goal) : 0;
  const dashOffset=circumference*(1-progress);
  const [visible,setVisible]=useState(false);
  const [goalPulse,setGoalPulse]=useState(false);
  const ref=useRef(null);
  const previousProgress=useRef(progress);

  useEffect(()=>{
    const node=ref.current;
    if(!node)return;
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        setVisible(true);
        observer.disconnect();
      }
    },{threshold:.15});
    observer.observe(node);
    return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    if(!reached || !dayKey)return;
    let shouldPulse=false;
    try{
      const key='protlys-goal-reached:'+dayKey;
      if(localStorage.getItem(key)!=='1'){
        localStorage.setItem(key,'1');
        shouldPulse=true;
      }
    }catch{}
    if(shouldPulse && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      setGoalPulse(true);
      const timer=window.setTimeout(()=>setGoalPulse(false),420);
      return()=>window.clearTimeout(timer);
    }
  },[reached,dayKey]);

  useEffect(()=>{ previousProgress.current=progress; },[progress]);

  return <div ref={ref} aria-label={reached ? 'Step goal reached' : String(Math.round(progress*100)) + '% of step goal'} style={{width:size,height:size,position:'relative',flex:'0 0 auto',transform:goalPulse?'scale(1.06)':'scale(1)',transition:'transform 200ms var(--ease-out)'}}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r={radius} stroke="var(--green-soft)" strokeWidth={stroke}/>
      <circle cx="20" cy="20" r={radius} stroke="var(--green-dark)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={visible ? dashOffset : circumference} style={{transition:'stroke-dashoffset 700ms var(--ease-out)',willChange:visible?'auto':'stroke-dashoffset'}} transform="rotate(-90 20 20)"/>
      {reached && <path className="goal-check-draw" d="m14.5 20.5 3.5 3.5 7-8" stroke="var(--green-dark)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
  </div>;
}

export default function AccountClient({ profile, achievements = [], todaySteps = 0, weekSteps = [], movementDays = [], targetHistory = [], targetG = 0, shopUrl, email }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [memberShareOpen, setMemberShareOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [localHour, setLocalHour] = useState(() => Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',hour:'2-digit',hourCycle:'h23'}).format(new Date())));
  useEffect(() => { const update = () => setLocalHour(Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',hour:'2-digit',hourCycle:'h23'}).format(new Date()))); update(); const timer = window.setInterval(update,60000); return () => window.clearInterval(timer); }, []);
  const [highlightedDay, setHighlightedDay] = useState('');
  const mascotRef = useRef(null);
  const activityRowsRef = useRef({});
  const highlightTimer = useRef(null);

  const name = profile?.display_name || email || 'Member';
  const avatarUrl = profile?.avatar_url;
  const storeUrl = shopUrl || 'https://protlys.com/collections/all';
  const totalSteps = Number(profile?.total_steps || 0);
  const stepGoal = Number(profile?.step_goal || 0) || 8000;
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/member/${profile?.id}` : `/member/${profile?.id}`;
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi' }).format(new Date());
  const activeDays = Array.from({ length:7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const row = weekSteps.find(item => item.step_date === key);
    return { key, steps:Number(row?.steps || 0) };
  });
  const activeDayCount = activeDays.filter(day => day.steps > 0).length;
  const activeRows = activeDays.filter(day => day.steps > 0).slice().reverse();
  const weekTotalSteps = activeDays.reduce((sum,day)=>sum+day.steps,0);
  const mascotProgress = Math.min(100, Math.max(0, Math.round((Number(todaySteps || 0) / Math.max(1, stepGoal)) * 100)));
  const isEvening = localHour >= 18 || localHour < 5;
  const greetingText = localHour < 12 && localHour >= 5 ? 'Good morning' : localHour < 18 && localHour >= 12 ? 'Good afternoon' : 'Good evening';
  const mascotMessage = isEvening ? 'Long day? Take a moment to reset.' : mascotProgress >= 100 ? 'Goal reached. That’s the energy.' : mascotProgress >= 60 ? 'You’re getting close. Keep moving.' : mascotProgress > 0 ? 'Good start. Let’s build the day.' : 'Ready when you are. Let’s get moving.';
  useEffect(() => { mascotRef.current?.setProgress(mascotProgress); }, [mascotProgress]);
  const todayDistanceKm = (Number(todaySteps) * 0.75) / 1000;
  const totalDistanceKm = (totalSteps * 0.75) / 1000;
  const sheetGoal = Number(stepGoal) || 8000;
  const movementHistory = useMemo(() => (movementDays || [])
    .map(row => ({ key: row.step_date, steps: Number(row.steps || 0) }))
    .filter(row => row.key)
    .sort((a, b) => a.key.localeCompare(b.key)), [movementDays]);
  const last30Movement = useMemo(() => {
    const end = new Date(todayKey + 'T12:00:00+03:00');
    const keys = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(end);
      d.setUTCDate(d.getUTCDate() - i);
      keys.push(new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi' }).format(d));
    }
    return keys.map(key => ({ key, steps: movementHistory.find(row => row.key === key)?.steps || 0 }));
  }, [movementHistory, todayKey]);
  const consistency30 = Math.round((last30Movement.filter(day => day.steps > 0).length / 30) * 100);
  const longestMovementStreak = useMemo(() => {
    let longest = 0;
    let run = 0;
    let previousKey = null;
    for (const row of movementHistory) {
      if (row.steps <= 0) { run = 0; previousKey = null; continue; }
      const currentDate = new Date(row.key + 'T12:00:00+03:00');
      const previousDate = previousKey ? new Date(previousKey + 'T12:00:00+03:00') : null;
      const consecutive = previousDate && Math.round((currentDate - previousDate) / 86400000) === 1;
      run = consecutive ? run + 1 : 1;
      longest = Math.max(longest, run);
      previousKey = row.key;
    }
    return Math.max(longest, Number(profile?.step_streak || 0));
  }, [movementHistory, profile?.step_streak]);
  function handleShareProfile() {
    if (!profile?.id) return;
    setMessage('');
    setMemberShareOpen(true);
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('Choose an image file.');
    if (file.size > 5 * 1024 * 1024) return setMessage('Photo must be 5MB or smaller.');
    setUploading(true); setMessage('');
    try {
      const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `avatars/${user.id}/profile-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('feed-images').upload(path, file, { cacheControl:'3600', upsert:false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('feed-images').getPublicUrl(path);
      const { error: profileError } = await supabase.from('profiles').update({ avatar_url:urlData.publicUrl }).eq('id', user.id);
      if (profileError) throw profileError;
      setMessage('Profile photo updated.'); router.refresh();
    } catch (error) { setMessage(error?.message || 'Could not update profile photo.'); }
    finally { setUploading(false); }
  }

  async function handleSignOut() {
    setSigningOut(true); const supabase = createClient(); await supabase.auth.signOut(); router.push('/login'); router.refresh();
  }

  const links = [
    { href:`/member/${profile?.id}`, label:'Profile', desc:'View your public profile, stats and recent posts.', icon:'profile' },
    { href:'/movement', label:'Movement & steps', desc:'Record movement and see your activity history.', icon:'steps' },
    { href:'/leaderboard', label:'Leaderboard', desc:'See how your steps compare this month.', icon:'leaderboard' },
    { href:'/challenges', label:'Challenges', desc:'Join challenges if they are useful to you.', icon:'challenge' },
    { href:'/', label:'Community', desc:'See the progress feed and share with the Hub.', icon:'community' },
    { href:storeUrl, label:'Shop Protlys', desc:'Browse Protlys products and place an order.', icon:'box', external:true },
  ];

  return <>
    <div className="screen-pad dashboard-redesign-head">
      <div className="dashboard-greeting-row">
        <div className="dashboard-greeting-copy"><div className="dashboard-greeting" style={{fontSize:"clamp(15px, 4.1vw, 22px)",lineHeight:1.2,whiteSpace:"normal",overflow:"visible",textOverflow:"clip",overflowWrap:"break-word",wordBreak:"normal",letterSpacing:"-0.035em",minWidth:0,maxWidth:"100%"}}>{greetingText}{profile?.username?.trim() ? ` ${profile.username.trim()}` : ''}</div><div className="dashboard-greeting-sub">Your Protlys Hub, at a glance.</div></div>
        <div className="dashboard-header-actions">
          <button type="button" aria-label="Open your profile" className="dashboard-avatar" onClick={() => router.push(profileUrl)}>{avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{name[0].toUpperCase()}</span>}</button>
          <button type="button" aria-label="Settings" className="dashboard-settings" onClick={() => router.push('/settings')}><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M12 2.75 14 2.75 14.55 5.1 16.15 5.75 18.25 4.55 19.65 5.95 18.45 8.05 19.1 9.65 21.45 10.2 21.45 12.2 19.1 12.75 18.45 14.35 19.65 16.45 18.25 17.85 16.15 16.65 14.55 17.3 14 19.65 12 19.65 11.45 17.3 9.85 16.65 7.75 17.85 6.35 16.45 7.55 14.35 6.9 12.75 4.55 12.2 4.55 10.2 6.9 9.65 7.55 8.05 6.35 5.95 7.75 4.55 9.85 5.75 11.45 5.1 12 2.75Z" transform="translate(0 1.3)"/><circle cx="13" cy="12" r="3.2"/></svg></button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}} />
      {message && <div role="status" style={{fontSize:11.5,color:message.includes('updated')||message.includes('shared')||message.includes('copied')?'var(--green-dark)':'#B3261E',marginTop:8}}>{message}</div>}
    </div>

    <div className="screen-pad dashboard-mascot-wrap" style={{paddingTop:0,paddingBottom:0}}>
      <section className="dashboard-mascot-card" aria-label="Protlys coach">
        <div className="dashboard-mascot-art"><ProtlysLoader ref={mascotRef}/></div>
        <div className="dashboard-mascot-copy">
          <div className="dashboard-mascot-kicker">{isEvening ? "Relaxation" : "Your move"}</div>
          <div className="dashboard-mascot-message">{mascotMessage}</div>
          {isEvening ? <a href="/relaxation" className="dashboard-relax-open">Open Relaxation →</a> : <><div className="dashboard-mascot-progress">{Number(todaySteps || 0).toLocaleString()} / {Number(stepGoal).toLocaleString()} steps</div><div className="dashboard-hero-track" role="progressbar" aria-label="Daily step goal" aria-valuenow={mascotProgress} aria-valuemin={0} aria-valuemax={100}><span style={{width:mascotProgress+"%"}} /></div></>}
        </div>
      </section>
    </div>

    <div className="screen-pad dashboard-redesign-content" style={{paddingTop:8,paddingBottom:'calc(112px + env(safe-area-inset-bottom))'}}>
      <div className="dashboard-metric-grid">
        <section className="hub-card dashboard-metric"><div className="t" style={{fontSize:10}}>Distance</div><div className="mono dashboard-metric-value">{formatDistance(todayDistanceKm)}</div><div className="dashboard-metric-note">Estimated from your steps</div></section>
        <section className="hub-card dashboard-metric"><div className="t" style={{fontSize:10}}>Protein target</div><div className="mono dashboard-metric-value">{Number(targetG || 0)}<span> g/day</span></div><div className="dashboard-metric-note">Your daily calculator target</div></section>
      </div>
      <div className="dashboard-target-history"><TargetHistory rows={targetHistory || []}/></div>
      {!isEvening && <section className="hub-card dashboard-relax-strip"><div className="dashboard-relax-orb" aria-hidden="true"><span /></div><div className="dashboard-relax-copy"><div className="dashboard-relax-title">Relaxation</div><div className="dashboard-relax-description">Take a moment to reset. Short breathing sessions for when you need to slow down.</div></div><a href="/relaxation" className="dashboard-relax-link">Open →</a></section>}

      <style>{`.dashboard-redesign-head{padding-top:22px!important;padding-bottom:10px!important}
.dashboard-greeting-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.dashboard-greeting-copy{min-width:0;flex:1;overflow:visible}
.dashboard-greeting{font-size:clamp(18px,5.1vw,25px);font-weight:800;letter-spacing:-.035em;line-height:1.2;white-space:normal;overflow:visible;overflow-wrap:normal;word-break:normal;max-width:100%}
.dashboard-greeting-sub{font-size:12px;color:var(--ink-45);margin-top:5px}
.dashboard-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}.dashboard-settings svg{display:block;flex:none;overflow:visible}
.dashboard-avatar,.dashboard-settings{width:44px;height:44px;min-width:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--card);color:var(--ink);border:1.5px solid var(--line);padding:0;cursor:pointer}
.dashboard-avatar{overflow:hidden;font-size:16px;font-weight:800}
.dashboard-avatar img{width:100%;height:100%;object-fit:cover}
.dashboard-avatar:focus-visible,.dashboard-settings:focus-visible{outline:3px solid var(--green);outline-offset:3px}
.dashboard-hero-track{height:6px;background:var(--green-soft);border-radius:999px;overflow:hidden;margin-top:10px}
.dashboard-hero-track span{display:block;height:100%;border-radius:inherit;background:var(--green);transition:width 400ms ease}
.dashboard-relax-open{display:inline-flex;margin-top:8px;color:var(--green-dark);font-size:12px;font-weight:800;text-decoration:none;min-height:32px;align-items:center}
.dashboard-metric-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}
.dashboard-metric{padding:14px;min-width:0}
.dashboard-metric-value{font-size:clamp(23px,6vw,30px);font-weight:800;margin-top:7px;letter-spacing:-.04em;overflow-wrap:anywhere}
.dashboard-metric-value span{font-family:inherit;font-size:11px;letter-spacing:0;color:var(--ink-45);font-weight:600}
.dashboard-metric-note{font-size:10.5px;color:var(--ink-45);margin-top:4px;line-height:1.35}
.dashboard-target-history{margin-top:10px}
.dashboard-target-history .screen-pad{padding:0!important}
.dashboard-target-history .hub-card{margin-bottom:10px!important}
.dashboard-relax-strip{display:flex;align-items:center;gap:12px;padding:13px;margin:0 0 12px}
.dashboard-relax-orb{width:40px;height:40px;border-radius:50%;flex:0 0 40px;display:grid;place-items:center;background:var(--green-soft)}
.dashboard-relax-orb span{width:17px;height:17px;border:2px solid var(--green-dark);border-radius:50%;animation:dashboard-breathe 8s ease-in-out infinite}
.dashboard-relax-copy{flex:1;min-width:0}
.dashboard-relax-title{font-size:13px;font-weight:800}
.dashboard-relax-description{font-size:10.5px;color:var(--ink-45);line-height:1.4;margin-top:3px}
.dashboard-relax-link{font-size:11.5px;font-weight:800;color:var(--green-dark);text-decoration:none;white-space:nowrap}
@keyframes dashboard-breathe{0%,100%{transform:scale(.8);opacity:.65}50%{transform:scale(1.25);opacity:1}}
@media(prefers-reduced-motion:reduce){.dashboard-hero-track span,.dashboard-relax-orb span{transition:none;animation:none}}

.dashboard-stat-tile:active{transform:scale(.98)}
.dashboard-sheet-layer{position:fixed;inset:0;z-index:90}.dashboard-sheet-scrim{position:absolute;inset:0;background:rgba(10,20,35,.45)}.dashboard-sheet{--ink:#0F2A4A;--ink-45:rgba(15,42,74,.45);--green-dark:#1F7A45;--green-soft:#E4F3EA;--line:rgba(15,42,74,.12);--card:#FFFFFF;position:fixed;left:0;right:0;bottom:0;max-height:80dvh;overflow-y:auto;background:#FFFFFF;color:#0F2A4A;border:1px solid rgba(15,42,74,.12);border-bottom:0;border-radius:28px 28px 0 0;padding:10px 20px calc(96px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,.18);transform:translateY(100%);transition:transform 250ms cubic-bezier(.2,.8,.2,1);touch-action:pan-y;overscroll-behavior:contain}.dashboard-sheet.is-open{transform:translateY(0)}html.protlys-dark .dashboard-sheet{--ink:#F2F6F2;--ink-45:rgba(242,246,242,.48);--green-dark:#76D89A;--green-soft:#193A27;--line:rgba(242,246,242,.13);--card:#171D19;background:#171D19;color:#F2F6F2;border-color:rgba(242,246,242,.13)}html.protlys-dark .dashboard-sheet .dashboard-sheet-close{background:#193A27;color:#F2F6F2}html.protlys-dark .dashboard-sheet .sheet-chip{background:#193A27;border-color:rgba(242,246,242,.13)}html.protlys-dark .dashboard-sheet .dashboard-sheet-dot{background:rgba(242,246,242,.48)}html.protlys-dark .dashboard-sheet .dashboard-sheet-dot.is-active{background:#76D89A}
.dashboard-sheet-grab{width:44px;height:5px;border-radius:9px;background:var(--line);margin:0 auto 14px}
.dashboard-sheet-head{display:flex;justify-content:space-between;align-items:center}
.dashboard-sheet-head h3{margin:0;font-size:18px}
.dashboard-sheet-close{width:34px;height:34px;border:0;border-radius:50%;background:var(--green-soft);color:var(--ink);font-size:20px;line-height:1;display:grid;place-items:center;cursor:pointer}
.dashboard-sheet-body{padding-bottom:4px}.dashboard-sheet-dots{display:flex;justify-content:center;gap:6px;margin:2px 0 10px}.dashboard-sheet-dot{width:6px;height:6px;border:0;border-radius:50%;padding:0;background:var(--ink-45);opacity:.3;cursor:pointer}.dashboard-sheet-dot.is-active{background:var(--green-dark);opacity:1}
.sheet-big{font-size:38px;font-weight:800;margin:14px 0 2px;letter-spacing:-1px}
.sheet-sub{opacity:.7;font-size:13px;margin:0 0 16px}
.sheet-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.sheet-chip{border:1px solid var(--line);border-radius:99px;padding:7px 12px;font-size:12px;font-weight:600;background:var(--green-soft)}
.sheet-empty{padding:24px;text-align:center;opacity:.7;border:1px dashed var(--line);border-radius:16px}
.sheet-progress{height:6px;border-radius:9px;background:currentColor;opacity:.12;overflow:hidden;margin-top:14px}
.sheet-progress i{display:block;height:100%;background:var(--green-dark);border-radius:inherit;opacity:1}
.sheet-week-pills{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-top:8px}
.sheet-day-pill{text-align:center;font-size:11px;opacity:.7}
.sheet-day-pill i{display:block;height:10px;border-radius:99px;margin-top:6px;background:var(--green-soft);border:1px solid var(--line)}
.sheet-day-pill i.on{background:var(--green-dark);border-color:var(--green-dark)}
@media (prefers-reduced-motion:reduce){.dashboard-sheet{transition:none}}
.week-strip{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;width:100%;box-sizing:border-box}.week-strip>*{min-width:0;text-align:center}.week-strip .capsule{width:100%;max-width:100%;height:10px;border-radius:999px}.week-strip-item{box-sizing:border-box}
.dashboard-mascot-wrap{padding-left:16px!important;padding-right:16px!important}.dashboard-mascot-card{display:flex;align-items:center;gap:12px;margin-top:12px;padding:12px 14px;border:1.5px solid var(--line);border-radius:18px;background:var(--card);overflow:hidden}.dashboard-mascot-art{width:72px;height:72px;flex:0 0 72px;display:flex;align-items:center;justify-content:center}.dashboard-mascot-art .protlys-loader{width:100%!important;display:flex;align-items:center;justify-content:center}.dashboard-mascot-art .protlys-loader-mascot{width:72px!important;margin:0!important}.dashboard-mascot-copy{min-width:0;flex:1}.dashboard-mascot-kicker{font-size:9px;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-45);font-weight:800}.dashboard-mascot-message{font-size:14px;line-height:1.25;font-weight:800;margin-top:3px}.dashboard-mascot-progress{font-size:10.5px;color:var(--ink-45);margin-top:5px}.dashboard-mascot-card .protlys-loader-svg{width:100%!important;height:auto!important}@media(min-width:900px){.dashboard-mascot-wrap{padding-left:0!important;padding-right:0!important}}`}</style>
      <section className="hub-card" style={{padding:14,marginBottom:10,boxSizing:'border-box',overflow:'hidden'}}>
        <div role="button" tabIndex={0} aria-expanded={activityOpen} aria-controls="recent-activity-details" onClick={() => setActivityOpen(v => !v)} onKeyDown={event => { if(event.key==='Enter' || event.key===' ') { event.preventDefault(); setActivityOpen(v => !v); } }} style={{display:'block',width:'100%',minHeight:44,padding:0,margin:0,border:0,background:'transparent',color:'inherit',textAlign:'left',cursor:'pointer'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}><div><div className="t" style={{fontSize:10}}>Recent activity</div><div style={{fontSize:15,fontWeight:800,marginTop:3}}>{activeDayCount} days with movement</div></div>
            <span aria-hidden="true" style={{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',flex:'0 0 28px',color:'var(--ink-45)',transform:`rotate(${activityOpen ? 180 : 0}deg)`,transition:'transform 200ms var(--ease-out)'}}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
          </div>
          <div className="week-strip" style={{boxSizing:'border-box',width:'100%',marginTop:10}}>
            {activeDays.map(day => <button key={day.key} className="week-strip-item motion-tap" type="button" onClick={event => { event.stopPropagation(); scrollToActivityDay(day.key); }} aria-label={`${dateLabel(day.key)}: ${day.steps.toLocaleString()} steps`} style={{minWidth:0,width:'100%',padding:0,border:0,margin:0,background:'transparent',color:'inherit',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:10,textAlign:'center'}}>
              <span style={{display:'block',width:'100%',minWidth:0,fontSize:9.5,color:'var(--ink-45)',marginBottom:5,textAlign:'center'}}>{new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Nairobi',weekday:'short'}).format(new Date(day.key + 'T12:00:00+03:00')).slice(0,1)}</span>
              <span className="capsule" style={{display:'block',width:'100%',maxWidth:'100%',height:10,minWidth:0,borderRadius:999,background:day.steps > 0 ? 'var(--green-dark)' : 'var(--green-soft)',border:day.steps > 0 ? '0' : '1px solid var(--line)',boxSizing:'border-box'}} />
            </button>)}</div>
        </div>
        <div id="recent-activity-details" style={{display:'grid',gridTemplateRows:activityOpen ? '1fr' : '0fr',transition:'grid-template-rows 250ms var(--ease-out)',overflow:'hidden'}}>
          <div style={{minHeight:0}}><div style={{paddingTop:14}}>
            {activeRows.length === 0 ? <div style={{padding:'14px 12px',borderRadius:14,background:'var(--paper)',color:'var(--ink-70)',fontSize:12.5}}>No movement yet this week. Your first steps will show up here.</div> : <div style={{display:'grid',gap:8}}>
              {activeRows.map((day, rowIndex) => { const distance=(day.steps*0.75)/1000; const isToday=day.key===todayKey; return <div key={day.key} ref={node => { if(node) activityRowsRef.current[day.key]=node; else delete activityRowsRef.current[day.key]; }} style={{padding:'11px 12px 10px',borderRadius:14,border:'1px solid var(--line)',background:'var(--card)',boxShadow:highlightedDay===day.key ? '0 0 0 2px var(--green)' : 'none',transition:'box-shadow 200ms var(--ease-out)',animation:'account-activity-row-in 180ms var(--ease-out) both',animationDelay:`${rowIndex*40}ms`}}>
                <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.05fr) minmax(0,1.35fr) auto',alignItems:'center',gap:8}}>
                  <div style={{minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}><span style={{fontSize:12.5,fontWeight:800}}>{dateLabel(day.key)}</span>{isToday && <span style={{fontSize:9,padding:'3px 7px',borderRadius:999,background:'var(--green-soft)',color:'var(--green-dark)',fontWeight:800}}>Today</span>}</div></div>
                  <div style={{minWidth:0}}><div className="mono" style={{fontSize:13,fontWeight:800}}>{day.steps.toLocaleString()} steps</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>{formatDistance(distance)} · est.</div></div>
                  <CircularProgress steps={day.steps} goal={stepGoal} dayKey={day.key}/>
                </div>
                <div style={{height:4,background:'var(--green-soft)',borderRadius:999,overflow:'hidden',marginTop:9}}><div className="motion-progress-fill" style={{height:'100%',width:'100%',background:'var(--green)',borderRadius:999,'--progress':`${stepGoal > 0 ? Math.min(1,day.steps/stepGoal) : 0}`}} /></div>
              </div>})}
            </div>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginTop:12}}><span style={{fontSize:11.5,color:'var(--ink-70)',fontWeight:700}}>{activeDayCount} of 7 days active · {weekTotalSteps.toLocaleString()} steps this week</span><button type="button" className="link-btn" style={{minHeight:44,padding:'8px 2px'}} onClick={() => router.push('/movement')}>View all in Movement</button></div>
          </div></div>
        </div>
      </section>

      <div style={{fontWeight:800,fontSize:14,marginBottom:9}}>Your Hub</div>
      <div style={{border:'1.5px solid var(--line)',borderRadius:16,overflow:'hidden',background:'#fff'}}>{links.map((item,index) => <a key={item.label} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined} style={{display:'block',textDecoration:'none',borderBottom:index===links.length-1?'none':'1px solid var(--line)'}}><div className="list-row" style={{padding:'15px'}}><div className="left" style={{display:'flex',alignItems:'center',gap:12}}><span style={{color:'var(--green-dark)',display:'flex'}}><Icon name={item.icon}/></span><div><div className="lbl">{item.label}</div><div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:2}}>{item.desc}</div></div></div><svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></div></a>)}</div>
      <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',marginTop:16}}>Shop Protlys products</a>
      <div style={{marginTop:20,textAlign:'center'}}>
        {!confirmSignOut ? <button type="button" onClick={() => setConfirmSignOut(true)} className="btn-secondary" style={{width:'100%'}}>Sign out</button> : <div><div style={{fontSize:13,fontWeight:800,marginBottom:10}}>Sign out of Protlys Hub?</div><div style={{display:'flex',gap:8}}><button type="button" onClick={() => setConfirmSignOut(false)} className="btn-secondary" style={{flex:1}}>Cancel</button><button type="button" onClick={handleSignOut} disabled={signingOut} className="btn-primary" style={{flex:1}}>{signingOut?'Signing out…':'Sign out'}</button></div></div>}
      </div>
    </div>
    <MemberShareSheet open={memberShareOpen} onClose={()=>setMemberShareOpen(false)} profileId={profile?.id} displayName={name} avatarUrl={avatarUrl || ''} joinedAt={profile?.created_at ? new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',day:'numeric',month:'short',year:'numeric'}).format(new Date(profile.created_at)) : ''} founding={Number(profile?.founding_member)===1 || Number(profile?.founding_member)===true || true} activeDays={movementHistory.slice(-14).map(row=>({key:row.key,steps:row.steps,logged:row.steps>0}))} totalSteps={totalSteps} currentStreak={Number(profile?.step_streak||0)} bestStreak={longestMovementStreak}/>
  </>;
}
