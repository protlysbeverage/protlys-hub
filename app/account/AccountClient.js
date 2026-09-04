'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function Icon({ name, size = 19 }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    steps: <><path d="M8.5 4.5c1.4 2 1.8 4.2.8 6.2-.8 1.7-2.5 2.7-4.1 2.5-1.6-.2-2.5-1.7-1.9-3.1.6-1.4 2-2 3.3-2.7 1.1-.5 1.5-1.4 1.9-2.9Z" /><path d="M15.5 19.5c-1.4-2-1.8-4.2-.8-6.2.8-1.7 2.5-2.7 4.1-2.5 1.6.2 2.5 1.7 1.9 3.1-.6 1.4-2 2-3.3 2.7-1.1.5-1.5 1.4-1.9 2.9Z" /></>,
    challenge: <><path d="M8 4h8l-1 6a3 3 0 0 1-6 0L8 4Z" /><path d="M12 13v5M8 21h8M5 4h3M16 4h3" /></>,
    community: <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5" /><path d="M14.5 15.5c2.5-.2 4.5 1.3 5 3.5" /></>,
    box: <><path d="m4 8 8-4 8 4-8 4-8-4Z" /><path d="M4 8v9l8 4 8-4V8M12 12v9" /></>,
    store: <><path d="M4 10h16l-1-5H5l-1 5Z" /><path d="M6 10v9h12v-9M9 19v-5h6v5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function AchievementBadge({ achievement, index }) {
  return (
    <div title={achievement?.achievements?.description} style={{
      minWidth: 98, background: '#fff', borderRadius: 14, padding: 12,
      border: '1.5px solid var(--line)', flexShrink: 0
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, background: 'var(--green-soft)',
        color: 'var(--green-dark)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 12, fontWeight: 900
      }}>{String(index + 1).padStart(2, '0')}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink)', marginTop: 8, lineHeight: 1.3 }}>
        {achievement?.achievements?.name}
      </div>
    </div>
  );
}

export default function AccountClient({ profile, achievements, shopUrl, email }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const name = profile?.display_name || email || 'Member';

  const rows = [
    { label: 'Hub dashboard', href: '/hub', icon: 'dashboard' },
    { label: 'Movement & steps', href: '/movement', icon: 'steps' },
    { label: 'Challenges', href: '/challenges', icon: 'challenge' },
    { label: 'Community', href: '/community', icon: 'community' },
    { label: 'Manage Protlys orders', href: `${shopUrl}/account`, external: true, icon: 'box' },
  ];

  return (
    <>
      <div className="screen-pad">
        <span className="eyebrow">Account</span>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Your Protlys profile</h1>
        <p className="subhead">Your movement, activity and community in one place.</p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 11, marginTop: 14,
          background: '#fff', border: '1.5px solid var(--line)', borderRadius: 16, padding: 13
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: 'var(--green-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'var(--green-dark)', flexShrink: 0
          }}>{name[0].toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
          </div>
        </div>
      </div>

      <div className="screen-pad" style={{ paddingTop: 8 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 17
        }}>
          <div className="hub-card">
            <div className="t">Protein streak</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>{profile?.streak || 0}d</div>
          </div>
          <div className="hub-card">
            <div className="t">Step streak</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>{profile?.step_streak || 0}d</div>
          </div>
          <div className="hub-card">
            <div className="t">Lifetime steps</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 800 }}>
              {(profile?.total_steps || 0) >= 1000
                ? `${Math.round((profile.total_steps || 0) / 1000)}K`
                : (profile?.total_steps || 0)}
            </div>
          </div>
          <div className="hub-card">
            <div className="t">Daily goal</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 800 }}>{(profile?.step_goal || 0).toLocaleString()}</div>
          </div>
        </div>

        {achievements.length > 0 && (
          <div style={{ marginBottom: 17 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 9 }}>Milestones</div>
            <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 4 }}>
              {achievements.slice(0, 8).map((achievement, index) => (
                <AchievementBadge key={achievement.id || index} achievement={achievement} index={index} />
              ))}
            </div>
          </div>
        )}

        <div style={{
          border: '1.5px solid var(--line)', borderRadius: 16, overflow: 'hidden', background: '#fff'
        }}>
          {rows.map((row, index) => (
            <div key={row.label} style={{ borderBottom: index === rows.length - 1 ? 'none' : '1px solid var(--line)' }}>
              <a href={row.href} target={row.external ? '_blank' : undefined}
                rel={row.external ? 'noopener' : undefined}
                style={{ textDecoration: 'none', display: 'block' }}>
                <div className="list-row" style={{ padding: '14px 15px' }}>
                  <div className="left" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ color: 'var(--green-dark)', display: 'flex' }}><Icon name={row.icon} /></span>
                    <span className="lbl">{row.label}</span>
                  </div>
                  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </a>
            </div>
          ))}
        </div>

        <a href={shopUrl} target="_blank" rel="noopener" className="btn-secondary"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 16 }}>
          <Icon name="store" size={17} /> Return to Protlys store
        </a>

        <div style={{ marginTop: 23, paddingTop: 18, borderTop: '1.5px solid var(--line)' }}>
          {!showSignOut ? (
            <button onClick={() => setShowSignOut(true)}
              style={{ background: 'none', border: 'none', color: 'var(--ink-45)', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              Sign out
            </button>
          ) : (
            <div style={{ background: '#FEE2E2', borderRadius: 14, padding: 15, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#B3261E', fontWeight: 700, marginBottom: 12 }}>Sign out of Protlys Hub?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" style={{ flex: 1, marginTop: 0 }}
                  onClick={() => setShowSignOut(false)}>Cancel</button>
                <button onClick={handleSignOut} disabled={signingOut}
                  style={{
                    flex: 1, background: '#B3261E', color: '#fff', border: 'none',
                    borderRadius: 12, padding: 12, fontWeight: 800, fontSize: 14,
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: 'var(--ink-45)', textAlign: 'center', marginTop: 15 }}>
          Protlys Hub
        </p>
      </div>
    </>
  );
}
