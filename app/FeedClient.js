'use client';

import { useRef, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createFeedPostAction, toggleFeedLikeAction, addFeedCommentAction } from './feed-actions';

const POST_TYPES = [
  { value: 'progress', label: '📈 Progress update' },
  { value: 'run',      label: '🏃 Run / Walk' },
  { value: 'workout',  label: '💪 Workout' },
  { value: 'milestone',label: '🏅 Milestone' },
  { value: 'general',  label: '💬 General' },
];

function Avatar({ name, url, size = 36 }) {
  return url ? (
    <img src={url} alt={name} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
  ) : (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--green-soft)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.4, fontWeight:700, color:'var(--green-dark)', flexShrink:0 }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

function timeAgo(ts) {
  const s = Math.round((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s/60) + 'm ago';
  if (s < 86400) return Math.round(s/3600) + 'h ago';
  return Math.round(s/86400) + 'd ago';
}

// Isolated comment input — own state, no parent re-render on type
function CommentInput({ postId, onDone }) {
  const ref = useRef();
  const [loading, setLoading] = useState(false);

  async function submit() {
    const body = ref.current?.value?.trim();
    if (!body) return;
    setLoading(true);
    await addFeedCommentAction({ postId, body });
    ref.current.value = '';
    setLoading(false);
    onDone();
  }

  return (
    <div style={{ display:'flex', gap:8, marginTop:10 }}>
      <input ref={ref} type="text" className="field-input"
        style={{ flex:1, padding:'9px 12px', fontSize:13 }}
        placeholder="Write a comment…"
        onKeyDown={e => e.key === 'Enter' && submit()} />
      <button className="btn-primary" onClick={submit} disabled={loading}
        style={{ width:'auto', padding:'9px 14px', marginTop:0, fontSize:13 }}>
        {loading ? '…' : 'Post'}
      </button>
    </div>
  );
}

// Compose form — isolated so it never re-renders the feed
function ComposePost({ profile, userId, onPosted }) {
  const bodyRef     = useRef();
  const fileRef     = useRef();
  const [postType, setPostType]   = useState('progress');
  const [preview, setPreview]     = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [stats, setStats]         = useState({ steps:'', distance:'', duration:'' });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showStats, setShowStats] = useState(false);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const handleStatChange = useCallback((key) => (e) => {
    setStats(s => ({ ...s, [key]: e.target.value }));
  }, []);

  async function handlePost() {
    const body = bodyRef.current?.value?.trim();
    if (!body && !imageFile) { setError('Add a caption or photo'); return; }
    setError('');
    setLoading(true);

    const statsData = (stats.steps || stats.distance || stats.duration)
      ? { steps: stats.steps || null, distance: stats.distance || null, duration: stats.duration || null }
      : null;

    let imageBase64 = null;
    if (imageFile) {
      imageBase64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result.split(',')[1]);
        reader.readAsDataURL(imageFile);
      });
    }

    const result = await createFeedPostAction({
      body, postType, stats: statsData, imageBase64,
      imageName: imageFile?.name, imageType: imageFile?.type,
    });

    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    if (bodyRef.current) bodyRef.current.value = '';
    setPreview(null);
    setImageFile(null);
    setStats({ steps:'', distance:'', duration:'' });
    setShowStats(false);
    onPosted();
  }

  return (
    <div style={{ background:'#fff', borderRadius:18, padding:16, marginBottom:14,
      border:'1.5px solid var(--line)', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>

      <div style={{ display:'flex', gap:10, marginBottom:12 }}>
        <Avatar name={profile?.display_name} url={profile?.avatar_url} />
        <textarea ref={bodyRef} placeholder="Share your progress, run or milestone…"
          style={{ flex:1, border:'none', outline:'none', fontSize:14, lineHeight:1.5,
            fontFamily:'inherit', resize:'none', minHeight:70, color:'var(--ink)',
            background:'transparent' }} />
      </div>

      {/* Post type */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:12, paddingBottom:2 }}>
        {POST_TYPES.map(t => (
          <button key={t.value} onClick={() => setPostType(t.value)}
            style={{ border: postType === t.value ? '2px solid var(--green)' : '2px solid var(--line)',
              background: postType === t.value ? 'var(--green-soft)' : '#fff',
              borderRadius:999, padding:'6px 12px', fontSize:12, fontWeight:700,
              cursor:'pointer', whiteSpace:'nowrap', color: postType === t.value ? 'var(--green-dark)' : 'var(--ink-70)',
              flexShrink:0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Image preview */}
      {preview && (
        <div style={{ position:'relative', marginBottom:12 }}>
          <img src={preview} alt="preview" style={{ width:'100%', borderRadius:12, maxHeight:220, objectFit:'cover' }} />
          <button onClick={() => { setPreview(null); setImageFile(null); fileRef.current.value=''; }}
            style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.6)', border:'none',
              color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
      )}

      {/* Stats overlay fields */}
      {showStats && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
          {[['steps','Steps','👟'],['distance','Distance (km)','📍'],['duration','Duration','⏱']].map(([key,label,icon]) => (
            <div key={key}>
              <label style={{ fontSize:10, fontWeight:700, color:'var(--ink-45)', display:'block', marginBottom:3 }}>
                {icon} {label.toUpperCase()}
              </label>
              <input type="text" value={stats[key]} onChange={handleStatChange(key)}
                className="field-input" style={{ padding:'8px 10px', fontSize:13 }} placeholder="—" />
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ fontSize:13, color:'#B3261E', marginBottom:8 }}>{error}</div>}

      {/* Action bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => fileRef.current?.click()}
            style={{ background:'none', border:'1.5px solid var(--line)', borderRadius:10,
              padding:'8px 12px', fontSize:12, fontWeight:700, cursor:'pointer',
              color:'var(--ink-70)', display:'flex', alignItems:'center', gap:5 }}>
            📷 Photo
          </button>
          <button onClick={() => setShowStats(v => !v)}
            style={{ background: showStats ? 'var(--green-soft)' : 'none',
              border: showStats ? '1.5px solid var(--green)' : '1.5px solid var(--line)',
              borderRadius:10, padding:'8px 12px', fontSize:12, fontWeight:700,
              cursor:'pointer', color: showStats ? 'var(--green-dark)' : 'var(--ink-70)' }}>
            📊 Stats
          </button>
        </div>
        <button className="btn-primary" onClick={handlePost} disabled={loading}
          style={{ width:'auto', padding:'9px 18px', marginTop:0 }}>
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
    </div>
  );
}

export default function FeedClient({ posts, likedIds, userId, profile }) {
  const router = useRouter();
  const [liked, setLiked]       = useState(new Set(likedIds));
  const [commenting, setCommenting] = useState(null);
  const [toast, setToast]       = useState('');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2600); }

  async function handleLike(postId) {
    setLiked(prev => { const s = new Set(prev); s.has(postId) ? s.delete(postId) : s.add(postId); return s; });
    await toggleFeedLikeAction({ postId });
    router.refresh();
  }

  function handlePosted() {
    showToast('Posted! 🎉');
    router.refresh();
  }

  return (
    <>
      {toast && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
          background:'var(--ink)', color:'#fff', borderRadius:999, padding:'10px 18px',
          fontSize:13, fontWeight:600, zIndex:999, whiteSpace:'nowrap', pointerEvents:'none' }}>
          {toast}
        </div>
      )}

      <div className="screen-pad">
        <span className="eyebrow">Progress Feed</span>
        <h1 style={{ fontSize:22 }}>What's happening</h1>
      </div>

      <div className="screen-pad" style={{ paddingTop:8 }}>

        <ComposePost profile={profile} userId={userId} onPosted={handlePosted} />

        {posts.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🌱</div>
            <p className="subhead">No posts yet. Be the first to share your progress!</p>
          </div>
        )}

        {posts.map(post => {
          const likeCount = post.feed_likes?.[0]?.count || 0;
          const isLiked   = liked.has(post.id);
          const comments  = post.feed_comments || [];
          const stats     = post.stats;

          return (
            <div key={post.id} style={{ background:'#fff', borderRadius:18, marginBottom:12,
              border:'1.5px solid var(--line)', overflow:'hidden',
              boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 14px 10px' }}>
                <Avatar name={post.profiles?.display_name} url={post.profiles?.avatar_url} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>
                    {post.profiles?.display_name || 'Member'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink-45)' }}>
                    {timeAgo(post.created_at)}
                    {post.post_type !== 'general' && (
                      <span style={{ marginLeft:6, background:'var(--green-soft)', color:'var(--green-dark)',
                        padding:'1px 6px', borderRadius:999, fontSize:10, fontWeight:700 }}>
                        {POST_TYPES.find(t => t.value === post.post_type)?.label || post.post_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Photo */}
              {post.image_url && (
                <img src={post.image_url} alt="" style={{ width:'100%', maxHeight:300, objectFit:'cover' }} />
              )}

              {/* Stats chips */}
              {stats && (
                <div style={{ display:'flex', gap:8, padding:'10px 14px 0', flexWrap:'wrap' }}>
                  {stats.steps    && <StatChip icon="👟" label="Steps"    value={Number(stats.steps).toLocaleString()} />}
                  {stats.distance && <StatChip icon="📍" label="Distance" value={stats.distance + ' km'} />}
                  {stats.duration && <StatChip icon="⏱"  label="Time"     value={stats.duration} />}
                </div>
              )}

              {/* Body */}
              {post.body && (
                <p style={{ fontSize:14, color:'var(--ink)', lineHeight:1.55,
                  margin:0, padding:'10px 14px' }}>{post.body}</p>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:16, padding:'10px 14px',
                borderTop:'1.5px solid var(--line)', marginTop:4 }}>
                <button onClick={() => handleLike(post.id)}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600,
                    color: isLiked ? 'var(--green-dark)' : 'var(--ink-45)', padding:0 }}>
                  {isLiked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''}
                </button>
                <button onClick={() => setCommenting(commenting === post.id ? null : post.id)}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600,
                    color:'var(--ink-45)', padding:0 }}>
                  💬 {comments.length > 0 ? comments.length : 'Comment'}
                </button>
              </div>

              {/* Comments */}
              {comments.length > 0 && (
                <div style={{ padding:'0 14px 10px' }}>
                  {comments.slice(-3).map((c, i) => (
                    <div key={i} style={{ fontSize:12.5, color:'var(--ink-70)', marginTop:5 }}>
                      <strong style={{ color:'var(--ink)' }}>{c.profiles?.display_name}</strong>
                      {' '}{c.body}
                    </div>
                  ))}
                </div>
              )}

              {commenting === post.id && (
                <div style={{ padding:'0 14px 14px' }}>
                  <CommentInput postId={post.id} onDone={() => { setCommenting(null); router.refresh(); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

const StatChip = ({ icon, label, value }) => (
  <div style={{ background:'var(--green-soft)', borderRadius:10, padding:'6px 10px',
    display:'flex', flexDirection:'column', alignItems:'center', minWidth:64 }}>
    <span style={{ fontSize:16 }}>{icon}</span>
    <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{value}</span>
    <span style={{ fontSize:9, color:'var(--ink-45)', fontWeight:600, letterSpacing:.5 }}>{label.toUpperCase()}</span>
  </div>
);
