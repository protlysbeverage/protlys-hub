'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isoWeekStart, summarizeMemberWeek, weekContextLabel } from '@/lib/leaderboard-week';

const PAGE_SIZE = 50;
const DAY_LABELS = ['T','F','S','S','M','T','W'];
const TZ = 'Africa/Nairobi';
const SHOW_LEADERBOARD_SCOPES = false;
const CSS = `
.leaderboard-screen{--lb-bg:var(--paper);--lb-card:var(--white);--lb-text:var(--ink);--lb-muted:var(--ink-45);--lb-border:var(--line);--lb-accent:var(--green);--lb-accent-foreground:#fff;min-height:100dvh;padding:18px 16px 100px;background:var(--lb-bg);color:var(--lb-text);position:relative}
.lb-glow{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 0%,color-mix(in srgb,var(--lb-accent) 10%,transparent),transparent 38%)}
.lb-header,.lb-scope-wrap,.lb-card,.lb-podium,.lb-hall,.lb-notice{position:relative;z-index:1;max-width:720px;margin-left:auto;margin-right:auto}
.lb-group-context{max-width:720px;margin:0 auto 10px;display:flex;align-items:center;gap:10px}.lb-group-context button{width:44px;height:44px;border:0;border-radius:50%;background:var(--lb-card);color:var(--lb-text);font-size:23px}.lb-group-context strong{display:block;font-size:15px}.lb-group-context span{display:block;font-size:10.5px;color:var(--lb-muted);margin-top:2px}.lb-header{display:flex;align-items:center;gap:12px;margin-bottom:10px}.lb-header h1{font-size:22px;margin:0;flex:1}.lb-header h1 span{display:block;font-size:12px;font-weight:500;opacity:.55;margin-top:3px}.lb-ending{font-size:11px;opacity:.65;margin-left:auto}.lb-period{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) 44px;gap:6px;margin:0 auto 10px;max-width:720px}.lb-period button{font-size:11px;min-height:44px}.lb-period .lb-trophy{width:44px;padding:0;border-radius:50%}.lb-meta{max-width:720px;margin:0 auto 14px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--lb-muted)}.lb-meta .lb-ending{border:1px solid var(--lb-border);border-radius:999px;padding:6px 9px;background:var(--lb-card)}.lb-view-switch{display:flex;justify-content:flex-end;margin:-4px auto 12px;max-width:720px}.lb-view-switch button{border:0;background:transparent;color:var(--lb-text);font-size:12px;opacity:.7}.lb-rival{font-size:10px;opacity:.6;grid-column:3/5;margin-top:-5px;padding-bottom:2px}.lb-improvement{font-size:10px;color:var(--lb-accent);margin-left:5px}.lb-icon-button,.lb-close,.lb-hall-back{width:44px;height:44px;border:1px solid var(--lb-border);border-radius:50%;background:var(--lb-card);color:var(--lb-text);display:grid;place-items:center;font-size:24px;padding:0;flex:0 0 44px}.lb-close{font-size:25px}.lb-hall-header{display:flex;align-items:center;gap:11px;padding:8px 0 12px}.lb-hall-header strong{display:block;font-size:20px}.lb-hall-header span{display:block;font-size:12px;opacity:.55;margin-top:2px}.lb-podium{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:8px;align-items:end;margin-bottom:18px}.lb-slot,.lb-row,.lb-load-more{border:0;color:inherit;background:var(--lb-card);cursor:pointer}.lb-slot{border-radius:18px;padding:14px 7px;display:flex;flex-direction:column;align-items:center;gap:7px}.lb-slot.first{padding-top:20px}.lb-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;background:var(--lb-bg);border:1px solid var(--lb-border);display:grid;place-items:center;font-weight:700}.lb-avatar-large{width:64px;height:64px}.lb-initial{font-size:15px}.lb-slot strong{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lb-slot span{font-size:11px;opacity:.7}.lb-block{font-size:11px;opacity:.5}.lb-scope-wrap{margin-bottom:12px}.lb-scope-caption{font-size:12px;opacity:.55;margin-bottom:8px}.lb-scope{display:flex;gap:6px;overflow:auto}.lb-scope button,.lb-period button{border:1px solid var(--lb-border);background:transparent;color:inherit;border-radius:999px;padding:9px 13px;white-space:nowrap}.lb-scope button.active,.lb-period button.active{background:var(--lb-accent);color:var(--lb-accent-foreground);border-color:var(--lb-accent)}.lb-card{border-radius:18px;overflow:hidden}.lb-row{width:100%;display:grid;grid-template-columns:34px 42px 1fr auto;align-items:center;gap:10px;padding:12px 14px;text-align:left;border-bottom:1px solid var(--lb-border)}.lb-row.me{outline:1px solid color-mix(in srgb,var(--lb-accent) 45%,transparent);outline-offset:-1px}.lb-rank{font-size:12px;opacity:.6}.lb-name{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lb-score{font-size:13px;text-align:right}.lb-score small{display:block;font-size:9px;opacity:.5}.lb-state,.lb-notice{padding:28px;text-align:center;opacity:.7}.lb-error{color:#ff8b8b}.lb-gap{text-align:center;padding:10px;opacity:.4}.lb-load-more{width:100%;padding:14px}.lb-you-pill{position:fixed;bottom:88px;left:50%;transform:translateX(-50%);z-index:5;border:1px solid var(--lb-accent);background:var(--lb-card);color:inherit;border-radius:999px;padding:10px 15px;display:flex;gap:12px}.lb-sheet-layer{position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.58);display:flex;align-items:flex-end}.lb-sheet{width:100%;max-height:88dvh;overflow:auto;background:var(--lb-bg);border-radius:24px 24px 0 0;padding:12px 16px 28px}.lb-sheet-handle{width:40px;height:4px;border-radius:99px;background:var(--lb-muted);margin:0 auto 16px}.lb-sheet-head{display:flex;justify-content:space-between;align-items:center}.lb-sheet-user{display:flex;align-items:center;gap:10px}.lb-sheet-user strong,.lb-sheet-user>div>span{display:block}.lb-sheet-user>div>span{font-size:11px;opacity:.55;margin-top:3px}.lb-last-badge{font-size:10px;margin-left:7px;color:var(--lb-accent)}.lb-days{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin:18px 0}.lb-days div{text-align:center;padding:8px 0;border-radius:10px;background:var(--lb-bg);font-size:11px}.lb-days div.on{background:var(--lb-accent);color:var(--lb-accent-foreground)}.lb-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}.lb-tiles>div{background:var(--lb-card);border-radius:14px;padding:13px}.lb-tiles small{display:block;opacity:.55;font-size:10px}.lb-tiles strong{display:block;font-size:18px;margin-top:4px}.lb-tiles i{font-style:normal;font-size:10px;opacity:.55;margin-left:3px}.lb-hall-title{padding:12px 0 8px}.lb-hall-title strong{display:block;font-size:20px}.lb-hall-title span{font-size:12px;opacity:.55}.lb-hall-week{background:var(--lb-card);border-radius:16px;overflow:hidden;margin-bottom:12px}.lb-hall-week-head{padding:12px 14px;font-size:12px;opacity:.55}.lb-hall-week .lb-row{background:transparent}.lb-sheet-loading{padding:30px;text-align:center;opacity:.6}.lb-tile-skeleton{min-height:66px;position:relative;overflow:hidden}.lb-tile-skeleton:after{content:'';position:absolute;inset:12px;border-radius:8px;background:color-mix(in srgb,var(--lb-muted) 16%,transparent)}.lb-retry{border:1px solid var(--lb-border);border-radius:999px;background:var(--lb-card);color:inherit;padding:9px 14px;margin-top:10px}
.leaderboard-screen{transition:background-color .18s ease,color .18s ease}.leaderboard-screen .lb-row,.leaderboard-screen .lb-slot,.leaderboard-screen .lb-hall-week,.leaderboard-screen .lb-sheet{transition:background-color .18s ease,border-color .18s ease,color .18s ease}
html.protlys-dark .leaderboard-screen{--lb-accent-foreground:#08110C}
`;
function countdownText(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=t=>Number(parts.find(p=>p.type===t)?.value||0);
  const y=get('year'),m=get('month'),d=get('day'),h=get('hour'),mi=get('minute'),s=get('second');
  const localMs=Date.UTC(y,m-1,d,h-3,mi,s); const day=new Date(localMs).getUTCDay();
  let days=(8-day)%7; if(!days&&(h||mi||s))days=7;
  const target=Date.UTC(y,m-1,d+days,21,0,0); const mins=Math.max(0,Math.floor((target-localMs)/60000));
  const dd=Math.floor(mins/1440),hh=Math.floor((mins%1440)/60),mm=mins%60;
  return dd ? `Ends in ${dd}d ${hh}h` : hh ? `Ends in ${hh}h ${mm}m` : `Ends in ${mm}m`;
}


