'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const PAGE_SIZE = 50;
const DAY_LABELS = ['T','F','S','S','M','T','W'];
const TZ = 'Africa/Nairobi';
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
      p_scope:scope, p_group_id:groupId, p_limit:PAGE_SIZE, p_offset:rows.length
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
        <h1>Leaderboard<span>Steps · {monthLabel()}</span></h1>
        <span className="lb-header-spacer" aria-hidden="true" />
      </header>

      {loading ? <div className="lb-state">Loading leaderboard…</div> : error ? <div className="lb-state lb-error">{error}</div> : (
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

          <div className="lb-scope-wrap"><div className="lb-scope-caption">{scope === 'kenya' ? 'Everyone in Kenya' : scope === 'city' ? 'People in your city' : 'Members of your group'}</div>
            <div className="lb-scope" role="tablist" aria-label="Leaderboard scope">
              {['kenya','city','group'].map(item => (
                <button key={item} type="button" className={scope === item ? 'active' : ''} onClick={() => selectScope(item)}>
                  {item === 'kenya' ? 'Kenya' : item === 'city' ? 'My City' : 'My Group'}
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
                <span className="lb-name">{row.username}</span>
                <strong className="lb-score">{fmt(row.steps)}<small>steps</small></strong>
              </button>
            ))}
            {outsidePage && (
              <>
                <div className="lb-gap">···</div>
                <OutsideViewer viewerId={viewerId} scope={scope} groupId={groupId} myRank={myRank} onOpen={openMember} />
              </>
            )}
            {rows.length >= PAGE_SIZE && !outsidePage && <button type="button" className="lb-load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>}
          </section>
        </>
      )}

      {myRank && <button type="button" className="lb-you-pill" onClick={scrollToMe}><span>You</span><em>#{myRank}</em><span>↓</span></button>}
      {selected && <MemberSheet selected={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function OutsideViewer({viewerId,scope,groupId,period,myRank,onOpen}) {
  const [row,setRow]=useState(null);
  useEffect(()=>{let cancelled=false;createClient().rpc('get_leaderboard',{p_scope:scope,p_group_id:groupId,p_period:period,p_limit:1,p_offset:Math.max(Number(myRank||1)-1,0)}).then(({data})=>{if(!cancelled)setRow(data?.[0]||null)});return()=>{cancelled=true}},[viewerId,scope,groupId,period,myRank]);
  if(!row)return <div className="lb-row me"><span className="lb-rank">{myRank}</span><div className="lb-avatar lb-initial">Y</div><span className="lb-name">You</span><strong className="lb-score">—</strong></div>;
  return <button type="button" id="leaderboard-me" className="lb-row me" onClick={()=>onOpen(row)}><span className="lb-rank">{row.rank}</span><Avatar user={row}/><span className="lb-name">{row.user_id===viewerId?'You':row.username}</span><strong className="lb-score">{period==='most_improved'?`${row.improvement??0}%`:fmt(row.steps)}</strong></button>;
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


