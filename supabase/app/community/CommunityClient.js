'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPostAction, toggleLikeAction, addCommentAction } from '@/app/movement-actions';

export default function CommunityClient({ posts, likedIds, userId, profile }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [liked, setLiked] = useState(new Set(likedIds));
  const [newPost, setNewPost] = useState('');
  const [commenting, setCommenting] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [toast, setToast] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800); }

  function handleLike(postId) {
    start(async () => {
      const wasLiked = liked.has(postId);
      setLiked(prev => { const s = new Set(prev); wasLiked ? s.delete(postId) : s.add(postId); return s; });
      await toggleLikeAction({ postId });
      router.refresh();
    });
  }

  function handlePost() {
    if (!newPost.trim()) return;
    start(async () => {
      const r = await createPostAction({ body: newPost });
      if (r?.error) { showToast(r.error); return; }
      setNewPost('');
      setShowCompose(false);
      showToast('Posted!');
      router.refresh();
    });
  }

  function handleComment(postId) {
    if (!commentText.trim()) return;
    start(async () => {
      await addCommentAction({ postId, body: commentText });
      setCommentText('');
      setCommenting(null);
      router.refresh();
    });
  }

  function timeAgo(ts) {
    const s = Math.round((Date.now() - new Date(ts)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s/60) + 'm ago';
    if (s < 86400) return Math.round(s/3600) + 'h ago';
    return Math.round(s/86400) + 'd ago';
  }

  return (
    <>
      {toast && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
          background:'var(--ink)', color:'#fff', borderRadius:999, padding:'10px 18px',
          fontSize:13, fontWeight:600, zIndex:999, whiteSpace:'nowrap', pointerEvents:'none' }}>{toast}</div>
      )}

      <div className="screen-pad">
        <span className="eyebrow">Community</span>
        <h1 style={{ fontSize: 22 }}>Moving together.</h1>
      </div>

      <div className="screen-pad" style={{ paddingTop: 4 }}>

        {/* Compose */}
        {showCompose ? (
          <div style={{ background:'#fff', borderRadius:16, padding:16, marginBottom:14,
            border:'2px solid var(--green)' }}>
            <textarea
              value={newPost} onChange={e => setNewPost(e.target.value)}
              placeholder="Share a milestone, thought, or encouragement…"
              style={{ width:'100%', border:'none', outline:'none', fontSize:14, lineHeight:1.5,
                fontFamily:'inherit', resize:'none', minHeight:80, color:'var(--ink)' }}
            />
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button className="btn-primary" style={{ flex:1, marginTop:0 }}
                onClick={handlePost} disabled={isPending || !newPost.trim()}>
                {isPending ? 'Posting…' : 'Post'}
              </button>
              <button className="btn-secondary" style={{ flex:1, marginTop:0 }}
                onClick={() => { setShowCompose(false); setNewPost(''); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCompose(true)} style={{
            width:'100%', background:'#fff', border:'2px solid var(--line)', borderRadius:16,
            padding:'14px 16px', textAlign:'left', fontSize:14, color:'var(--ink-45)',
            cursor:'pointer', marginBottom:14, fontFamily:'inherit',
          }}>
            Share a milestone or encourage the community…
          </button>
        )}

        {/* Posts */}
        {posts.length === 0 && (
          <p className="disclaimer">No posts yet — be the first to share something!</p>
        )}

        {posts.map(post => {
          const likeCount = post.post_likes?.[0]?.count || 0;
          const isLiked = liked.has(post.id);
          const comments = post.post_comments || [];
          const isAchievement = post.post_type === 'milestone';

          return (
            <div key={post.id} style={{ background:'#fff', borderRadius:16, padding:16,
              marginBottom:12, border:'1.5px solid var(--line)' }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--green-soft)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700, color:'var(--green-dark)', flexShrink:0 }}>
                  {(post.profiles?.display_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>
                    {post.profiles?.display_name || 'Member'}
                    {isAchievement && <span style={{ marginLeft:6, fontSize:11,
                      background:'var(--green-soft)', color:'var(--green-dark)',
                      padding:'2px 7px', borderRadius:999, fontWeight:700 }}>Achievement</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink-45)' }}>{timeAgo(post.created_at)}</div>
                </div>
              </div>

              {/* Body */}
              <p style={{ fontSize:14, color:'var(--ink)', lineHeight:1.55, margin:0 }}>{post.body}</p>

              {/* Actions */}
              <div style={{ display:'flex', gap:16, marginTop:12, paddingTop:10,
                borderTop:'1.5px solid var(--line)' }}>
                <button onClick={() => handleLike(post.id)} style={{
                  background:'none', border:'none', cursor:'pointer', display:'flex',
                  alignItems:'center', gap:5, fontSize:13, fontWeight:600,
                  color: isLiked ? 'var(--green-dark)' : 'var(--ink-45)', padding:0,
                }}>
                  {isLiked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''}
                </button>
                <button onClick={() => setCommenting(commenting === post.id ? null : post.id)} style={{
                  background:'none', border:'none', cursor:'pointer', display:'flex',
                  alignItems:'center', gap:5, fontSize:13, fontWeight:600,
                  color:'var(--ink-45)', padding:0,
                }}>
                  💬 {comments.length > 0 ? comments.length : 'Comment'}
                </button>
              </div>

              {/* Comments */}
              {comments.length > 0 && (
                <div style={{ marginTop:10 }}>
                  {comments.slice(-3).map((c, i) => (
                    <div key={i} style={{ fontSize:12.5, color:'var(--ink-70)', marginTop:6 }}>
                      <strong style={{ color:'var(--ink)' }}>{c.profiles?.display_name}</strong>
                      {' '}{c.body}
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {commenting === post.id && (
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <input className="field-input" style={{ flex:1, padding:'9px 12px', fontSize:13 }}
                    placeholder="Write a comment…" value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleComment(post.id)} />
                  <button className="btn-primary" style={{ width:'auto', padding:'9px 14px', marginTop:0, fontSize:13 }}
                    onClick={() => handleComment(post.id)} disabled={isPending}>
                    Post
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
