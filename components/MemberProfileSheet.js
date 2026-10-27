'use client';
import {createPortal} from 'react-dom';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import MemberAvatar from './MemberAvatar';
import {isoWeekStart,summarizeMemberWeek,weekContextLabel} from '@/lib/leaderboard-week';

const TZ='Africa/Nairobi';
const fmt=v=>Number(v||0).toLocaleString('en-US');
const currentDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(new Date());

export default function MemberProfileSheet({open,row,weekStart,groupId=null,viewerId,onClose,returnFocusRef}){
 const [loadKey,setLoadKey]=useState(0),[state,setState]=useState({loading:true,stats:null,error:''});
 const dialogRef=useRef(null),startY=useRef(null),closing=useRef(false),closeRef=useRef(onClose); closeRef.current=onClose;
 const close=useCallback((fromHistory=false)=>{if(closing.current)return;closing.current=true;if(!fromHistory&&history.state?.protlysMemberSheet)history.back();else closeRef.current?.();setTimeout(()=>{closing.current=false},0)},[]);
 useEffect(()=>{if(!open||!row?.user_id)return;let dead=false;setState({loading:true,stats:null,error:''});createClient().rpc('get_member_week_stats',{p_user_id:row.user_id,p_group_id:groupId,p_week_start:weekStart}).then(({data,error})=>{if(dead)return;setState(error?{loading:false,stats:null,error:error.message||'Could not load activity.'}:{loading:false,stats:data,error:''})});return()=>{dead=true}},[open,row?.user_id,weekStart,groupId,loadKey]);
 useEffect(()=>{if(!open)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';document.documentElement.classList.add('member-sheet-open');history.pushState({...(history.state||{}),protlysMemberSheet:true},'',location.href);const pop=()=>close(true);const key=e=>{if(e.key==='Escape')close();if(e.key!=='Tab')return;const nodes=[...(dialogRef.current?.querySelectorAll('button,a,[tabindex]:not([tabindex="-1"])')||[])].filter(n=>!n.disabled);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};addEventListener('popstate',pop);addEventListener('keydown',key);setTimeout(()=>dialogRef.current?.querySelector('button')?.focus(),0);return()=>{document.body.style.overflow=old;document.documentElement.classList.remove('member-sheet-open');removeEventListener('popstate',pop);removeEventListener('keydown',key);returnFocusRef?.current?.focus?.()}},[open,close,returnFocusRef]);
 const summary=useMemo(()=>state.stats?.steps_visible?summarizeMemberWeek(state.stats.days||[],weekStart,currentDay()):null,[state.stats,weekStart]);
 if(!open||!row||typeof document==='undefined')return null;
 const currentWeek=isoWeekStart(new Date(),TZ),label=weekContextLabel(weekStart,currentWeek),privateSteps=state.stats&&!state.stats.steps_visible;
 const graph=summary?.days||Array.from({length:7},(_,i)=>({date:String(i),steps:0})),max=Math.max(1,...graph.map(d=>d.steps));
 return createPortal(<><div className="member-sheet-backdrop" data-testid="member-sheet-backdrop" onClick={()=>close()}/><section ref={dialogRef} className="member-profile-sheet" data-testid="member-profile-sheet" role="dialog" aria-modal="true" aria-label={`${row.username||'Member'} profile`}>
   <div className="member-sheet-handle" onTouchStart={e=>{startY.current=e.touches[0].clientY}} onTouchEnd={e=>{if(startY.current!=null&&e.changedTouches[0].clientY-startY.current>70)close();startY.current=null}}/>
   <header className="member-sheet-header"><div className="member-sheet-person"><MemberAvatar user={row} size={48}/><div><strong>{row.username||'Member'}</strong><span>Rank #{row.rank}</span></div></div><button type="button" className="member-sheet-close" aria-label="Close" onClick={()=>close()}>×</button></header>
   <div className="member-sheet-week">{label}</div>
   {state.error?<div className="member-sheet-error">Could not load this profile.<button type="button" onClick={()=>setLoadKey(v=>v+1)}>Retry</button></div>:privateSteps?<div className="member-sheet-error">This member keeps their movement details private.</div>:<><div className="member-sheet-tiles">
    {state.loading?Array.from({length:4},(_,i)=><div className="member-sheet-tile skeleton" key={i}/>):<>
      <div className="member-sheet-tile"><small>Weekly steps</small><strong>{fmt(summary?.weeklySteps)}</strong></div>
      <div className="member-sheet-tile"><small>{summary?.isCurrentWeek?'Steps today':'Best day'}</small><strong>{fmt(summary?.isCurrentWeek?summary?.stepsToday:summary?.bestDay?.steps)}</strong></div>
      <div className="member-sheet-tile"><small>Estimated distance</small><strong>{Number(summary?.distanceKm||0).toFixed(1)} <i>km</i></strong></div>
      <div className="member-sheet-tile"><small>Movement days</small><strong>{summary?.movementDays??0}<i>/7</i></strong></div>
    </>}</div>
    <div className="member-sheet-graph"><div className="member-sheet-graph-title">Last 7 days</div><div className="member-sheet-bars">{graph.map((d,i)=><div className="member-sheet-bar-col" key={d.date}><div className="member-sheet-bar-track"><i style={{height:state.loading?'35%':`${Math.max(3,(d.steps/max)*100)}%`}}/></div><span>{['M','T','W','T','F','S','S'][i]}</span></div>)}</div></div></>}
   <div className="member-sheet-actions">{row.user_id===viewerId?<a href="/account/edit" className="member-sheet-action primary">Edit profile</a>:<><button type="button" className="member-sheet-action primary">Cheer</button><a href={`/messages?member=${encodeURIComponent(row.user_id)}`} className="member-sheet-action">Message</a></>}</div>
 </section><style>{`
 :root{--z-page:1;--z-bottom-nav:40;--z-floating-dot:50;--z-member-backdrop:80;--z-member-sheet:81}
 .member-sheet-backdrop{position:fixed;inset:0;z-index:var(--z-member-backdrop);background:rgba(0,0,0,.56)}
 .member-profile-sheet{position:fixed;z-index:var(--z-member-sheet);left:0;right:0;bottom:0;max-height:85dvh;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;background:var(--white,#fff);color:var(--ink);border:1px solid var(--line);border-bottom:0;border-radius:22px 22px 0 0;padding:10px 16px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -12px 36px rgba(0,0,0,.22)}
 html.protlys-dark .member-profile-sheet{background:var(--card,#171D19)}
 html.member-sheet-open .floating-dot,html.member-sheet-open [data-floating-dot],html.member-sheet-open .fab{visibility:hidden!important}
 .member-sheet-handle{width:44px;height:5px;border-radius:99px;background:var(--line);margin:0 auto 14px;touch-action:none}
 .member-sheet-header{display:flex;align-items:center;justify-content:space-between;gap:12px}.member-sheet-person{display:flex;align-items:center;gap:11px;min-width:0}.member-sheet-person strong,.member-sheet-person span{display:block}.member-sheet-person strong{font-size:16px}.member-sheet-person span{font-size:11px;color:var(--ink-45);margin-top:3px}.member-sheet-close{width:44px;height:44px;flex:0 0 44px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--ink);display:grid;place-items:center;padding:0;font-size:24px;line-height:1}.member-sheet-week{font-size:12px;color:var(--ink-45);margin:18px 0 9px}
 .member-sheet-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}.member-sheet-tile{min-height:72px;border:1px solid var(--line);background:var(--card);border-radius:14px;padding:13px;box-sizing:border-box}.member-sheet-tile small{display:block;font-size:10px;color:var(--ink-45)}.member-sheet-tile strong{display:block;font-size:18px;margin-top:5px}.member-sheet-tile i{font-style:normal;font-size:10px;color:var(--ink-45)}.member-sheet-tile.skeleton{background:linear-gradient(90deg,var(--card),var(--green-soft),var(--card));background-size:200% 100%;animation:member-shimmer 1.1s infinite}
 .member-sheet-graph{margin-top:18px}.member-sheet-graph-title{font-size:12px;font-weight:800}.member-sheet-bars{height:116px;display:grid;grid-template-columns:repeat(7,1fr);gap:8px;align-items:end;margin-top:10px}.member-sheet-bar-col{height:100%;display:flex;flex-direction:column;align-items:center;gap:5px}.member-sheet-bar-track{height:92px;width:100%;display:flex;align-items:flex-end;justify-content:center;background:var(--green-soft);border-radius:8px;overflow:hidden}.member-sheet-bar-track i{display:block;width:100%;min-height:3px;background:var(--green-dark);border-radius:8px 8px 0 0}.member-sheet-bar-col span{font-size:9px;color:var(--ink-45)}
 .member-sheet-actions{display:flex;gap:8px;margin-top:18px}.member-sheet-action{min-height:44px;flex:1;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);display:grid;place-items:center;text-decoration:none;font-weight:800;font-size:12px}.member-sheet-action.primary{background:var(--green);color:#08110c;border-color:var(--green)}.member-sheet-error{padding:22px;border:1px solid var(--line);border-radius:14px;background:var(--card);font-size:13px}.member-sheet-error button{display:block;margin-top:10px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:inherit;padding:9px 14px}@keyframes member-shimmer{to{background-position:-200% 0}}
 `}</style></>,document.body);
}
