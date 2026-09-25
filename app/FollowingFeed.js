import Link from 'next/link';
import MemberPostComments from './MemberPostComments';

function Avatar({ name, url }) {
  if (url) return <img src={url} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />;
  return <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--green-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'var(--green-dark)', flexShrink:0 }}>{(name || '?')[0].toUpperCase()}</div>;
}

function PostStats({ stats }) {
  if (!stats || typeof stats !== 'object') return null;
  const items = [['Steps', stats.steps], ['Distance', stats.distance], ['Duration', stats.duration]].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');
  if (!items.length) return null;
  return <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(items.length,3)}, minmax(0,1fr))`, gap:7, margin:'10px 0' }}>{items.map(([label,value]) => <div key={label} style={{ border:'1px solid var(--line)', borderRadius:10, padding:'7px 9px', background:'var(--paper)' }}><div style={{ fontSize:8.5, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:800, color:'var(--ink-45)' }}>{label}</div><div className="mono" style={{ fontSize:12, fontWeight:800, marginTop:2 }}>{value}</div></div>)}</div>;
}

function timeAgo(ts) {
  const raw = String(ts || '');
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Intl.DateTimeFormat('en-KE', { timeZone:'Africa/Nairobi', day:'numeric', month:'short' }).format(date);
}

export default function FollowingFeed({ posts, followingCount }) {
  if (!followingCount) return <div style={{ background:'#fff', border:'1.5px solid var(--line)', borderRadius:18, padding:'34px 20px', textAlign:'center' }}><div style={{ fontWeight:800, fontSize:16 }}>Your Following feed is empty</div><p className="subhead" style={{ margin:'7px auto 16px', maxWidth:300 }}>Follow people whose progress interests you and their posts will appear here.</p><Link href="/" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'9px 15px', borderRadius:999, background:'var(--green)', color:'#fff', textDecoration:'none', fontSize:12, fontWeight:800 }}>Explore the community</Link></div>;
  if (!posts?.length) return <div style={{ background:'#fff', border:'1.5px solid var(--line)', borderRadius:18, padding:'34px 20px', textAlign:'center' }}><div style={{ fontWeight:800, fontSize:16 }}>Nothing new yet</div><p className="subhead" style={{ margin:'7px auto 0', maxWidth:300 }}>The people you follow haven't shared a new post yet.</p></div>;

  return <div style={{ display:'grid', gap:10 }}>{posts.map(post => { const profile = post.profiles || {}; return <article key={post.id} style={{ background:'#fff', border:'1.5px solid var(--line)', borderRadius:18, padding:14 }}>
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <Link href={`/member/${post.user_id}`} style={{ lineHeight:0 }}><Avatar name={profile.display_name} url={profile.avatar_url} /></Link>
      <div style={{ minWidth:0, flex:1 }}><Link href={`/member/${post.user_id}`} style={{ textDecoration:'none', color:'var(--ink)', fontWeight:800, fontSize:13 }}>{profile.display_name || 'Protlys Member'}</Link><div style={{ color:'var(--ink-45)', fontSize:10.5, marginTop:2 }}>{timeAgo(post.created_at)}</div></div>
      {post.post_type && post.post_type !== 'general' && <span style={{ background:'var(--green-soft)', color:'var(--green-dark)', padding:'3px 8px', borderRadius:999, fontSize:9.5, fontWeight:800 }}>{post.post_type.replace('_',' ')}</span>}
    </div>
    {post.body && <p style={{ fontSize:13.5, lineHeight:1.55, margin:'12px 0 8px', whiteSpace:'pre-wrap',overflowWrap:'break-word' }}>{post.body}</p>}
    <PostStats stats={post.stats} />
    {post.image_url && <img src={post.image_url} alt="" style={{ width:'100%', maxHeight:430, objectFit:'cover', borderRadius:13, display:'block', marginTop:8 }} />}
    <div style={{ display:'flex', gap:14, marginTop:11, color:'var(--ink-45)', fontSize:11, fontWeight:700 }}><span>{post.like_count || 0} likes</span><span>{post.comment_count || 0} comments</span></div>
    <MemberPostComments postId={post.id} initialCount={post.comment_count || 0} initialLikeCount={post.like_count || 0} />
  </article>; })}</div>;
}