function dateLabel(value) { return new Intl.DateTimeFormat('en-GB',{timeZone:TZ,day:'numeric',month:'short',year:'numeric'}).format(new Date(String(value)+'T12:00:00')); }
function monthLabel() {
  return new Intl.DateTimeFormat('en-GB', { timeZone:'Africa/Nairobi', month:'long', year:'numeric' }).format(new Date());
}
function initials(name) {
  return String(name || 'M').trim().slice(0, 1).toUpperCase();
}
function fmt(value) { return Number(value || 0).toLocaleString('en-US'); }

function Avatar({ user, large=false }) {
  const size = large ? 76 : 42;
  return user?.avatar_url
    ? <img className={large ? 'lb-avatar lb-avatar-large' : 'lb-avatar'} src={user.avatar_url} alt="" width={size} height={size} />
    : <div className={large ? 'lb-avatar lb-avatar-large lb-initial' : 'lb-avatar lb-initial'} aria-hidden="true">{initials(user?.username)}</div>;
}

export default function LeaderboardClient({ viewerId }) {
  const router = useRouter();
  const [scope] = useState('group');
  const [groupId, setGroupId] = useState(null);
  const [groupName,setGroupName]=useState('Group leaderboard');
  const [rows, setRows] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [statsCache, setStatsCache] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [cityMissing, setCityMissing] = useState(false);
  const [period, setPeriod] = useState('this_week');
  const [view, setView] = useState('leaderboard');
  const [hall, setHall] = useState([]);
  const [hallLoading, setHallLoading] = useState(false);
  const [ending, setEnding] = useState(() => countdownText());
  const listRef = useRef(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const id=query.get('group') || null; setGroupId(id); const initialPeriod=query.get('period'); if(['this_week','last_week','most_improved'].includes(initialPeriod))setPeriod(initialPeriod); if(window.location.hash==='#hall-of-fame')setView('hall');
    if(id){createClient().from('groups').select('name').eq('id',id).maybeSingle().then(({data})=>{if(data?.name)setGroupName(data.name)})}
  }, []);

  useEffect(() => {
    const syncView=()=>setView(window.location.hash==='#hall-of-fame'?'hall':'leaderboard');
    window.addEventListener('popstate',syncView); window.addEventListener('hashchange',syncView);
    return()=>{window.removeEventListener('popstate',syncView);window.removeEventListener('hashchange',syncView)};
  },[]);
  function showHall(){if(window.location.hash!=='#hall-of-fame')window.history.pushState({protlysView:'hall'},'',window.location.pathname+window.location.search+'#hall-of-fame');setView('hall');}
  function showLeaderboard({back=false}={}){if(back&&window.location.hash==='#hall-of-fame'){window.history.back();return;}if(window.location.hash==='#hall-of-fame')window.history.replaceState({},'',window.location.pathname+window.location.search);setView('leaderboard');}
  function choosePeriod(value){setPeriod(value);showLeaderboard();const q=new URLSearchParams(window.location.search);q.set('period',value);window.history.replaceState({},'',window.location.pathname+'?'+q.toString());}

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (view === 'hall') return;
      setLoading(true);
      setLoadingMore(false);
      setError('');
      setRows([]);
      setMyRank(null);
      setCityMissing(false);
      const supabase = createClient();
      const [{ data, error: listError }, { data: rank, error: rankError }] = await Promise.all([
        supabase.rpc('get_group_leaderboard', { p_group_id:groupId, p_period:period, p_limit:PAGE_SIZE, p_offset:0 }),
        supabase.rpc('get_group_leaderboard', { p_group_id:groupId, p_period:period, p_limit:1000, p_offset:0 })
      ]);
      if (cancelled) return;
      if (listError || rankError) {
        setError((listError || rankError)?.message || 'Could not load the leaderboard.');
        setLoading(false);
        return;
      }
      setRows(data || []);
      setMyRank((rank || []).find(r => r.user_id === viewerId)?.rank || null);
      if (scope === 'city' && !data?.length && !rank) setCityMissing(true);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [scope, groupId, period, view]);

  const viewer = useMemo(() => rows.find(row => row.user_id === viewerId) || null, [rows, viewerId]);
  useEffect(() => { const t=window.setInterval(()=>setEnding(countdownText()),60000); return()=>window.clearInterval(t); }, []);

  useEffect(() => { if(view!=='hall') return; let cancelled=false; (async()=>{ setHallLoading(true); const {data,error:e}=await createClient().rpc('get_hall_of_fame',{p_scope:scope,p_group_id:groupId,p_limit:12}); if(cancelled)return; if(e)setError(e.message||'Could not load Hall of Fame.'); else setHall(data||[]); setHallLoading(false); })(); return()=>{cancelled=true}; }, [scope,groupId,view]);

  const rankedRows = useMemo(() => rows.map((row,index)=>({...row,rank:index+1})), [rows]);
  const top = rankedRows.slice(0, 3);
  const outsidePage = Number(myRank || 0) > PAGE_SIZE && !viewer;

  async function loadMore() {
    if (loadingMore || rows.length < PAGE_SIZE) return;
    setLoadingMore(true);
    const supabase = createClient();
    const { data, error: moreError } = await supabase.rpc('get_group_leaderboard', {
      p_group_id:groupId, p_period:period, p_limit:PAGE_SIZE, p_offset:rows.length
    });
    if (moreError) setError(moreError.message || 'Could not load more members.');
    else setRows(prev => [...prev, ...(data || [])]);
    setLoadingMore(false);
  }

  function weekStartFor(explicitWeekStart){if(explicitWeekStart)return explicitWeekStart;const current=isoWeekStart(new Date(),TZ);if(period==='last_week'){const d=new Date(current+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-7);return d.toISOString().slice(0,10);}return current;}
  async function openMember(row, explicitWeekStart) {
    if(!row?.user_id)return; const weekStart=weekStartFor(explicitWeekStart); const key=[scope,groupId||'',row.user_id,weekStart].join(':');
    setSelected({row,weekStart,loading:true,stats:null,key}); if(statsCache[key]){setSelected({row,weekStart,loading:false,stats:statsCache[key],key});return;}
    const {data,error:statsError}=await createClient().rpc('get_member_week_stats',{p_user_id:row.user_id,p_group_id:groupId,p_week_start:weekStart});
    if(statsError){setSelected({row,weekStart,loading:false,stats:null,key,error:statsError.message||'Could not load activity.'});return;}
    setStatsCache(prev=>({...prev,[key]:data||null}));setSelected({row,weekStart,loading:false,stats:data||null,key});
  }
  function retryMember(value){openMember(value.row,value.weekStart);}

  function selectScope(next) {
    const q = new URLSearchParams();
    q.set('scope', next);
    if (next === 'group' && groupId) q.set('group', groupId);
    router.replace('/leaderboard?' + q.toString(), { scroll:false });
  }

  function scrollToMe() {
    const node = document.getElementById('leaderboard-me');
    if (node) node.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  return (
    <div className="leaderboard-screen">
      <style>{CSS}</style>
      <div className="lb-glow" aria-hidden="true" />
      <div className="lb-group-context"><button type="button" aria-label="Back to group chat" onClick={()=>router.back()}>‹</button><div><strong>{groupName}</strong><span>{rows.length ? `${rows.length}${rows.length===PAGE_SIZE?'+' : ''} members ranked` : 'Group members'}</span></div></div>
      <div className="lb-period" role="tablist" aria-label="Leaderboard period">{[['this_week','This week'],['last_week','Last week'],['most_improved','Improved']].map(([value,label]) => <button key={value} type="button" className={period===value?'active':''} onClick={() => choosePeriod(value)}>{label}</button>)}<button type="button" className="lb-trophy" aria-label="Open Hall of Fame" onClick={showHall}>🏆</button></div>
      <div className="lb-meta"><span>Weekly steps · {monthLabel()}</span><span className="lb-ending">{ending}</span></div>
      {view === 'hall' ? <HallOfFame rows={hall} loading={hallLoading} error={error} onOpen={openMember} onBack={()=>showLeaderboard({back:true})} /> : (loading ? <div className="lb-state">Loading leaderboard…</div> : error ? <div className="lb-state lb-error">{error}</div> : (
        <>

          <section className="lb-podium" aria-label="Top three">
            {[1,0,2].map((index) => {
              const row = top[index];
              return (
                <button type="button" key={index} className={'lb-slot ' + (index === 0 ? 'first' : index === 1 ? 'second' : 'third')} disabled={!row} onClick={() => openMember(row)}>
                  {row ? <Avatar user={row} large={index === 0} /> : <div className="lb-avatar lb-avatar-large lb-empty">—</div>}
                  <strong>{row?.username || '—'}</strong>
                  <span>{row ? fmt(row.steps) : '—'}</span>
                  <div className="lb-block">{index + 1}</div>
                </button>
              );
            })}
          </section>

          {SHOW_LEADERBOARD_SCOPES && <div className="lb-scope-wrap"><div className="lb-scope-caption">{scope === 'world' ? 'Everyone' : scope === 'city' ? 'People in your city' : 'Members of your group'}</div>
            <div className="lb-scope" role="tablist" aria-label="Leaderboard scope">
              {['world','city','group'].map(item => (
                <button key={item} type="button" className={scope === item ? 'active' : ''} onClick={() => selectScope(item)}>
                  {item === 'world' ? 'World' : item === 'city' ? 'My City' : 'My Group'}
                </button>
              ))}
            </div>
          </div>}

          {SHOW_LEADERBOARD_SCOPES && cityMissing && <div className="lb-notice">Add your city to your profile to see your City leaderboard.</div>}
          {SHOW_LEADERBOARD_SCOPES && scope === 'group' && !groupId && <div className="lb-notice">Open Leaderboard from a group to see its members.</div>}

          <section className="lb-card" ref={listRef} aria-label="Ranked members">
            {rows.length === 0 && !cityMissing && <div className="lb-state">No leaderboard members yet.</div>}
            {rankedRows.map((row, index) => (
              <button type="button" key={row.user_id} id={row.user_id === viewerId ? 'leaderboard-me' : undefined} className={'lb-row ' + (row.user_id === viewerId ? 'me' : '')} onClick={() => openMember(row)}>
                <span className="lb-rank" style={{opacity:Number(row.steps||0)===0?.32:undefined}}>{row.rank}</span>
                <Avatar user={row} />
                <span className="lb-name">{row.username}{period==='most_improved' && row.improvement != null ? <span className="lb-improvement">+{row.improvement}%</span> : null}</span>
                <strong className="lb-score">{period==='most_improved' && row.improvement != null ? row.improvement+'%' : fmt(row.steps)}<small>{period==='most_improved'?'gain':'steps'}</small></strong>
                {row.user_id === viewerId && row.steps_to_pass && row.rival_username ? <span className="lb-rival">{fmt(row.steps_to_pass)} steps to pass {row.rival_username}</span> : null}
              </button>
            ))}
            {outsidePage && (
              <>
                <div className="lb-gap">···</div>
                <OutsideViewer viewerId={viewerId} scope={scope} groupId={groupId} period={period} myRank={myRank} onOpen={openMember} />
              </>
            )}
            {rows.length >= PAGE_SIZE && !outsidePage && <button type="button" className="lb-load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>}
          </section>
        </>
      ))}

      {myRank && <button type="button" className="lb-you-pill" onClick={scrollToMe}><span>You</span><em>#{myRank}</em><span>↓</span></button>}
      {selected && <MemberSheet selected={selected} onClose={() => setSelected(null)} onRetry={()=>retryMember(selected)} />}
    </div>
  );
}

function OutsideViewer({viewerId,scope,groupId,period,myRank,onOpen}) {
  const [row,setRow]=useState(null);
  useEffect(()=>{let cancelled=false;createClient().rpc('get_group_leaderboard',{p_group_id:groupId,p_period:period,p_limit:1,p_offset:Math.max(Number(myRank||1)-1,0)}).then(({data})=>{if(!cancelled)setRow(data?.[0]||null)});return()=>{cancelled=true}},[viewerId,scope,groupId,period,myRank]);
  if(!row)return <div className="lb-row me"><span className="lb-rank">{myRank}</span><div className="lb-avatar lb-initial">Y</div><span className="lb-name">You</span><strong className="lb-score">—</strong></div>;
  return <button type="button" id="leaderboard-me" className="lb-row me" onClick={()=>onOpen(row)}><span className="lb-rank">{row.rank}</span><Avatar user={row}/><span className="lb-name">{row.user_id===viewerId?'You':row.username}</span><strong className="lb-score">{period==='most_improved'?(row.improvement??0)+'%':fmt(row.steps)}<small>{period==='most_improved'?'gain':'steps'}</small></strong>{row.user_id===viewerId&&row.steps_to_pass&&row.rival_username?<span className="lb-rival">{fmt(row.steps_to_pass)} steps to pass {row.rival_username}</span>:null}</button>;
}function localTodayKey(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value;return `${g('year')}-${g('month')}-${g('day')}`;}
function MemberSheet({selected,onClose,onRetry}){const {row,stats,loading,error,weekStart}=selected;const visible=stats?.steps_visible!==false;const currentWeek=isoWeekStart(new Date(),TZ);const summary=visible&&stats?.days?summarizeMemberWeek(stats.days,weekStart,localTodayKey()):null;const bestWeekday=summary?.bestDay?new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'UTC'}).format(new Date(summary.bestDay.date+'T12:00:00Z')):'';return <div className="lb-sheet-layer" onClick={onClose}><section className="lb-sheet" role="dialog" aria-modal="true" aria-label={row.username} onClick={e=>e.stopPropagation()}><div className="lb-sheet-handle"/><div className="lb-sheet-head"><div className="lb-sheet-user"><Avatar user={row}/><div><strong>{row.username}</strong><span>{weekContextLabel(weekStart,currentWeek)}</span></div></div><button type="button" className="lb-close" onClick={onClose} aria-label="Close">×</button></div><div className="lb-sheet-label">{weekContextLabel(weekStart,currentWeek)}</div>{loading?<><div className="lb-days">{DAY_LABELS.map((d,i)=><div key={i}>{d}</div>)}</div><div className="lb-tiles">{Array.from({length:4},(_,i)=><div className="lb-tile-skeleton" key={i}/>)}</div></>:error?<div className="lb-sheet-loading"><div>Could not load this week&apos;s activity.</div><button className="lb-retry" type="button" onClick={onRetry}>Retry</button></div>:!visible?<div className="lb-sheet-loading">This member keeps their movement private.</div>:<><div className="lb-days">{summary.days.map((d,i)=><div key={d.date} className={d.steps>0?'on':''}>{DAY_LABELS[i]}</div>)}</div><div className="lb-tiles"><div><small>Weekly steps</small><strong>{fmt(summary.weeklySteps)}</strong></div>{summary.isCurrentWeek?<div><small>Steps today</small><strong>{fmt(summary.stepsToday)}</strong></div>:<div><small>Best day</small><strong>{fmt(summary.bestDay?.steps)}<i>{bestWeekday}</i></strong></div>}<div><small>Estimated distance</small><strong>{summary.distanceKm.toFixed(1)}<i>km</i></strong></div><div><small>Movement days</small><strong>{summary.movementDays}/7</strong></div></div></>}</section></div>;}

