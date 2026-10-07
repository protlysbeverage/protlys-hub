'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const PAGE_SIZE = 50;
const DAY_LABELS = ['T','F','S','S','M','T','W'];

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
  const params = useSearchParams();
  const requestedScope = params.get('scope');
  const requestedGroup = params.get('group');
  const [scope, setScope] = useState(requestedScope === 'city' || requestedScope === 'group' ? requestedScope : 'world');
  const [groupId, setGroupId] = useState(requestedGroup || null);
  const [rows, setRows] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [statsCache, setStatsCache] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [cityMissing, setCityMissing] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const next = requestedScope === 'city' || requestedScope === 'group' ? requestedScope : 'world';
    setScope(next);
    setGroupId(requestedGroup || null);
  }, [requestedScope, requestedGroup]);

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
        supabase.rpc('get_leaderboard', { p_scope:scope, p_group_id:groupId, p_limit:PAGE_SIZE, p_offset:0 }),
        supabase.rpc('get_my_rank', { p_scope:scope, p_group_id:groupId })
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
  }, [scope, groupId]);

  const viewer = useMemo(() => rows.find(row => row.user_id === viewerId) || null, [rows, viewerId]);
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

          <div className="lb-scope-wrap">
            <div className="lb-scope" role="tablist" aria-label="Leaderboard scope">
              {['world','city','group'].map(item => (
                <button key={item} type="button" className={scope === item ? 'active' : ''} onClick={() => selectScope(item)}>
                  {item[0].toUpperCase() + item.slice(1)}
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

function OutsideViewer({ viewerId, scope, groupId, myRank, onOpen }) {
  const [row, setRow] = useState(null);
  useEffect(() => {
    let cancelled = false;
    createClient().rpc('get_leaderboard', { p_scope:scope, p_group_id:groupId, p_limit:1, p_offset:Math.max(Number(myRank || 1)-1,0) }).then(({data}) => {
      if (!cancelled) setRow(data?.[0] || null);
    });
    return () => { cancelled = true; };
  }, [viewerId, scope, groupId, myRank]);
  if (!row) return <div className="lb-row me"><span className="lb-rank">{myRank}</span><div className="lb-avatar lb-initial">Y</div><span className="lb-name">You</span><strong className="lb-score">—<small>steps</small></strong></div>;
  return <button type="button" id="leaderboard-me" className="lb-row me" onClick={() => onOpen(row)}>
    <span className="lb-rank">{row.rank}</span><Avatar user={row}/><span className="lb-name">{row.user_id === viewerId ? 'You' : row.username}</span><strong className="lb-score">{fmt(row.steps)}<small>steps</small></strong>
  </button>;
}

function MemberSheet({ selected, onClose }) {
  const { row, stats, loading, error } = selected;
  const activity = stats?.recent_activity || [];
  const byDay = new Map(activity.map(item => [String(item.day), Number(item.steps || 0)]));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi' }).format(new Date());
  const days = Array.from({length:7}, (_, i) => {
    const d = new Date(today + 'T12:00:00+03:00');
    d.setUTCDate(d.getUTCDate() - (6-i));
    const key = new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi' }).format(d);
    return { key, steps:byDay.get(key) || 0, label:DAY_LABELS[i] };
  });
  const active = days.filter(d => d.steps > 0).length;
  return (
    <div className="lb-sheet-layer" role="presentation" onClick={onClose}>
      <section className="lb-sheet" role="dialog" aria-modal="true" aria-label={row.username} onClick={e => e.stopPropagation()}>
        <div className="lb-sheet-handle" />
        <div className="lb-sheet-head">
          <div className="lb-sheet-user"><Avatar user={row} /><div><strong>{row.username}</strong><span>Rank #{stats?.rank || row.rank}</span></div></div>
          <button type="button" className="lb-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="lb-sheet-label">Recent activity</div>
        {loading ? <div className="lb-sheet-loading">Loading activity…</div> : error ? <div className="lb-sheet-loading">{error}</div> : (
          <>
            <div className="lb-days">{days.map(day => <div key={day.key} className={day.steps > 0 ? 'on' : ''} title={day.key}>{day.label}</div>)}</div>
            <div className="lb-tiles">
              <div><small>Steps today</small><strong>{fmt(stats?.steps_today)}</strong></div>
              <div><small>Estimated distance</small><strong>{Number(stats?.estimated_distance_km || 0).toFixed(1)}<i>km</i></strong></div>
              <div><small>Movement days</small><strong>{active}<i>/ 7</i></strong></div>
              <div><small>Lifetime steps</small><strong>{fmt(stats?.lifetime_steps)}</strong></div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const CSS = `
.leaderboard-screen{position:relative;min-height:100%;padding:0 14px 132px;overflow:visible;background:#F7F8F6;color:#111}
html.protlys-dark .leaderboard-screen{background:#0D0F0E;color:#F7F8F6}
.lb-glow{position:absolute;left:0;right:0;top:0;height:340px;pointer-events:none;background:radial-gradient(ellipse 70% 100% at 50% 0%,rgba(107,203,69,.22),transparent 70%)}
.lb-header{position:relative;display:grid;grid-template-columns:34px 1fr 34px;align-items:center;padding:14px 0 6px}
.lb-header h1{margin:0;text-align:center;font-size:16px;font-weight:800;line-height:1.1}.lb-header h1 span{display:block;margin-top:3px;font-size:11px;color:#6F756F;font-weight:500}
html.protlys-dark .lb-header h1 span{color:#8A908A}
.lb-icon-button{width:34px;height:34px;border-radius:50%;border:1px solid #D9DDD8;background:#fff;color:#111;font-size:23px;line-height:1;display:grid;place-items:center;cursor:pointer}
html.protlys-dark .lb-icon-button{background:#151815;border-color:#292D29;color:#F7F8F6}
.lb-header-spacer{width:34px;height:34px}
.lb-podium{position:relative;display:flex;align-items:flex-end;justify-content:center;gap:6px;margin-top:22px;height:236px}
.lb-slot{flex:1;display:flex;flex-direction:column;align-items:center;min-width:0;border:0;background:none;color:inherit;padding:0;cursor:pointer;font-family:inherit}
.lb-slot:disabled{cursor:default}.lb-slot strong{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lb-slot>span{font-size:11px;color:#6F756F;margin:2px 0 6px}.lb-slot.first>span{color:#8A908A}
.lb-avatar{width:38px;height:38px;border-radius:12px;object-fit:cover;display:grid;place-items:center;background:#B9C4B5;color:#111;font-size:14px;font-weight:800;flex:none}.lb-avatar-large{width:76px;height:76px;border-radius:22px;font-size:28px}.lb-slot:not(.first) .lb-avatar-large{width:62px;height:62px;border-radius:18px;font-size:22px}
.lb-initial{background:#6BCB45}.lb-slot.first .lb-avatar{box-shadow:0 0 0 2px #6BCB45,0 8px 28px rgba(107,203,69,.32)}
.lb-empty{opacity:.25;background:transparent;color:#6F756F;border:1px solid #D9DDD8}.lb-block{width:100%;border-radius:12px 12px 0 0;display:grid;place-items:start center;padding-top:8px;font-size:34px;font-weight:800;color:rgba(255,255,255,.9);background:linear-gradient(180deg,#4F9F35,rgba(79,159,53,.08))}.lb-slot.first .lb-block{height:104px;background:linear-gradient(180deg,#6BCB45,rgba(107,203,69,.08))}.lb-slot.second .lb-block{height:78px}.lb-slot.third .lb-block{height:60px}
.lb-scope-wrap{position:relative;display:flex;justify-content:center;margin:-16px 0 12px}.lb-scope{display:inline-flex;background:#fff;border:1px solid #D9DDD8;border-radius:999px;padding:3px}.lb-scope button{border:0;background:none;color:#6F756F;font:600 13px inherit;padding:7px 16px;border-radius:999px;cursor:pointer}.lb-scope button.active{background:#6BCB45;color:#111}
html.protlys-dark .lb-scope,html.protlys-dark .lb-card,.lb-card{background:#151815;border-color:#292D29}.lb-card{border:1px solid #D9DDD8;border-radius:20px;overflow:hidden;position:relative}.lb-row{width:100%;display:flex;align-items:center;gap:12px;padding:11px 14px;border:0;border-bottom:1px solid #D9DDD8;background:transparent;color:inherit;text-align:left;font-family:inherit;cursor:pointer}.lb-row:last-child{border-bottom:0}.lb-row:hover{background:rgba(107,203,69,.06)}html.protlys-dark .lb-row{border-bottom-color:#292D29}
.lb-rank{width:26px;font-size:12px;color:#6F756F;text-align:center;font-variant-numeric:tabular-nums}.lb-name{flex:1;min-width:0;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lb-score{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}.lb-score small{font-size:10px;color:#6F756F;margin-left:3px;font-weight:400}.lb-row.me{background:rgba(107,203,69,.12);box-shadow:inset 0 0 0 1px #6BCB45}
.lb-gap{text-align:center;color:#6F756F;padding:4px 0;letter-spacing:4px;border-bottom:1px solid #292D29}.lb-load-more{width:100%;border:0;background:transparent;color:#4F9F35;padding:14px;font:700 12px inherit;cursor:pointer}.lb-notice{margin:0 0 12px;padding:11px 13px;border:1px solid #D9DDD8;border-radius:14px;background:#fff;color:#6F756F;font-size:11.5px}.lb-state{text-align:center;padding:34px 16px;color:#6F756F;font-size:13px}.lb-error{color:#B3261E}
html.protlys-dark .lb-notice{background:#151815;border-color:#292D29;color:#8A908A}
.lb-you-pill{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(87px + env(safe-area-inset-bottom,0px) + 12px);z-index:9998;display:flex;align-items:center;gap:10px;background:#151815;border:1px solid #6BCB45;color:#F7F8F6;border-radius:999px;padding:10px 16px;font:600 13px inherit;box-shadow:0 8px 30px rgba(0,0,0,.35);cursor:pointer}.lb-you-pill em{font-style:normal;color:#6BCB45}
html:not(.protlys-dark) .lb-you-pill{background:#fff;color:#111}
.lb-sheet-layer{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:0}
.lb-sheet{width:min(430px,100vw);background:#fff;color:#111;border:1px solid #D9DDD8;border-radius:24px 24px 0 0;padding:18px 18px calc(env(safe-area-inset-bottom,0px) + 22px);max-height:78dvh;overflow:auto}.lb-sheet-handle{width:42px;height:4px;border-radius:99px;background:#D9DDD8;margin:0 auto 16px}.lb-sheet-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}.lb-sheet-user{display:flex;align-items:center;gap:12px;min-width:0}.lb-sheet-user strong{display:block;font-size:17px}.lb-sheet-user span{display:block;font-size:12px;color:#6F756F;margin-top:2px}.lb-close{margin-left:auto;width:32px;height:32px;border:1px solid #D9DDD8;border-radius:50%;background:none;color:#111;font-size:18px;cursor:pointer}.lb-sheet-label{font-size:12px;color:#6F756F;margin:2px 0 8px}.lb-days{display:flex;gap:6px;margin-bottom:16px}.lb-days div{flex:1;height:34px;border-radius:999px;border:1px solid #D9DDD8;display:grid;place-items:center;font-size:12px;color:#6F756F}.lb-days div.on{background:#6BCB45;border-color:#6BCB45;color:#111;font-weight:800}.lb-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lb-tiles>div{border:1px solid #D9DDD8;border-radius:16px;padding:14px;background:#F7F8F6}.lb-tiles small{display:block;font-size:11px;color:#6F756F;margin-bottom:6px}.lb-tiles strong{font-size:20px;font-variant-numeric:tabular-nums}.lb-tiles i{font-style:normal;font-size:11px;color:#6F756F;margin-left:3px;font-weight:400}.lb-sheet-loading{padding:20px 0;color:#6F756F;font-size:13px}
html.protlys-dark .lb-sheet{background:#151815;color:#F7F8F6;border-color:#292D29}html.protlys-dark .lb-sheet-handle{background:#292D29}html.protlys-dark .lb-close{border-color:#292D29;color:#F7F8F6}html.protlys-dark .lb-days div{border-color:#292D29;color:#8A908A}html.protlys-dark .lb-tiles>div{background:#0D0F0E;border-color:#292D29}.lb-sheet-user span,.lb-sheet-label,.lb-sheet-loading{color:#6F756F}
@media(max-width:380px){.lb-scope button{padding-left:12px;padding-right:12px}.lb-row{gap:9px;padding-left:10px;padding-right:10px}.lb-sheet{padding-left:14px;padding-right:14px}}\n`;\n