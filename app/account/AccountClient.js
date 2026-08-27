'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
    { label: 'My Hub Dashboard',     href: '/hub',      icon: '🎯' },
    { label: 'My Movement & Steps',  href: '/movement', icon: '⚡' },
    { label: 'My Challenges',        href: '/challenges',icon: '🏆' },
    { label: 'My Community',         href: '/community', icon: '👥' },
    { label: 'Manage Protlys orders', href: `${shopUrl}/account`, external: true, icon: '📦' },
    { label: 'My Rewards',           tag: 'Soon',        icon: '🎁' },
    { label: 'My Subscriptions',     tag: 'Phase 2',     icon: '🔄' },
  ];

  return (
    <>
      <div className="screen-pad">
        <span className="eyebrow">Account</span>
        <h1 style={{ fontSize: 22 }}>Your Protlys</h1>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--green-soft)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, fontWeight:700, color:'var(--green-dark)', flexShrink:0 }}>
            {name[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>{name}</div>
            <div style={{ fontSize:12, color:'var(--ink-45)' }}>{email}</div>
          </div>
        </div>
      </div>

      <div className="screen-pad" style={{ paddingTop: 6 }}>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <div className="hub-card">
            <div className="t">Points</div>
            <div className="mono" style={{ fontSize:22, fontWeight:700 }}>{profile?.points || 0}</div>
          </div>
          <div className="hub-card">
            <div className="t">Protein streak</div>
            <div className="mono" style={{ fontSize:22, fontWeight:700 }}>{profile?.streak || 0}d</div>
          </div>
          <div className="hub-card">
            <div className="t">Step streak</div>
            <div className="mono" style={{ fontSize:22, fontWeight:700 }}>{profile?.step_streak || 0}d</div>
          </div>
          <div className="hub-card">
            <div className="t">Lifetime steps</div>
            <div className="mono" style={{ fontSize:20, fontWeight:700 }}>
              {(profile?.total_steps || 0) >= 1000
                ? Math.round((profile?.total_steps||0)/1000)+'K'
                : (profile?.total_steps||0)}
            </div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Achievements</div>
            <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
              {achievements.map((a, i) => (
                <div key={i} title={a.achievements?.description}
                  style={{ minWidth:80, background:'#fff', borderRadius:14, padding:'12px 8px',
                    textAlign:'center', border:'1.5px solid var(--line)', flexShrink:0 }}>
                  <div style={{ fontSize:24 }}>{a.achievements?.icon}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--ink)', marginTop:4, lineHeight:1.3 }}>
                    {a.achievements?.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nav rows */}
        {rows.map((row, i) => (
          <div key={i}>
            {row.href ? (
              <a href={row.href} target={row.external ? '_blank' : undefined}
                rel={row.external ? 'noopener' : undefined}
                style={{ textDecoration:'none', display:'block' }}>
                <div className="list-row">
                  <div className="left" style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:18 }}>{row.icon}</span>
                    <span className="lbl">{row.label}</span>
                  </div>
                  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </a>
            ) : (
              <div className="list-row">
                <div className="left" style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>{row.icon}</span>
                  <span className="lbl">{row.label}</span>
                </div>
                <span className={`tag ${row.tag === 'Phase 2' ? 'tag-later' : 'tag-next'}`}>{row.tag}</span>
              </div>
            )}
          </div>
        ))}

        {/* Return to store */}
        <a href={shopUrl} target="_blank" rel="noopener" className="btn-secondary"
          style={{ textDecoration:'none', display:'flex', alignItems:'center',
            justifyContent:'center', gap:8, marginTop:20 }}>
          🛒 Return to Protlys store
        </a>

        {/* Sign out — at the bottom, not hidden but not prominent */}
        <div style={{ marginTop:24, paddingTop:20, borderTop:'1.5px solid var(--line)' }}>
          {!showSignOut ? (
            <button onClick={() => setShowSignOut(true)}
              style={{ background:'none', border:'none', color:'var(--ink-45)',
                fontSize:13, fontWeight:600, cursor:'pointer', width:'100%', textAlign:'center' }}>
              Sign out
            </button>
          ) : (
            <div style={{ background:'#FEE2E2', borderRadius:14, padding:16, textAlign:'center' }}>
              <p style={{ fontSize:13, color:'#B3261E', fontWeight:600, marginBottom:12 }}>
                Are you sure you want to sign out?
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-secondary" style={{ flex:1, marginTop:0 }}
                  onClick={() => setShowSignOut(false)}>Cancel</button>
                <button onClick={handleSignOut} disabled={signingOut}
                  style={{ flex:1, background:'#B3261E', color:'#fff', border:'none',
                    borderRadius:12, padding:'12px', fontWeight:700, fontSize:14,
                    cursor:'pointer', fontFamily:'inherit' }}>
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ fontSize:11, color:'var(--ink-45)', textAlign:'center', marginTop:16 }}>
          Protlys Hub · hub.protlys.com
        </p>
      </div>
    </>
  );
}
