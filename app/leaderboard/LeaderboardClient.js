'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const PAGE_SIZE = 50;
const DAY_LABELS = ['T','F','S','S','M','T','W'];
const TZ = 'Africa/Nairobi';
const CSS = `
.leaderboard-screen{--lb-bg:var(--paper,#0D0F0E);--lb-card:var(--white,#151815);--lb-text:var(--ink,#F7F8F6);--lb-muted:var(--ink-45,rgba(128,128,128,.65));--lb-border:var(--line,rgba(128,128,128,.16));--lb-accent:var(--green,var(--lb-accent));--lb-accent-foreground:#fff;min-height:100dvh;padding:18px 16px 100px;background:var(--lb-bg);color:var(--lb-text);position:relative}
.lb-glow{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 0%,color-mix(in srgb,var(--lb-accent) 10%,transparent),transparent 38%)}
.lb-header,.lb-scope-wrap,.lb-card,.lb-podium,.lb-hall,.lb-notice{position:relative;z-index:1;max-width:720px;margin-left:auto;margin-right:auto}
.lb-header{display:flex;align-items:center;gap:12px;margin-bottom:10px}.lb-header h1{font-size:22px;margin:0;flex:1}.lb-header h1 span{display:block;font-size:12px;font-weight:500;opacity:.62;margin-top:3px}.lb-ending{font-size:11px;opacity:.65;margin-left:auto}.lb-period{display:flex;gap:6px;overflow:auto;margin:0 auto 14px;max-width:720px}.lb-period button{font-size:11px}.lb-view-switch{display:flex;justify-content:flex-end;margin:-4px auto 12px;max-width:720px}.lb-view-switch button{border:0;background:transparent;color:var(--lb-text);font-size:12px;opacity:.7}.lb-rival{font-size:10px;opacity:.6;grid-column:3/5;margin-top:-5px;padding-bottom:2px}.lb-improvement{font-size:10px;color:var(--lb-accent);margin-left:5px}.lb-icon-button,.lb-close{border:0;background:transparent;color:var(--lb-text);font-size:28px}.lb-podium{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:8px;align-items:end;margin-bottom:18px}.lb-slot,.lb-row,.lb-load-more{border:0;color:inherit;background:var(--lb-card);cursor:pointer}.lb-slot{border-radius:18px;padding:14px 7px;display:flex;flex-direction:column;align-items:center;gap:7px}.lb-slot.first{padding-top:20px}.lb-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;background:var(--lb-bg);border:1px solid var(--lb-border);display:grid;place-items:center;font-weight:700}.lb-avatar-large{width:64px;height:64px}.lb-initial{font-size:15px}.lb-slot strong{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lb-slot span{font-size:11px;opacity:.7}.lb-block{font-size:11px;opacity:.5}.lb-scope-wrap{margin-bottom:12px}.lb-scope-caption{font-size:12px;opacity:.62;margin-bottom:8px}.lb-scope{display:flex;gap:6px;overflow:auto}.lb-scope button,.lb-period button{border:1px solid var(--lb-border);background:transparent;color:inherit;border-radius:999px;padding:9px 13px;white-space:nowrap}.lb-scope button.active,.lb-period button.active{background:var(--lb-accent);color:#0D0F0E;border-color:var(--lb-accent)}.lb-card{border-radius:18px;overflow:hidden}.lb-row{width:100%;display:grid;grid-template-columns:34px 42px 1fr auto;align-items:center;gap:10px;padding:12px 14px;text-align:left;border-bottom:1px solid var(--lb-border)}.lb-row.me{outline:1px solid rgba(107,203,69,.45);outline-offset:-1px}.lb-rank{font-size:12px;opacity:.6}.lb-name{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lb-score{font-size:13px;text-align:right}.lb-score small{display:block;font-size:9px;opacity:.5}.lb-state,.lb-notice{padding:28px;text-align:center;opacity:.7}.lb-error{color:#ff8b8b}.lb-gap{text-align:center;padding:10px;opacity:.4}.lb-load-more{width:100%;padding:14px}.lb-you-pill{position:fixed;bottom:88px;left:50%;transform:translateX(-50%);z-index:5;border:1px solid var(--lb-accent);background:var(--lb-card);color:inherit;border-radius:999px;padding:10px 15px;display:flex;gap:12px}.lb-sheet-layer{position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.58);display:flex;align-items:flex-end}.lb-sheet{width:100%;max-height:88dvh;overflow:auto;background:var(--lb-bg);border-radius:24px 24px 0 0;padding:12px 16px 28px}.lb-sheet-handle{width:40px;height:4px;border-radius:99px;background:var(--lb-muted);margin:0 auto 16px}.lb-sheet-head{display:flex;justify-content:space-between;align-items:center}.lb-sheet-user{display:flex;align-items:center;gap:10px}.lb-sheet-user strong,.lb-sheet-user>div>span{display:block}.lb-sheet-user>div>span{font-size:11px;opacity:.62;margin-top:3px}.lb-last-badge{font-size:10px;margin-left:7px;color:var(--lb-accent)}.lb-days{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin:18px 0}.lb-days div{text-align:center;padding:8px 0;border-radius:10px;background:var(--lb-bg);font-size:11px}.lb-days div.on{background:var(--lb-accent);color:#0D0F0E}.lb-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}.lb-tiles>div{background:var(--lb-card);border-radius:14px;padding:13px}.lb-tiles small{display:block;opacity:.62;font-size:10px}.lb-tiles strong{display:block;font-size:18px;margin-top:4px}.lb-tiles i{font-style:normal;font-size:10px;opacity:.62;margin-left:3px}.lb-hall-title{padding:12px 0 8px}.lb-hall-title strong{display:block;font-size:20px}.lb-hall-title span{font-size:12px;opacity:.62}.lb-hall-week{background:var(--lb-card);border-radius:16px;overflow:hidden;margin-bottom:12px}.lb-hall-week-head{padding:12px 14px;font-size:12px;opacity:.62}.lb-hall-week .lb-row{background:transparent}.lb-sheet-loading{padding:30px;text-align:center;opacity:.6}
`;
.leaderboard-screen{transition:background-color .18s ease,color .18s ease}.leaderboard-screen .lb-row,.leaderboard-screen .lb-slot,.leaderboard-screen .lb-hall-week,.leaderboard-screen .lb-sheet{transition:background-color .18s ease,border-color .18s ease,color .18s ease}\nhtml.protlys-dark .leaderboard-screen{--lb-accent-foreground:#08110C}\n\nfunction countdownText(now = new Date()) {
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
  const [scope, setScope] = useState('world');
  const [groupId, setGroupId] = useState(null);
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
    const requestedScope = query.get('scope');
    setScope(requestedScope === 'city' || requestedScope === 'group' ? requestedScope : 'world');
    setGroupId(query.get('group') || null);
  }, []);

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
        supabase.rpc('get_leaderboard', { p_scope:scope, p_group_id:groupId, p_period:period, p_limit:PAGE_SIZE, p_offset:0 }),
        supabase.rpc('get_my_rank', { p_scope:scope, p_group_id:groupId, p_period:period })
      ]);
      if (cancelled) return;
      if (listError || rankError) {
        setError((listError || rankError)?.message || 'Could not load the leaderboard.');
        setLoading(false);
        return;
      }
      setRows(data || []);
      setMyRank(rank || null);
      if (scope === 'city' && !data?.length && !rank) setCityMissing(true);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [scope, groupId, period, view]);

  const viewer = useMemo(() => rows.find(row => row.user_id === viewerId) || null, [rows, viewerId]);
  useEffect(() => { const t=window.setInterval(()=>setEnding(countdownText()),1000); return()=>window.clearInterval(t); }, []);

  useEffect(() => { if(view!=='hall') return; let cancelled=false; (async()=>{ setHallLoading(true); const {data,error:e}=await createClient().rpc('get_hall_of_fame',{p_scope:scope,p_group_id:groupId,p_limit:12}); if(cancelled)return; if(e)setError(e.message||'Could not load Hall of Fame.'); else setHall(data||[]); setHallLoading(false); })(); return()=>{cancelled=true}; }, [scope,groupId,view]);

  const top = rows.slice(0, 3);
  const outsidePage = Number(myRank || 0) > PAGE_SIZE && !viewer;

  async function loadMore() {
    if (loadingMore || rows.length < PAGE_SIZE) return;
    setLoadingMore(true);
    const supabase = createClient();
    const { data, error: moreError } = await supabase.rpc('get_leaderboard', {
      p_scope:scope, p_group_id:groupId, p_period:period, p_limit:PAGE_SIZE, p_offset:rows.length
    });
    if (moreError) setError(moreError.message || 'Could not load more members.');
    else setRows(prev => [...prev, ...(data || [])]);
    setLoadingMore(false);
  }

  async function openMember(row) {
    if (!row?.user_id) return;
    const key = [scope, groupId || '', row.user_id].join(':');
    setSelected({ row, loading:true, stats:null, key });
    if (statsCache[key]) {
      setSelected({ row, loading:false, stats:statsCache[key], key });
      return;
    }
    const supabase = createClient();
    const { data, error: statsError } = await supabase.rpc('get_member_stats', {
      p_user_id:row.user_id, p_scope:scope, p_group_id:groupId
    });
    if (statsError) {
      setSelected({ row, loading:false, stats:null, key, error:statsError.message || 'Could not load activity.' });
      return;
    }
    setStatsCache(prev => ({ ...prev, [key]:data?.[0] || null }));
    setSelected({ row, loading:false, stats:data?.[0] || null, key });
  }

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
      <header className="lb-header">
        <button type="button" className="lb-icon-button" onClick={() => router.back()} aria-label="Go back">‹</button>
        <h1>Leaderboard<span>Weekly steps · {monthLabel()}</span></h1>
        <span className="lb-ending">{ending}</span>
      </header>

      <div className="lb-view-switch"><button type="button" onClick={() => setView(view === 'hall' ? 'leaderboard' : 'hall')}>{view === 'hall' ? '← Leaderboard' : 'Hall of Fame →'}</button></div>
      {view === 'hall' ? <HallOfFame rows={hall} loading={hallLoading} error={error} onOpen={openMember} /> : (loading ? <div className="lb-state">Loading leaderboard…</div> : error ? <div className="lb-state lb-error">{error}</div> : (
        <>
          <div className="lb-period" role="tablist" aria-label="Leaderboard period">{[['this_week','This week'],['last_week','Last week'],['most_improved','Most improved']].map(([value,label]) => <button key={value} type="button" className={period===value?'active':''} onClick={() => setPeriod(value)}>{label}</button>)}</div>
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

          <div className="lb-scope-wrap"><div className="lb-scope-caption">{scope === 'world' ? 'Everyone' : scope === 'city' ? 'People in your city' : 'Members of your group'}</div>
            <div className="lb-scope" role="tablist" aria-label="Leaderboard scope">
              {['world','city','group'].map(item => (
                <button key={item} type="button" className={scope === item ? 'active' : ''} onClick={() => selectScope(item)}>
                  {item === 'world' ? 'World' : item === 'city' ? 'My City' : 'My Group'}
                </button>
              ))}
            </div>
          </div>

          {cityMissing && <div className="lb-notice">Add your city to your profile to see your City leaderboard.</div>}
          {scope === 'group' && !groupId && <div className="lb-notice">Open Leaderboard from a group to see its members.</div>}

          <section className="lb-card" ref={listRef} aria-label="Ranked members">
            {rows.length === 0 && !cityMissing && <div className="lb-state">No leaderboard members yet.</div>}
            {rows.map((row, index) => (
              <button type="button" key={row.user_id} id={row.user_id === viewerId ? 'leaderboard-me' : undefined} className={'lb-row ' + (row.user_id === viewerId ? 'me' : '')} onClick={() => openMember(row)}>
                <span className="lb-rank">{row.rank}</span>
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
      {selected && <MemberSheet selected={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function OutsideViewer({viewerId,scope,groupId,period,myRank,onOpen}) {
  const [row,setRow]=useState(null);
  useEffect(()=>{let cancelled=false;createClient().rpc('get_leaderboard',{p_scope:scope,p_group_id:groupId,p_period:period,p_limit:1,p_offset:Math.max(Number(myRank||1)-1,0)}).then(({data})=>{if(!cancelled)setRow(data?.[0]||null)});return()=>{cancelled=true}},[viewerId,scope,groupId,period,myRank]);
  if(!row)return <div className="lb-row me"><span className="lb-rank">{myRank}</span><div className="lb-avatar lb-initial">Y</div><span className="lb-name">You</span><strong className="lb-score">—</strong></div>;
  return <button type="button" id="leaderboard-me" className="lb-row me" onClick={()=>onOpen(row)}><span className="lb-rank">{row.rank}</span><Avatar user={row}/><span className="lb-name">{row.user_id===viewerId?'You':row.username}</span><strong className="lb-score">{period==='most_improved'?(row.improvement??0)+'%':fmt(row.steps)}<small>{period==='most_improved'?'gain':'steps'}</small></strong>{row.user_id===viewerId&&row.steps_to_pass&&row.rival_username?<span className="lb-rival">{fmt(row.steps_to_pass)} steps to pass {row.rival_username}</span>:null}</button>;
}function MemberSheet({selected,onClose}) {
  const {row,stats,loading,error}=selected; const activity=stats?.recent_activity||[]; const lastRank=Number(stats?.last_week_rank||0);
  return <div className="lb-sheet-layer" onClick={onClose}><section className="lb-sheet" role="dialog" aria-modal="true" aria-label={row.username} onClick={e=>e.stopPropagation()}>
    <div className="lb-sheet-handle"/>
    <div className="lb-sheet-head"><div className="lb-sheet-user"><Avatar user={row}/><div><strong>{row.username}{lastRank>0&&lastRank<=3?<span className="lb-last-badge">#{lastRank} last week</span>:null}</strong><span>Rank #{stats?.rank||row.rank}</span></div></div><button type="button" className="lb-close" onClick={onClose} aria-label="Close">×</button></div>
    <div className="lb-sheet-label">This week</div>
    {loading?<div className="lb-sheet-loading">Loading activity…</div>:error?<div className="lb-sheet-loading">{error}</div>:
      <><div className="lb-days">{(activity.length?activity:DAY_LABELS.map((_,i)=>({day:String(i),steps:0}))).map((d,i)=><div key={d.day} className={Number(d.steps)>0?'on':''}>{DAY_LABELS[i]}</div>)}</div>
      <div className="lb-tiles">
        <div><small>Steps today</small><strong>{fmt(stats?.steps_today)}</strong></div>
        <div><small>Estimated distance</small><strong>{Number(stats?.estimated_distance_km||0).toFixed(1)}<i>km</i></strong></div>
        <div><small>Weekly wins</small><strong>{fmt(stats?.weekly_wins)}</strong></div>
        <div><small>Best week</small><strong>{fmt(stats?.best_week)}<i>steps</i></strong></div>
        <div><small>Top-10 finishes</small><strong>{fmt(stats?.top_10_finishes)}</strong></div>
        <div><small>Climb vs last week</small><strong>{stats?.climb_vs_last_week==null?'—':stats.climb_vs_last_week>0?`↑ ${stats.climb_vs_last_week}`:stats.climb_vs_last_week<0?`↓ ${Math.abs(stats.climb_vs_last_week)}`:'—'}</strong></div>
      </div></>}
  </section></div>;
}

function HallOfFame({rows,loading,error,onOpen}) {
  if(loading)return <div className="lb-state">Loading Hall of Fame…</div>; if(error)return <div className="lb-state lb-error">{error}</div>;
  const weeks=[]; rows.forEach(row=>{let w=weeks.find(x=>x.week_start===row.week_start);if(!w){w={week_start:row.week_start,rows:[]};weeks.push(w)}w.rows.push(row)});
  return <section className="lb-hall" aria-label="Hall of Fame"><div className="lb-hall-title"><strong>Hall of Fame</strong><span>Past weekly winners and top 3</span></div>
    {!weeks.length?<div className="lb-state">No finished weeks yet.</div>:weeks.map(w=><div className="lb-hall-week" key={w.week_start}><div className="lb-hall-week-head">Week of {dateLabel(w.week_start)}</div>
      {w.rows.map(row=><button type="button" className="lb-row" key={w.week_start+'-'+row.rank+'-'+row.user_id} onClick={()=>onOpen(row)}><span className="lb-rank">#{row.rank}</span><Avatar user={row}/><span className="lb-name">{row.username}</span><strong className="lb-score">{fmt(row.steps)}<small>steps</small></strong></button>)}
    </div>)}
  </section>;
}