function HallOfFame({rows,loading,error,onOpen,onBack}) {
  if(loading)return <div className="lb-state">Loading Hall of Fame…</div>; if(error)return <div className="lb-state lb-error">{error}</div>;
  const weeks=[]; rows.forEach(row=>{let w=weeks.find(x=>x.week_start===row.week_start);if(!w){w={week_start:row.week_start,rows:[]};weeks.push(w)}w.rows.push(row)});
  return <section className="lb-hall" aria-label="Hall of Fame"><div className="lb-hall-header"><button type="button" className="lb-hall-back" aria-label="Back to leaderboard" onClick={onBack}>‹</button><div><strong>Hall of Fame</strong><span>Past weekly winners and top 3</span></div></div>
    {!weeks.length?<div className="lb-state">No finished weeks yet.</div>:weeks.map(w=><div className="lb-hall-week" key={w.week_start}><div className="lb-hall-week-head">Week of {dateLabel(w.week_start)}</div>
      {w.rows.map(row=><button type="button" className="lb-row" key={w.week_start+'-'+row.rank+'-'+row.user_id} onClick={()=>onOpen(row,w.week_start)}><span className="lb-rank">#{row.rank}</span><Avatar user={row}/><span className="lb-name">{row.username}</span><strong className="lb-score">{fmt(row.steps)}<small>steps</small></strong></button>)}
    </div>)}
  </section>;
}


