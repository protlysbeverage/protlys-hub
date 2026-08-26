import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: achievements }, { data: challenges }] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, points, streak, target_g, step_streak, total_steps, step_goal, share_activity')
      .eq('id', user.id).single(),
    supabase.from('user_achievements')
      .select('earned_at, achievements(slug, name, icon, description, category)')
      .eq('user_id', user.id).order('earned_at', { ascending: false }),
    supabase.from('challenge_members')
      .select('challenges(name, end_date, step_target)').eq('user_id', user.id).limit(5),
  ]);

  const shopUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || '#';

  return (
    <AppShell>
      <div className="screen-pad">
        <span className="eyebrow">Account</span>
        <h1 style={{ fontSize: 22 }}>Your Protlys</h1>
        <p className="subhead" style={{ marginTop: 4 }}>
          Signed in as <strong>{profile?.display_name || user.email}</strong>
        </p>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
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
                ? Math.round((profile?.total_steps || 0) / 1000) + 'K'
                : (profile?.total_steps || 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="screen-pad" style={{ paddingTop: 6 }}>

        {/* Achievements */}
        {achievements?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ fontSize:15, marginBottom:10 }}>Achievements</h2>
            <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
              {achievements.map((a, i) => (
                <div key={i} style={{ minWidth:90, background:'#fff', borderRadius:14,
                  padding:'12px 8px', textAlign:'center', border:'1.5px solid var(--line)',
                  flexShrink:0 }}>
                  <div style={{ fontSize:26 }}>{a.achievements?.icon}</div>
                  <div style={{ fontSize:10.5, fontWeight:700, color:'var(--ink)', marginTop:5,
                    lineHeight:1.3 }}>{a.achievements?.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account rows */}
        {[
          { label:'My Orders',         href:`${shopUrl}/account`, external:true },
          { label:'My Challenges',     href:'/challenges' },
          { label:'My Movement',       href:'/movement' },
          { label:'My Points',         badge:`${profile?.points || 0} pts` },
          { label:'My Rewards',        tag:'Next' },
          { label:'My Subscriptions',  tag:'Phase 2' },
        ].map((row, i) => (
          <div key={i} className="list-row">
            <div className="left"><span className="lbl">{row.label}</span></div>
            {row.tag
              ? <span className={`tag ${row.tag === 'Phase 2' ? 'tag-later' : 'tag-next'}`}>{row.tag}</span>
              : row.badge
              ? <span className="mono" style={{ fontSize:13, color:'var(--green-dark)', fontWeight:700 }}>{row.badge}</span>
              : <a href={row.href} target={row.external ? '_blank' : undefined}
                  rel={row.external ? 'noopener' : undefined} style={{ display:'contents' }}>
                  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </a>
            }
          </div>
        ))}

        <div style={{ marginTop: 24 }}>
          <a href={`${shopUrl}/account`} className="btn-secondary"
            style={{ textDecoration:'none', display:'block', textAlign:'center' }}
            target="_blank" rel="noopener">
            Manage Shopify orders ↗
          </a>
        </div>
      </div>
    </AppShell>
  );
}
