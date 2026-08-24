import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, points, streak, target_g')
    .eq('id', user.id)
    .single();

  const shopUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || '#';
  const name = profile?.display_name || user.email;
  const points = profile?.points || 0;
  const streak = profile?.streak || 0;

  const rows = [
    { label: 'My Orders',           href: `${shopUrl}/account`, external: true },
    { label: 'My Protlys Points',   href: '/',               badge: `${points} pts` },
    { label: 'My Challenges',       href: '/challenges' },
    { label: 'My Progress',         href: '/' },
    { label: 'My QR / Scan History', href: '/' },
    { label: 'My Rewards',          tag: 'Next' },
    { label: 'My Subscriptions',    tag: 'Phase 2' },
  ];

  return (
    <AppShell>
      <div className="screen-pad">
        <span className="eyebrow">Account</span>
        <h1 style={{ fontSize: 22 }}>Your Protlys</h1>
        <p className="subhead" style={{ marginTop: 4 }}>
          Signed in as <strong>{name}</strong>
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div className="hub-card" style={{ flex: 1 }}>
            <div className="t">Points</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{points}</div>
          </div>
          <div className="hub-card" style={{ flex: 1 }}>
            <div className="t">Streak</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{streak} {streak === 1 ? 'day' : 'days'}</div>
          </div>
        </div>
      </div>

      <div className="screen-pad" style={{ paddingTop: 6 }}>
        {rows.map((row, i) => (
          <div key={i} className="list-row">
            <div className="left"><span className="lbl">{row.label}</span></div>
            {row.tag
              ? <span className={`tag ${row.tag === 'Phase 2' ? 'tag-later' : 'tag-next'}`}>{row.tag}</span>
              : row.badge
              ? <span className="mono" style={{ fontSize: 13, color: 'var(--green-dark)', fontWeight: 700 }}>{row.badge}</span>
              : row.href
              ? <a href={row.href} target={row.external ? '_blank' : undefined} rel={row.external ? 'noopener' : undefined} style={{ display: 'contents' }}>
                  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </a>
              : null
            }
          </div>
        ))}

        <div style={{ marginTop: 24 }}>
          <a href={`${shopUrl}/account`} className="btn-secondary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }} target="_blank" rel="noopener">
            Manage Shopify orders ↗
          </a>
        </div>
      </div>
    </AppShell>
  );
}
