'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createChallengeAction, joinChallengeAction } from '@/app/movement-actions';

const TABS = ['Discover', 'My Challenges', 'Create'];

function Icon({ name, size = 18 }) {
  const paths = {
    target: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.9 7.6-4.5M8.2 13.1l7.6 4.5" /></>,
    link: <><path d="M10 13.5 14 9.5" /><path d="M7.5 17.5H6a4 4 0 0 1 0-8h3" /><path d="M16.5 6.5H18a4 4 0 0 1 0 8h-3" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function ChallengeCard({ challenge, joined, isCreator, onJoin, onShare }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(`${challenge.end_date}T23:59:59`) - new Date()) / 86400000));
  const members = challenge.challenge_members?.[0]?.count || 0;

  return (
    <div style={{
      background: '#fff', border: '1.5px solid var(--line)', borderRadius: 18,
      padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,.04)'
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: 'var(--green-soft)',
          color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon name="target" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{challenge.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
            {challenge.step_target.toLocaleString()} steps · {formatDate(challenge.start_date)} – {formatDate(challenge.end_date)} · {members} members
          </div>
        </div>
        {joined ? (
          <span className="tag tag-mvp">Joined</span>
        ) : (
          <button className="btn-secondary" onClick={() => onJoin(challenge.id)}
            style={{ width: 'auto', padding: '8px 13px', marginTop: 0 }}>Join</button>
        )}
      </div>

      {challenge.description && (
        <p style={{ fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.5, margin: '12px 0 0 54px' }}>
          {challenge.description}
        </p>
      )}

      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: daysLeft > 0 ? 'var(--green-dark)' : 'var(--ink-45)' }}>
          {daysLeft > 0 ? `${daysLeft} days left` : 'Challenge ended'}
        </span>
        {(joined || isCreator) && (
          <button className="link-btn" onClick={() => onShare(challenge)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="share" size={14} /> Invite
          </button>
        )}
      </div>

      {isCreator && <div style={{ marginTop: 7, fontSize: 10, color: 'var(--ink-45)' }}>Created by you</div>}
    </div>
  );
}

