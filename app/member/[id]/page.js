import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

function Avatar({ name, url, size = 92 }) {
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--green-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 800, color: 'var(--green-dark)'
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function Icon({ name, size = 17 }) {
  const paths = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    heart: <path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8.8 1.4Z" />,
    steps: <><path d="M7 4c2 0 3 1.6 3 3.5S8.6 11 7 11 4 9.4 4 7.5 5 4 7 4Zm10 9c2 0 3 1.6 3 3.5S18.6 20 17 20s-3-1.6-3-3.5 1-3.5 3-3.5Z" /><path d="m9 10 5 4" /></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default async function MemberProfilePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: posts }, { count: postCount }, { data: achievements }] = await Promise.all([
    supabase.from('profiles')
      .select('id, display_name, avatar_url, streak, step_streak, total_steps, step_goal, target_g')
      .eq('id', id)
      .single(),
    supabase.from('feed_posts')
      .select('id, body, image_url, post_type, stats, created_at, feed_likes(count)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('feed_posts').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('user_achievements')
      .select('earned_at, achievements(slug, name, icon, description)')
      .eq('user_id', id)
      .order('earned_at', { ascending: false })
      .limit(6),
  ]);

  if (!profile) notFound();

  return (
    <AppShell>
      <div className="screen-pad" style={{ paddingTop: 18 }}>
        <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:7, color:'var(--ink-70)', textDecoration:'none', fontSize:12, fontWeight:800, marginBottom:18 }}>
          <Icon name="arrow" size={16} /> Back to Feed
        </Link>

        <section style={{ background:'#fff', border:'1.5px solid var(--line)', borderRadius:20, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <Avatar name={profile.display_name} url={profile.avatar_url} />
            <div style={{ minWidth:0 }}>
              <div className="eyebrow">Protlys member</div>
              <h1 style={{ fontSize:24, margin:'3px 0 4px' }}>{profile.display_name || 'Member'}</h1>
              <p className="subhead" style={{ margin:0 }}>Progress shared with the Protlys community.</p>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginTop:20 }}>
            <div style={{ border:'1px solid var(--line)', borderRadius:12, padding:'11px 10px', background:'var(--paper)' }}>
              <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:800, color:'var(--ink-45)' }}>Step streak</div>
              <div className="mono" style={{ fontSize:17, fontWeight:800, marginTop:3 }}>{profile.step_streak || 0}</div>
            </div>
            <div style={{ border:'1px solid var(--line)', borderRadius:12, padding:'11px 10px', background:'var(--paper)' }}>
              <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:800, color:'var(--ink-45)' }}>Total steps</div>
              <div className="mono" style={{ fontSize:17, fontWeight:800, marginTop:3 }}>{Number(profile.total_steps || 0).toLocaleString()}</div>
            </div>
            <div style={{ border:'1px solid var(--line)', borderRadius:12, padding:'11px 10px', background:'var(--paper)' }}>
              <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:800, color:'var(--ink-45)' }}>Posts</div>
              <div className="mono" style={{ fontSize:17, fontWeight:800, marginTop:3 }}>{postCount || 0}</div>
            </div>
          </div>
        </section>

        {achievements?.length > 0 && (
          <section style={{ marginTop:14 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>Milestones</div>
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2 }}>
              {achievements.map(item => (
                <div key={`${item.achievements?.slug}-${item.earned_at}`} style={{ flex:'0 0 auto', border:'1px solid var(--line)', borderRadius:12, padding:'10px 12px', background:'#fff', minWidth:150 }}>
                  <div style={{ fontSize:12, fontWeight:800 }}>{item.achievements?.name || 'Milestone'}</div>
                  {item.achievements?.description && <div style={{ fontSize:10.5, color:'var(--ink-45)', marginTop:3 }}>{item.achievements.description}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop:18, paddingBottom:20 }}>
          <div className="eyebrow" style={{ marginBottom:8 }}>Recent posts</div>
          {posts?.length ? posts.map(post => (
            <article key={post.id} style={{ background:'#fff', border:'1.5px solid var(--line)', borderRadius:16, padding:14, marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:7 }}>
                <span style={{ fontSize:10.5, color:'var(--ink-45)' }}>{new Date(post.created_at).toLocaleDateString()}</span>
                {post.post_type && post.post_type !== 'general' && <span style={{ background:'var(--green-soft)', color:'var(--green-dark)', padding:'2px 7px', borderRadius:999, fontSize:10, fontWeight:800 }}>{post.post_type.replace('_',' ')}</span>}
              </div>
              {post.body && <p style={{ fontSize:13.5, lineHeight:1.55, margin:'0 0 10px' }}>{post.body}</p>}
              {post.image_url && <img src={post.image_url} alt="" style={{ width:'100%', maxHeight:280, objectFit:'cover', borderRadius:12, display:'block' }} />}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, fontSize:12, color:'var(--ink-45)', fontWeight:700 }}>
                <Icon name="heart" size={15} /> {post.feed_likes?.[0]?.count || 0}
              </div>
            </article>
          )) : (
            <div style={{ background:'#fff', border:'1.5px solid var(--line)', borderRadius:16, padding:'28px 18px', textAlign:'center' }}>
              <div style={{ fontWeight:800 }}>No posts yet</div>
              <p className="subhead" style={{ margin:'5px 0 0' }}>This member has not shared anything to the feed.</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
