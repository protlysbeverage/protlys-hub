'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createChallengeAction, joinChallengeAction } from '@/app/movement-actions';

const TABS = ['Discover', 'My Challenges', 'Create'];

export default function ChallengesClient({ publicChallenges, myChallenges, myIds, userId, profile }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [tab, setTab] = useState('Discover');
  const [toast, setToast] = useState('');
  const [sharePanel, setSharePanel] = useState(null);

  // Create form state
  const [form, setForm] = useState({
    name: '', description: '', stepTarget: 10000,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '', visibility: 'public', allowTeams: false,
  });

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800); }
  function upd(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleJoin(challengeId) {
    start(async () => {
      const r = await joinChallengeAction({ challengeId });
      if (r?.error) { showToast(r.error); return; }
      showToast('Joined! Good luck 🎯');
      router.refresh();
    });
  }

  function handleCreate() {
    if (!form.name || !form.endDate) { showToast('Add a name and end date'); return; }
    start(async () => {
      const r = await createChallengeAction({
        name: form.name, description: form.description,
        stepTarget: form.stepTarget, startDate: form.startDate,
        endDate: form.endDate, visibility: form.visibility, allowTeams: form.allowTeams,
      });
      if (r?.error) { showToast(r.error); return; }
      showToast('Challenge created! 🎉');
      setSharePanel(r.challenge);
      setTab('My Challenges');
      router.refresh();
    });
  }

  const hubBase = typeof window !== 'undefined' ? window.location.origin : 'https://hub.protlys.com';

  function shareLink(challenge) {
    return `${hubBase}/challenges?invite=${challenge.invite_token}`;
  }

  function copyLink(challenge) {
    navigator.clipboard.writeText(shareLink(challenge));
    showToast('Link copied!');
  }

  function shareWhatsApp(challenge) {
    const link = shareLink(challenge);
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join my Protlys challenge: ${challenge.name} — ${link}`)}`);
  }

  return (
    <>
      {toast && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
          background:'var(--ink)', color:'#fff', borderRadius:999, padding:'10px 18px',
          fontSize:13, fontWeight:600, zIndex:999, whiteSpace:'nowrap', pointerEvents:'none' }}>{toast}</div>
      )}

      <div className="screen-pad">
        <span className="eyebrow">Challenges</span>
        <h1 style={{ fontSize: 22 }}>Move. Compete. Win.</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:6, padding:'0 18px 12px', overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            border: tab === t ? '2px solid var(--green)' : '2px solid var(--line)',
            background: tab === t ? 'var(--green)' : '#fff',
            color: tab === t ? '#fff' : 'var(--ink-70)',
            borderRadius:999, padding:'8px 16px', fontSize:13, fontWeight:700,
            cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
          }}>{t}</button>
        ))}
      </div>

      <div className="screen-pad" style={{ paddingTop: 4 }}>

        {/* ── DISCOVER ── */}
        {tab === 'Discover' && (
          <>
            {publicChallenges.length === 0 && (
              <p className="disclaimer">No public challenges yet. Be the first to create one!</p>
            )}
            {publicChallenges.map(c => {
              const joined = myIds.includes(c.id);
              const memberCount = c.challenge_members?.[0]?.count || 0;
              const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / 86400000));
              return (
                <div key={c.id} className="chal-card">
                  <div className="chal-top">
                    <div>
                      <div className="chal-title">{c.name}</div>
                      <div className="chal-meta">
                        {c.step_target.toLocaleString()} steps · {daysLeft}d left · {memberCount} members
                      </div>
                      {c.description && <div className="chal-meta" style={{ marginTop:2 }}>{c.description}</div>}
                    </div>
                    {joined
                      ? <span className="tag tag-mvp">Joined ✓</span>
                      : <button className="btn-secondary" style={{ width:'auto', padding:'8px 14px', marginTop:0 }}
                          onClick={() => handleJoin(c.id)} disabled={isPending}>Join</button>
                    }
                  </div>
                  {joined && (
                    <div style={{ marginTop:8, display:'flex', gap:8 }}>
                      <button className="link-btn" onClick={() => copyLink(c)}>Copy link</button>
                      <button className="link-btn" onClick={() => shareWhatsApp(c)}>WhatsApp</button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── MY CHALLENGES ── */}
        {tab === 'My Challenges' && (
          <>
            {myChallenges.length === 0 && (
              <p className="disclaimer">You haven't joined any challenges yet. Discover public ones or create your own.</p>
            )}
            {myChallenges.map(c => {
              if (!c) return null;
              const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / 86400000));
              const memberCount = c.challenge_members?.[0]?.count || 0;
              const isCreator = c.creator_id === userId;
              return (
                <div key={c.id} className="chal-card">
                  <div className="chal-top">
                    <div>
                      <div className="chal-title">{c.name}</div>
                      <div className="chal-meta">
                        {c.step_target.toLocaleString()} steps · {daysLeft}d left · {memberCount} members
                        {isCreator && ' · You created this'}
                      </div>
                    </div>
                    <span className="tag tag-mvp">{c.visibility}</span>
                  </div>

                  {/* Share panel */}
                  {(sharePanel?.id === c.id || isCreator) && (
                    <div style={{ marginTop:12, background:'var(--green-soft)', borderRadius:12, padding:12 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--green-dark)', marginBottom:8 }}>
                        Invite friends
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <button className="btn-secondary" style={{ width:'auto', padding:'8px 14px', marginTop:0, fontSize:12 }}
                          onClick={() => copyLink(c)}>📋 Copy link</button>
                        <button className="btn-secondary" style={{ width:'auto', padding:'8px 14px', marginTop:0, fontSize:12 }}
                          onClick={() => shareWhatsApp(c)}>📲 WhatsApp</button>
                        {navigator.share && (
                          <button className="btn-secondary" style={{ width:'auto', padding:'8px 14px', marginTop:0, fontSize:12 }}
                            onClick={() => navigator.share({ title: c.name, url: shareLink(c) })}>
                            Share
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize:11, color:'var(--ink-45)', marginTop:8, wordBreak:'break-all' }}>
                        {shareLink(c)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── CREATE ── */}
        {tab === 'Create' && (
          <div>
            <div className="field-group">
              <label className="field-label">CHALLENGE NAME</label>
              <input className="field-input" value={form.name} onChange={e => upd('name', e.target.value)}
                placeholder="e.g. Weekend Warriors" />
            </div>
            <div className="field-group">
              <label className="field-label">DESCRIPTION (optional)</label>
              <input className="field-input" value={form.description}
                onChange={e => upd('description', e.target.value)} placeholder="What's this challenge about?" />
            </div>
            <div className="field-group">
              <label className="field-label">STEP TARGET</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
                {[5000,7500,10000,15000,20000,50000].map(t => (
                  <button key={t} onClick={() => upd('stepTarget', t)} style={{
                    border: form.stepTarget === t ? '2px solid var(--green)' : '2px solid var(--line)',
                    background: form.stepTarget === t ? 'var(--green)' : '#fff',
                    color: form.stepTarget === t ? '#fff' : 'var(--ink-70)',
                    borderRadius:10, padding:'8px 12px', fontSize:12, fontWeight:700, cursor:'pointer',
                  }}>{t.toLocaleString()}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div className="field-group">
                <label className="field-label">START DATE</label>
                <input className="field-input" type="date" value={form.startDate}
                  onChange={e => upd('startDate', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">END DATE</label>
                <input className="field-input" type="date" value={form.endDate}
                  onChange={e => upd('endDate', e.target.value)} />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">VISIBILITY</label>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                {['public','invite','private'].map(v => (
                  <button key={v} onClick={() => upd('visibility', v)} style={{
                    border: form.visibility === v ? '2px solid var(--green)' : '2px solid var(--line)',
                    background: form.visibility === v ? 'var(--green)' : '#fff',
                    color: form.visibility === v ? '#fff' : 'var(--ink-70)',
                    borderRadius:10, padding:'8px 12px', fontSize:12, fontWeight:700,
                    cursor:'pointer', textTransform:'capitalize',
                  }}>{v === 'invite' ? 'Invite only' : v}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <input type="checkbox" id="teams" checked={form.allowTeams} onChange={e => upd('allowTeams', e.target.checked)}
                style={{ width:18, height:18, accentColor:'var(--green)' }} />
              <label htmlFor="teams" style={{ fontSize:13, fontWeight:600, color:'var(--ink-70)' }}>
                Allow team challenges
              </label>
            </div>
            <button className="btn-primary" onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Creating…' : 'Create challenge →'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
