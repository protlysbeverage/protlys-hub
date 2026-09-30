'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import MilestoneShareCard from '@/components/MilestoneShareCard';

function Icon({ name, size = 19 }) {
  const paths = {
    steps: <><path d="M8.5 4.5c1.4 2 1.8 4.2.8 6.2-.8 1.7-2.5 2.7-4.1 2.5-1.6-.2-2.5-1.7-1.9-3.1.6-1.4 2-2 3.3-2.7 1.1-.5 1.5-1.4 1.9-2.9Z"/><path d="M15.5 19.5c-1.4-2-1.8-4.2-.8-6.2.8-1.7 2.5-2.7 4.1-2.5 1.6.2 2.5 1.7 1.9 3.1-.6 1.4-2 2-3.3 2.7-1.1.5-1.5 1.4-1.9 2.9Z"/></>,
    challenge: <><path d="M8 4h8l-1 6a3 3 0 0 1-6 0L8 4Z"/><path d="M12 13v5M8 21h8M5 4h3M16 4h3"/></>,
    community: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5M14.5 15.5c2.5-.2 4.5 1.3 5 3.5"/></>,
    profile: <><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.6-3.6 2.9-5.5 7-5.5s6.4 1.9 7 5.5"/></>,
    share: <><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.8-4.6M8 13l7.8 4.6"/></>,
    box: <><path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="M4 8v9l8 4 8-4V8M12 12v9"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v11H4V7Z"/><circle cx="12" cy="12.5" r="3.2"/></>,
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

export default function AccountClient({ profile, achievements = [], todaySteps = 0, weekSteps = [], movementDays = [], shopUrl, email }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [highlightedDay, setHighlightedDay] = useState('');
  const [sheet, setSheet] = useState(null);
  const sheetRef = useRef(null);
  const sheetCloseRef = useRef(null);
  const sheetTouchStartY = useRef(null);
  const sheetTouchDeltaY = useRef(0);
  const sheetLastFocus = useRef(null);
  const activityRowsRef = useRef({});
  const highlightTimer = useRef(null);

  const name = profile?.display_name || email || 'Member';
  const avatarUrl = profile?.avatar_url;
  const storeUrl = shopUrl || 'https://protlys.com/collections/all';
  const totalSteps = Number(profile?.total_steps || 0);
  const stepGoal = Number(profile?.step_goal || 0);
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
  const sheetWeek = activeDays.map(day => ({
    label: new Intl.DateTimeFormat('en-US', { timeZone:'Africa/Nairobi', weekday:'short' })
      .format(new Date(day.key + 'T12:00:00+03:00')).slice(0, 1),
    km: (day.steps * 0.75) / 1000,
    steps: day.steps,
  }));
  const hourlySteps = [];
  const milestoneOptions = useMemo(() => {
    const rows = (achievements || []).map(row => row?.achievements || row).filter(Boolean);
    const text = row => String(row?.slug || '') + ' ' + String(row?.name || '') + ' ' + String(row?.description || '');
    const options = [3, 7, 14, 30, 60, 100]
      .filter(n => Number(profile?.step_streak || 0) >= n)
      .map(n => ({
        key: 'streak-' + n,
        type: 'streak',
        value: n,
        label: 'Day streak',
        subline: n + ' days of movement in a row',
        accent: 'flame',
        title: n + '-day movement streak',
        shareText: (who = '') => (who ? who + ' just hit a ' : 'I just hit a ') + n + '-day movement streak on Protlys. Join me: https://hub.protlys.com/calculator?src=milestone'
      }));
    if (rows.some(row => /first.*(goal|target)|(goal|target).*first/i.test(text(row)))) {
      options.push({
        key: 'first-goal',
        type: 'goal',
        value: Math.max(1, Number(profile?.step_goal || 0)),
        label: 'First goal reached',
        subline: 'Your first day reaching your step goal',
        accent: 'flag',
        title: 'First movement goal reached',
        shareText: (who = '') => (who ? who + ' reached their first movement goal on Protlys. Join me: ' : 'I reached my first movement goal on Protlys. Join me: ') + 'https://hub.protlys.com/calculator?src=milestone'
      });
    }
    rows.filter(row => /challenge/i.test(text(row)) && /complete|finish|earned/i.test(text(row))).forEach(row => {
      const slug = String(row?.slug || row?.name || 'completed').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      options.push({
        key: 'challenge-' + slug,
        type: 'challenge',
        value: '✓',
        label: 'Challenge completed',
        subline: String(row?.name || 'Movement challenge completed'),
        accent: 'trophy',
        title: 'Protlys challenge completed',
        shareText: (who = '') => (who ? who + ' completed a movement challenge on Protlys. Join me: ' : 'I completed a movement challenge on Protlys. Join me: ') + 'https://hub.protlys.com/calculator?src=milestone'
      });
    });
    return options;
  }, [achievements, profile?.step_streak, profile?.step_goal]);

  const [milestoneBanner, setMilestoneBanner] = useState(null);
  useEffect(() => {
    if (!profile?.id || milestoneOptions.length === 0) return;
    try {
      const key = 'protlys-shown-milestones:' + profile.id;
      const shown = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
      const next = milestoneOptions.find(m => !shown.has(m.key));
      if (next) {
        shown.add(next.key);
        localStorage.setItem(key, JSON.stringify([...shown]));
        setMilestoneBanner(next);
      }
    } catch {}
  }, [profile?.id, milestoneOptions]);

  useEffect(() => () => { if (highlightTimer.current) window.clearTimeout(highlightTimer.current); }, []);
  function scrollToActivityDay(key) { setActivityOpen(true); window.setTimeout(()=>{ const row=activityRowsRef.current[key]; if(!row)return; const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; row.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'}); setHighlightedDay(key); if(highlightTimer.current)window.clearTimeout(highlightTimer.current); highlightTimer.current=window.setTimeout(()=>setHighlightedDay(''),1200); },260); }

  function openSheet(id) {
    sheetLastFocus.current = document.activeElement;
    setSheet(id);
    window.setTimeout(() => sheetCloseRef.current?.focus(), 0);
  }

  function closeSheet() {
    setSheet(null);
    sheetTouchDeltaY.current = 0;
    if (sheetLastFocus.current && typeof sheetLastFocus.current.focus === 'function') {
      window.setTimeout(() => sheetLastFocus.current?.focus(), 0);
    }
  }

  function handleSheetKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSheet();
    }
  }

  function handleSheetTouchStart(event) {
    sheetTouchStartY.current = event.touches?.[0]?.clientY ?? null;
    sheetTouchDeltaY.current = 0;
  }

  function handleSheetTouchMove(event) {
    if (sheetTouchStartY.current == null) return;
    const currentY = event.touches?.[0]?.clientY ?? sheetTouchStartY.current;
    sheetTouchDeltaY.current = Math.max(0, currentY - sheetTouchStartY.current);
    if (sheetTouchDeltaY.current > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${Math.min(sheetTouchDeltaY.current, 160)}px)`;
    }
  }

  function handleSheetTouchEnd() {
    const delta = sheetTouchDeltaY.current;
    sheetTouchStartY.current = null;
    sheetTouchDeltaY.current = 0;
    if (delta > 72) { closeSheet(); return; }
    if (sheetRef.current) sheetRef.current.style.transform = '';
  }

  useEffect(() => {
    if (!sheet) return;
    document.addEventListener('keydown', handleSheetKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleSheetKeyDown);
      document.body.style.overflow = previousOverflow;
      if (sheetRef.current) sheetRef.current.style.transform = '';
    };
  }, [sheet]);

  function fmt(value) {
    return Number(value || 0).toLocaleString();
  }

  function BarChart({ values, labels }) {
    const safeValues = values.map(value => Number(value || 0));
    const max = Math.max(...safeValues, 1);
    const W = 300, H = 120, bw = W / Math.max(safeValues.length, 1);
    return <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}} role="img" aria-label="Bar chart">
      {safeValues.map((value, index) => {
        const bh = Math.max((value / max) * (H - 22), value > 0 ? 3 : 0);
        return <g key={index}>
          <rect x={index * bw + bw * .18} y={H - 18 - bh} width={bw * .64} height={bh} rx="4" fill="var(--green-dark)" opacity={value ? 1 : .15}/>
          {labels?.[index] ? <text x={index * bw + bw / 2} y={H - 4} fontSize="10" textAnchor="middle" fill="currentColor" opacity=".6">{labels[index]}</text> : null}
        </g>;
      })}
    </svg>;
  }

  function Ring({ pct }) {
    const safePct = Math.max(0, Math.min(1, Number(pct) || 0));
    const r = 52, c = 2 * Math.PI * r;
    return <svg viewBox="0 0 130 130" style={{width:150,display:'block',margin:'0 auto'}} role="img" aria-label={`${Math.round(safePct * 100)}% of daily goal`}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="currentColor" opacity=".12" strokeWidth="12"/>
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--green-dark)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - safePct)} transform="rotate(-90 65 65)"/>
      <text x="65" y="71" textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor">{Math.round(safePct * 100)}%</text>
    </svg>;
  }

  function SheetBody() {
    if (sheet === 'today') {
      const hasHourlyData = hourlySteps.some(Boolean);
      return <>
        <div className="sheet-big">{fmt(todaySteps)}</div>
        <p className="sheet-sub">of {fmt(sheetGoal)} daily goal</p>
        <Ring pct={Number(todaySteps) / sheetGoal}/>
        <h4 style={{margin:'18px 0 8px'}}>By hour</h4>
        {hasHourlyData
          ? <BarChart values={hourlySteps} labels={hourlySteps.map((_, i) => i % 6 === 0 ? `${i}h` : '')}/>
          : <div className="sheet-empty">No hourly step data is stored for today yet.</div>}
      </>;
    }
    if (sheet === 'distance') {
      const weekKm = sheetWeek.reduce((sum, day) => sum + day.km, 0);
      const marathons = totalDistanceKm / 42.195;
      return <>
        <div className="sheet-big">{totalDistanceKm.toFixed(1)} km</div>
        <p className="sheet-sub">based on recorded steps</p>
        {sheetWeek.length ? <BarChart values={sheetWeek.map(day => day.km)} labels={sheetWeek.map(day => day.label)}/> : <div className="sheet-empty">No distance data recorded yet.</div>}
        <div className="sheet-chips">
          <span className="sheet-chip">{weekKm.toFixed(1)} km this week</span>
          <span className="sheet-chip">≈ {marathons.toFixed(1)} marathons</span>
        </div>
      </>;
    }
    if (sheet === 'days') {
      const count = sheetWeek.filter(day => day.steps > 0).length;
      return <>
        <div className="sheet-big">{count} of 7</div>
        <p className="sheet-sub">days with movement this week</p>
        <div className="sheet-week-pills">
          {sheetWeek.map((day, index) => <div key={index} className="sheet-day-pill">
            <span>{day.label}</span>
            <i aria-hidden="true" className={day.steps > 0 ? 'on' : ''}/>
          </div>)}
        </div>
        <div className="sheet-chips">
          <span className="sheet-chip">{consistency30}% of last 30 days</span>
          <span className="sheet-chip">Longest streak: {longestMovementStreak} days</span>
        </div>
      </>;
    }
    const milestones = [100000, 250000, 500000, 1000000];
    const next = milestones.find(m => m > totalSteps);
    const prev = [...milestones].reverse().find(m => m <= totalSteps) || 0;
    const pct = next ? Math.round(((totalSteps - prev) / (next - prev)) * 100) : 100;
    return <>
      <div className="sheet-big">{fmt(totalSteps)}</div>
      <p className="sheet-sub">{next ? `${fmt(next - totalSteps)} steps to ${fmt(next)}` : 'All milestones reached'}</p>
      <div className="sheet-progress"><i style={{width:`${pct}%`}}/></div>
      <div className="sheet-chips">
        {milestones.map(m => <span key={m} className="sheet-chip">{totalSteps >= m ? '✓ ' : ''}{fmt(m)}</span>)}
      </div>
    </>;
  }

  async function handleShareProfile() {
    if (!profile?.id) return;
    setSharing(true); setMessage('');
    try {
      const shareData = { title: `${name} on Protlys Hub`, text: `Check out ${name}'s Protlys Hub profile.`, url: profileUrl };
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        setMessage('Profile shared.');
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
        setMessage('Profile link copied.');
      } else {
        throw new Error('Sharing is not supported on this device.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage(error?.message || 'Could not share profile.');
    } finally { setSharing(false); }
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
    { href:'/challenges', label:'Challenges', desc:'Join challenges if they are useful to you.', icon:'challenge' },
    { href:'/', label:'Community', desc:'See the progress feed and share with the Hub.', icon:'community' },
    { href:storeUrl, label:'Shop Protlys', desc:'Browse Protlys products and place an order.', icon:'box', external:true },
  ];

  return <>
    <div className="screen-pad">
      <span className="eyebrow">Dashboard</span>
      <h1 style={{fontSize:24,marginBottom:4}}>Your Protlys dashboard</h1>
      <p className="subhead">A simple view of your movement and what you have recorded.</p>

      <div role="link" tabIndex={0} aria-label="Go to your profile" onClick={() => router.push(profileUrl)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); router.push(profileUrl); } }} style={{display:'flex',alignItems:'center',gap:13,marginTop:16,background:'var(--card)',border:'1.5px solid var(--line)',borderRadius:16,padding:14,cursor:'pointer'}}>
        <button type="button" onClick={(event) => { event.stopPropagation(); fileRef.current?.click(); }} disabled={uploading} aria-label="Change profile photo" style={{width:58,height:58,borderRadius:'50%',background:'var(--green-soft)',border:0,padding:0,overflow:'hidden',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--green-dark)',flexShrink:0,cursor:'pointer'}}>
          {avatarUrl ? <img src={avatarUrl} alt="Profile" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <span style={{fontSize:20,fontWeight:800}}>{name[0].toUpperCase()}</span>}
          <span style={{position:'absolute',right:0,bottom:0,width:20,height:20,borderRadius:'50%',background:'var(--ink)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff'}}><Icon name="camera" size={10}/></span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}} />
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:800,fontSize:16}}>{name}</div>
          <div style={{fontSize:12,color:'var(--ink-45)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{email}</div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginTop:5,flexWrap:'wrap'}}>
            <button type="button" onClick={(event) => { event.stopPropagation(); fileRef.current?.click(); }} disabled={uploading} style={{padding:0,border:0,background:'none',color:'var(--green-dark)',fontSize:11.5,fontWeight:800,cursor:'pointer'}}>{uploading ? 'Uploading…' : avatarUrl ? 'Change profile photo' : 'Add profile photo'}</button>
            <button type="button" onClick={(event) => { event.stopPropagation(); handleShareProfile(); }} disabled={sharing} style={{display:'inline-flex',alignItems:'center',gap:4,padding:0,border:0,background:'none',color:'var(--green-dark)',fontSize:11.5,fontWeight:800,cursor:sharing?'default':'pointer'}}><Icon name="share" size={13}/>{sharing ? 'Sharing…' : 'Share profile'}</button>
          </div>
          {message && <div style={{fontSize:10.5,color:message.includes('updated')||message.includes('shared')||message.includes('copied')?'var(--green-dark)':'#B3261E',marginTop:3}}>{message}</div>}
        </div>
      </div>
    </div>

    {milestoneBanner && <div className="screen-pad" style={{paddingTop:8,paddingBottom:0}}><div role="status" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:'1px solid var(--line)',borderRadius:14,background:'var(--green-soft)'}}><div style={{minWidth:0,flex:1,fontSize:12,fontWeight:800,color:'var(--ink)'}}>{milestoneBanner.type==='streak' ? milestoneBanner.value + '-day streak! Share your milestone' : milestoneBanner.type==='goal' ? 'First goal reached! Share your milestone' : 'Challenge completed! Share your milestone'}</div><MilestoneShareCard milestone={milestoneBanner} profile={profile}/><button type="button" onClick={()=>setMilestoneBanner(null)} aria-label="Dismiss milestone" style={{width:32,height:32,border:0,background:'transparent',color:'var(--ink-45)',fontSize:20}}>×</button></div></div>}
    <div className="screen-pad" style={{paddingTop:4,paddingBottom:'calc(112px + env(safe-area-inset-bottom))'}}>
      <div className="hub-card" style={{padding:16,marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:10,marginBottom:14}}><div><div className="t" style={{fontSize:10}}>Today's movement</div><div style={{fontSize:20,fontWeight:800,marginTop:3}}>Steps + Distance</div></div><span style={{fontSize:11,color:'var(--ink-45)'}}>Recorded</span></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><div style={{background:'var(--green-soft)',borderRadius:14,padding:13}}><div className="t" style={{fontSize:9.5}}>Steps</div><div className="mono" style={{fontSize:25,fontWeight:800,marginTop:4}}>{Number(todaySteps).toLocaleString()}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>steps recorded</div></div><div style={{background:'var(--green-soft)',borderRadius:14,padding:13}}><div className="t" style={{fontSize:9.5}}>Estimated distance</div><div className="mono" style={{fontSize:25,fontWeight:800,marginTop:4}}>{formatDistance(todayDistanceKm)}</div><div style={{fontSize:10.5,color:'var(--ink-45)',marginTop:2}}>based on steps</div></div></div>
      </div>


      <style>{`
.dashboard-stat-tile:active{transform:scale(.98)}
.dashboard-sheet-layer{position:fixed;inset:0;z-index:75}
.dashboard-sheet-scrim{position:absolute;inset:0;background:rgba(0,0,0,.45);opacity:1}
.dashboard-sheet{position:absolute;left:0;right:0;bottom:0;max-height:86dvh;overflow:auto;background:var(--card);color:var(--ink);border-radius:28px 28px 0 0;padding:10px 20px calc(96px + env(safe-area-inset-bottom));transform:translateY(0);transition:transform .3s cubic-bezier(.2,.8,.2,1);touch-action:pan-y}
.dashboard-sheet-grab{width:44px;height:5px;border-radius:9px;background:var(--line);margin:0 auto 14px}
.dashboard-sheet-head{display:flex;justify-content:space-between;align-items:center}
.dashboard-sheet-head h3{margin:0;font-size:18px}
.dashboard-sheet-close{width:34px;height:34px;border:0;border-radius:50%;background:var(--green-soft);color:var(--ink);font-size:20px;line-height:1;display:grid;place-items:center;cursor:pointer}
.dashboard-sheet-body{padding-bottom:4px}
.sheet-big{font-size:38px;font-weight:800;margin:14px 0 2px;letter-spacing:-1px}
.sheet-sub{opacity:.7;font-size:13px;margin:0 0 16px}
.sheet-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.sheet-chip{border:1px solid var(--line);border-radius:99px;padding:8px 14px;font-size:13px;font-weight:600}
.sheet-empty{padding:24px;text-align:center;opacity:.7;border:1px dashed var(--line);border-radius:16px}
.sheet-progress{height:6px;border-radius:9px;background:currentColor;opacity:.12;overflow:hidden;margin-top:14px}
.sheet-progress i{display:block;height:100%;background:var(--green-dark);border-radius:inherit;opacity:1}
.sheet-week-pills{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-top:8px}
.sheet-day-pill{text-align:center;font-size:11px;opacity:.7}
.sheet-day-pill i{display:block;height:10px;border-radius:99px;margin-top:6px;background:var(--green-soft);border:1px solid var(--line)}
.sheet-day-pill i.on{background:var(--green-dark);border-color:var(--green-dark)}
@media (prefers-reduced-motion:reduce){.dashboard-sheet{transition:none}}
.week-strip{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;width:100%;box-sizing:border-box}.week-strip>*{min-width:0;text-align:center}.week-strip .capsule{width:100%;max-width:100%;height:10px;border-radius:999px}.week-strip-item{box-sizing:border-box}
`}</style>
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

      <div className="hub-grid" style={{marginBottom:20}}>
        {[
          ['today','Steps today',Number(todaySteps).toLocaleString(),null],
          ['distance','Estimated distance',formatDistance(totalDistanceKm),'all recorded steps'],
          ['days','Movement days',String(activeDayCount),'last 7 days'],
          ['lifetime','Lifetime steps',totalSteps.toLocaleString(),'all recorded movement'],
        ].map(([id,label,value,note]) => <div key={id} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`${label}: ${value}. Open details`} className="hub-card dashboard-stat-tile" onClick={() => openSheet(id)} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSheet(id); }
        }} style={{minHeight:82,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'flex-start',padding:'12px',cursor:'pointer'}}>
          <div className="t" style={{fontSize:9.5,lineHeight:1.15,marginBottom:5}}>{label}</div>
          <div className="mono" style={{fontSize:18,fontWeight:800,lineHeight:1.1}}>{value}</div>
          {note && <div style={{fontSize:9.5,color:'var(--ink-45)',marginTop:3}}>{note}</div>}
        </div>)}
      </div>
      <p className="disclaimer" style={{marginTop:-8,marginBottom:20}}>Distance is an estimate using an average 0.75 m stride. Your actual distance may vary.</p>
      {sheet && <div className="dashboard-sheet-layer">
        <div className="dashboard-sheet-scrim" onClick={closeSheet} aria-hidden="true"/>
        <section ref={sheetRef} className="dashboard-sheet" role="dialog" aria-modal="true" aria-labelledby="dashboard-sheet-title" aria-describedby="dashboard-sheet-body" onClick={event => event.stopPropagation()} onTouchStart={handleSheetTouchStart} onTouchMove={handleSheetTouchMove} onTouchEnd={handleSheetTouchEnd}>
          <div className="dashboard-sheet-grab" aria-hidden="true"/>
          <div className="dashboard-sheet-head">
            <h3 id="dashboard-sheet-title">{({today:'Steps today',distance:'Estimated distance',days:'Movement days',lifetime:'Lifetime steps'})[sheet]}</h3>
            <button ref={sheetCloseRef} type="button" onClick={closeSheet} aria-label="Close details" className="dashboard-sheet-close">×</button>
          </div>
          <div id="dashboard-sheet-body" className="dashboard-sheet-body"><SheetBody/></div>
        </section>
      </div>}

      <div style={{fontWeight:800,fontSize:14,marginBottom:9}}>Your Hub</div>
      <div style={{border:'1.5px solid var(--line)',borderRadius:16,overflow:'hidden',background:'#fff'}}>{links.map((item,index) => <a key={item.label} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined} style={{display:'block',textDecoration:'none',borderBottom:index===links.length-1?'none':'1px solid var(--line)'}}><div className="list-row" style={{padding:'15px'}}><div className="left" style={{display:'flex',alignItems:'center',gap:12}}><span style={{color:'var(--green-dark)',display:'flex'}}><Icon name={item.icon}/></span><div><div className="lbl">{item.label}</div><div style={{fontSize:11.5,color:'var(--ink-45)',marginTop:2}}>{item.desc}</div></div></div><svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></div></a>)}</div>
      <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',marginTop:16}}>Shop Protlys products</a>
      <div style={{marginTop:20,textAlign:'center'}}>
        {!confirmSignOut ? <button type="button" onClick={() => setConfirmSignOut(true)} className="btn-secondary" style={{width:'100%'}}>Sign out</button> : <div><div style={{fontSize:13,fontWeight:800,marginBottom:10}}>Sign out of Protlys Hub?</div><div style={{display:'flex',gap:8}}><button type="button" onClick={() => setConfirmSignOut(false)} className="btn-secondary" style={{flex:1}}>Cancel</button><button type="button" onClick={handleSignOut} disabled={signingOut} className="btn-primary" style={{flex:1}}>{signingOut?'Signing out…':'Sign out'}</button></div></div>}
      </div>
    </div>
  </>;
}