export default function ChallengesClient({ publicChallenges, myChallenges, myIds, userId }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [tab, setTab] = useState('Discover');
  const [toast, setToast] = useState('');
  const [createdChallenge, setCreatedChallenge] = useState(null);
  const [sharePanel, setSharePanel] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    stepTarget: 10000,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    visibility: 'public',
  });

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2600);
  }

  function upd(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function join(challengeId) {
    start(async () => {
      const result = await joinChallengeAction({ challengeId });
      if (result?.error) {
        showToast(result.error);
        return;
      }
      showToast('Challenge joined.');
      router.refresh();
    });
  }

  function create() {
    if (!form.name.trim()) {
      showToast('Give the challenge a name.');
      return;
    }
    if (!form.endDate) {
      showToast('Choose an end date.');
      return;
    }
    if (form.endDate < form.startDate) {
      showToast('End date must be after the start date.');
      return;
    }

    start(async () => {
      const result = await createChallengeAction({
        name: form.name.trim(),
        description: form.description.trim(),
        stepTarget: Number(form.stepTarget),
        startDate: form.startDate,
        endDate: form.endDate,
        visibility: form.visibility,
        allowTeams: false,
      });

      if (result?.error) {
        showToast(result.error);
        return;
      }

      setCreatedChallenge(result.challenge);
      setSharePanel(result.challenge);
      setTab('My Challenges');
      setForm(current => ({ ...current, name: '', description: '', endDate: '' }));
      showToast('Challenge created.');
    });
  }

  const hubBase = typeof window !== 'undefined' ? window.location.origin : 'https://protlys-hub-pj68.vercel.app';

  function shareLink(challenge) {
    return `${hubBase}/challenges?invite=${challenge.invite_token}`;
  }

  function share(challenge) {
    const link = shareLink(challenge);
    setSharePanel(challenge);

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: challenge.name,
        text: `Join my Protlys challenge: ${challenge.name}`,
        url: link,
      }).catch(() => {});
    }
  }

  async function copyLink(challenge) {
    await navigator.clipboard.writeText(shareLink(challenge));
    showToast('Invite link copied.');
  }

  function whatsapp(challenge) {
    const link = shareLink(challenge);
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join my Protlys challenge: ${challenge.name} — ${link}`)}`);
  }

  const combinedMine = [
    ...(createdChallenge ? [createdChallenge] : []),
    ...myChallenges.filter(c => c && c.id !== createdChallenge?.id),
  ];

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 82, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#fff', borderRadius: 999, padding: '10px 16px',
          fontSize: 13, fontWeight: 700, zIndex: 999, whiteSpace: 'nowrap'
        }}>{toast}</div>
      )}

      <div className="screen-pad">
        <span className="eyebrow">Challenges</span>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Train together</h1>
        <p className="subhead">Create a goal, invite people and track the challenge as a group.</p>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '4px 18px 14px', overflowX: 'auto' }}>
        {TABS.map(value => (
          <button key={value} onClick={() => setTab(value)} style={{
            border: tab === value ? '1.5px solid var(--green)' : '1.5px solid var(--line)',
            background: tab === value ? 'var(--green)' : '#fff',
            color: tab === value ? '#fff' : 'var(--ink-70)',
            borderRadius: 999, padding: '8px 15px', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', whiteSpace: 'nowrap'
          }}>{value}</button>
        ))}
      </div>

      <div className="screen-pad" style={{ paddingTop: 2 }}>
        {tab === 'Discover' && (
          <>
            {publicChallenges.length === 0 ? (
              <div className="hub-card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, marginBottom: 5 }}>No public challenges yet</div>
                <p className="subhead" style={{ margin: 0 }}>Create the first one and invite your community.</p>
              </div>
            ) : (
              publicChallenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge}
                  joined={myIds.includes(challenge.id)}
                  isCreator={challenge.creator_id === userId}
                  onJoin={join}
                  onShare={share} />
              ))
            )}
          </>
        )}

        {tab === 'My Challenges' && (
          <>
            {combinedMine.length === 0 ? (
              <div className="hub-card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, marginBottom: 5 }}>You have no challenges yet</div>
                <p className="subhead" style={{ margin: 0 }}>Join one from Discover or create your own.</p>
              </div>
            ) : (
              combinedMine.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge}
                  joined={true}
                  isCreator={challenge.creator_id === userId}
                  onJoin={join}
                  onShare={share} />
              ))
            )}

            {sharePanel && (
              <div style={{
                background: 'var(--green-soft)', border: '1.5px solid rgba(46,158,91,.2)',
                borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 14
              }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Invite people to {sharePanel.name}</div>
                <p className="subhead" style={{ margin: '5px 0 12px' }}>
                  Send the link. When someone opens it, Protlys automatically adds them to the challenge.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={() => copyLink(sharePanel)}
                    style={{ width: 'auto', padding: '8px 12px', marginTop: 0 }}>
                    <Icon name="link" size={14} /> Copy invite link
                  </button>
                  <button className="btn-secondary" onClick={() => whatsapp(sharePanel)}
                    style={{ width: 'auto', padding: '8px 12px', marginTop: 0 }}>
                    WhatsApp
                  </button>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button className="btn-secondary" onClick={() => share(sharePanel)}
                      style={{ width: 'auto', padding: '8px 12px', marginTop: 0 }}>
                      <Icon name="share" size={14} /> Share
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 10, wordBreak: 'break-all' }}>
                  {shareLink(sharePanel)}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'Create' && (
          <div className="hub-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Create a challenge</div>
            <p className="subhead" style={{ marginBottom: 16 }}>
              Set the target and dates. You will get an invite link immediately after creation.
            </p>

            <div className="field-group">
              <label className="field-label">CHALLENGE NAME</label>
              <input className="field-input" value={form.name}
                onChange={e => upd('name', e.target.value)} placeholder="e.g. 7-Day 50K Steps" />
            </div>

            <div className="field-group">
              <label className="field-label">DESCRIPTION</label>
              <textarea className="field-input" value={form.description}
                onChange={e => upd('description', e.target.value)}
                placeholder="What are you challenging the group to do?"
                style={{ minHeight: 80, resize: 'vertical', paddingTop: 11 }} />
            </div>

            <div className="field-group">
              <label className="field-label">STEP TARGET</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 6 }}>
                {[5000, 10000, 25000, 50000, 100000].map(target => (
                  <button key={target} onClick={() => upd('stepTarget', target)} style={{
                    border: form.stepTarget === target ? '1.5px solid var(--green)' : '1.5px solid var(--line)',
                    background: form.stepTarget === target ? 'var(--green)' : '#fff',
                    color: form.stepTarget === target ? '#fff' : 'var(--ink-70)',
                    borderRadius: 10, padding: '8px 11px', fontSize: 12, fontWeight: 800, cursor: 'pointer'
                  }}>{target.toLocaleString()}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
              <label className="field-label">WHO CAN JOIN</label>
              <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
                {[
                  ['public', 'Everyone'],
                  ['invite', 'Invite link'],
                  ['private', 'Private'],
                ].map(([value, label]) => (
                  <button key={value} onClick={() => upd('visibility', value)} style={{
                    border: form.visibility === value ? '1.5px solid var(--green)' : '1.5px solid var(--line)',
                    background: form.visibility === value ? 'var(--green)' : '#fff',
                    color: form.visibility === value ? '#fff' : 'var(--ink-70)',
                    borderRadius: 10, padding: '8px 11px', fontSize: 12, fontWeight: 800,
                    cursor: 'pointer'
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={create} disabled={isPending}>
              {isPending ? 'Creating…' : 'Create challenge'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
