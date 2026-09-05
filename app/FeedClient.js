'use client';

import Link from 'next/link';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  createFeedPostAction,
  updateFeedPostAction,
  deleteFeedPostAction,
  getFeedCommentsAction,
  toggleFeedLikeAction,
  addFeedCommentAction,
} from './feed-actions';

const POST_TYPES = [
  { value: 'progress', label: 'Progress' },
  { value: 'run', label: 'Run / Walk' },
  { value: 'workout', label: 'Workout' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'general', label: 'Post' },
];

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const paths = {
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="M3 16l5-5 4 4 3-3 6 6" /></>,
    chart: <><path d="M4 19V10" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
    heart: <path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8.8 1.4Z" />,
    message: <path d="M20 11.5a7.5 7.5 0 0 1-7.7 7.5 8.5 8.5 0 0 1-3.4-.7L4 20l1.3-3.7A7.2 7.2 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5h.5A7.5 7.5 0 0 1 20 11.5Z" />,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.9 7.6-4.5M8.2 13.1l7.6 4.5" /></>,
    more: <><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    x: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Avatar({ name, url, size = 40, href }) {
  const avatar = url
    ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: 'var(--green-dark)', flexShrink: 0 }}>{(name || '?')[0].toUpperCase()}</div>;
  if (!href) return avatar;
  return <Link href={href} aria-label={`View ${name || 'member'} profile`} style={{ display: 'block', lineHeight: 0 }}>{avatar}</Link>;
}

function parseProtlysDate(value) {
  if (!value) return null;
  const raw = String(value);
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeAgo(ts) {
  const date = parseProtlysDate(ts);
  if (!date) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 172800) return 'Yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short' }).format(date);
}

function StatChip({ label, value }) {
  return <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '7px 9px', background: 'var(--paper)', minWidth: 88 }}><div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 800, color: 'var(--ink-45)' }}>{label}</div><div className="mono" style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{value}</div></div>;
}

async function prepareImage(file) {
  const maxSide = 1600;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob); });
  return { base64, name: `${file.name.replace(/\.[^.]+$/, '')}.jpg`, type: 'image/jpeg' };
}

function CommentInput({ postId, onDone }) {
  const ref = useRef(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function submit() {
    const body = ref.current?.value?.trim(); if (!body || loading) return;
    setLoading(true); setError(''); const result = await addFeedCommentAction({ postId, body }); setLoading(false);
    if (result?.error) { setError(result.error); return; }
    ref.current.value = ''; onDone();
  }
  return <div style={{ marginTop: 12 }}><div style={{ display: 'flex', gap: 8 }}><input ref={ref} className="field-input" type="text" placeholder="Write a comment" style={{ flex: 1, padding: '9px 12px', fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && submit()} /><button className="btn-secondary" onClick={submit} disabled={loading} style={{ width: 'auto', padding: '9px 14px', marginTop: 0, fontSize: 13 }}>{loading ? 'Posting…' : 'Post'}</button></div>{error && <div style={{ color: '#B3261E', fontSize: 12, marginTop: 6 }}>{error}</div>}</div>;
}

function CommentsPanel({ postId, initialCount, onCommented }) {
  const [comments, setComments] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function loadComments() {
    setLoading(true); setError(''); const result = await getFeedCommentsAction({ postId }); setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setComments(result.comments || []);
  }
  if (comments === null) return <button onClick={loadComments} className="btn-secondary" disabled={loading} style={{ width: 'auto', padding: '6px 0', border: 'none', background: 'transparent', color: 'var(--ink-60)', fontSize: 12, marginTop: 0 }}>{loading ? 'Loading comments…' : `${initialCount || 0} ${initialCount === 1 ? 'comment' : 'comments'}`}</button>;
  return <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><strong style={{ fontSize: 13 }}>Comments</strong><button onClick={() => setComments(null)} aria-label="Hide comments" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-45)' }}><Icon name="x" size={15} /></button></div>
    {error && <div style={{ color: '#B3261E', fontSize: 12, marginBottom: 8 }}>{error}</div>}
    {!error && comments.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-45)', padding: '6px 0' }}>No comments yet. Start the conversation.</div>}
    {comments.map(comment => <div key={comment.id} style={{ display: 'flex', gap: 9, marginBottom: 10 }}><Avatar name={comment.profiles?.display_name} url={comment.profiles?.avatar_url} size={30} href={`/member/${comment.user_id}`} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 800 }}>{comment.profiles?.display_name || 'Member'} <span style={{ color: 'var(--ink-45)', fontWeight: 500, marginLeft: 5 }}>{timeAgo(comment.created_at)}</span></div><div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.body}</div></div></div>)}
    <CommentInput postId={postId} onDone={async () => { await loadComments(); onCommented?.(); }} />
  </div>;
}

function EditPost({ post, onDone, onCancel, onToast }) {
  const bodyRef = useRef(null); const fileRef = useRef(null);
  const [body, setBody] = useState(post.body || ''); const [postType, setPostType] = useState(post.post_type || 'general');
  const [stats, setStats] = useState({ steps: post.stats?.steps || '', distance: post.stats?.distance || '', duration: post.stats?.duration || '' });
  const [removeImage, setRemoveImage] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  async function save() {
    if (!body.trim() && !post.image_url) { setError('Add some text or keep a photo on the post.'); return; }
    setLoading(true); setError('');
    const statsData = (stats.steps || stats.distance || stats.duration) ? { steps: stats.steps || null, distance: stats.distance || null, duration: stats.duration || null } : null;
    const result = await updateFeedPostAction({ postId: post.id, body, postType, stats: statsData, removeImage });
    setLoading(false); if (result?.error) { setError(result.error); return; }
    onToast('Post updated'); onDone();
  }
  return <div style={{ marginTop: 12, padding: 14, border: '1px solid var(--line)', borderRadius: 14, background: 'var(--paper)' }}>
    <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)} className="field-input" style={{ width: '100%', minHeight: 86, resize: 'vertical', padding: 10, fontFamily: 'inherit', marginBottom: 10 }} placeholder="Edit your post…" />
    <div className="feed-post-type-selector" style={{ marginBottom: 10 }}>{POST_TYPES.map(type => <button key={type.value} onClick={() => setPostType(type.value)} aria-pressed={postType === type.value} style={{ border: postType === type.value ? '1.5px solid var(--green)' : '1.5px solid var(--line)', background: postType === type.value ? 'var(--green-soft)' : '#fff', borderRadius: 11, padding: '7px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: postType === type.value ? 'var(--green-dark)' : 'var(--ink-70)' }}>{type.label}</button>)}</div>
    {post.image_url && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, fontSize: 12 }}><span>Photo attached</span><button className="btn-secondary" onClick={() => setRemoveImage(v => !v)} style={{ width: 'auto', padding: '7px 10px', marginTop: 0 }}>{removeImage ? 'Keep photo' : 'Remove photo'}</button></div>}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>{[['steps', 'Steps'], ['distance', 'Distance (km)'], ['duration', 'Duration']].map(([key, label]) => <div key={key}><label style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-45)', display: 'block', marginBottom: 3 }}>{label.toUpperCase()}</label><input className="field-input" value={stats[key]} onChange={e => setStats(s => ({ ...s, [key]: e.target.value }))} style={{ padding: '8px 10px', fontSize: 13 }} placeholder="—" /></div>)}</div>
    {error && <div style={{ color: '#B3261E', fontSize: 12, marginBottom: 8 }}>{error}</div>}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button className="btn-secondary" onClick={onCancel} disabled={loading} style={{ width: 'auto', padding: '8px 13px', marginTop: 0 }}>Cancel</button><button className="btn-primary" onClick={save} disabled={loading} style={{ width: 'auto', padding: '8px 15px', marginTop: 0 }}>{loading ? 'Saving…' : 'Save changes'}</button></div>
    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} />
  </div>;
}

function ComposePost({ profile, onPosted }) {
  const bodyRef = useRef(null); const fileRef = useRef(null); const [postType, setPostType] = useState('progress'); const [preview, setPreview] = useState(null); const [imageData, setImageData] = useState(null); const [stats, setStats] = useState({ steps: '', distance: '', duration: '' }); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [showStats, setShowStats] = useState(false);
  function handleFile(e) { const file = e.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; } setError(''); setPreview(URL.createObjectURL(file)); prepareImage(file).then(setImageData).catch(() => setError('Could not prepare that photo.')); }
  const handleStatChange = useCallback(key => e => setStats(current => ({ ...current, [key]: e.target.value })), []);
  async function handlePost() { const body = bodyRef.current?.value?.trim(); if (!body && !imageData) { setError('Add a caption or photo before posting.'); return; } setLoading(true); setError(''); const statsData = (stats.steps || stats.distance || stats.duration) ? { steps: stats.steps || null, distance: stats.distance || null, duration: stats.duration || null } : null; const result = await createFeedPostAction({ body, postType, stats: statsData, imageBase64: imageData?.base64 || null, imageName: imageData?.name || null, imageType: imageData?.type || null }); setLoading(false); if (result?.error) { setError(result.error); return; } if (bodyRef.current) bodyRef.current.value = ''; if (preview) URL.revokeObjectURL(preview); setPreview(null); setImageData(null); setStats({ steps: '', distance: '', duration: '' }); setShowStats(false); if (fileRef.current) fileRef.current.value = ''; onPosted(); }
  return <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, border: '1.5px solid var(--line)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}><div style={{ display: 'flex', gap: 10, marginBottom: 12 }}><Avatar name={profile?.display_name} url={profile?.avatar_url} /><textarea ref={bodyRef} placeholder="Share your progress with the community…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit', resize: 'none', minHeight: 72, color: 'var(--ink)', background: 'transparent' }} /></div><div className="feed-post-type-selector">{POST_TYPES.map(type => <button key={type.value} onClick={() => setPostType(type.value)} aria-pressed={postType === type.value} style={{ border: postType === type.value ? '1.5px solid var(--green)' : '1.5px solid var(--line)', background: postType === type.value ? 'var(--green-soft)' : '#fff', borderRadius: 11, padding: '7px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: postType === type.value ? 'var(--green-dark)' : 'var(--ink-70)' }}>{type.label}</button>)}</div>{preview && <div style={{ position: 'relative', marginBottom: 12 }}><img src={preview} alt="Selected photo" style={{ width: '100%', borderRadius: 12, maxHeight: 280, objectFit: 'cover' }} /><button onClick={() => { URL.revokeObjectURL(preview); setPreview(null); setImageData(null); if (fileRef.current) fileRef.current.value = ''; }} aria-label="Remove photo" style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="x" size={16} /></button></div>}{showStats && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>{[['steps', 'Steps'], ['distance', 'Distance (km)'], ['duration', 'Duration']].map(([key, label]) => <div key={key}><label style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-45)', display: 'block', marginBottom: 3 }}>{label.toUpperCase()}</label><input className="field-input" type="text" value={stats[key]} onChange={handleStatChange(key)} style={{ padding: '8px 10px', fontSize: 13 }} placeholder="—" /></div>)}</div>}{error && <div style={{ fontSize: 13, color: '#B3261E', marginBottom: 10 }}>{error}</div>}<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><div style={{ display: 'flex', gap: 8 }}><button onClick={() => fileRef.current?.click()} className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="image" size={16} /> Photo</button><button onClick={() => setShowStats(value => !value)} className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: 6, background: showStats ? 'var(--green-soft)' : undefined }}><Icon name="chart" size={16} /> Activity</button></div><button className="btn-primary" onClick={handlePost} disabled={loading} style={{ width: 'auto', padding: '9px 18px', marginTop: 0 }}>{loading ? 'Posting…' : 'Post'}</button></div><input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} /></div>;
}

function EmptyState() { return <div style={{ textAlign: 'center', padding: '38px 20px', background: '#fff', borderRadius: 18, border: '1.5px solid var(--line)' }}><div style={{ width: 44, height: 44, margin: '0 auto 12px', borderRadius: 12, background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="image" size={21} /></div><div style={{ fontWeight: 800, marginBottom: 5 }}>Start the conversation</div><p className="subhead" style={{ margin: 0 }}>Share a workout, walk, milestone or photo with the community.</p></div>; }

export default function FeedClient({ posts, likedIds, userId, profile }) {
  const router = useRouter(); const [liked, setLiked] = useState(new Set(likedIds)); const [editing, setEditing] = useState(null); const [menu, setMenu] = useState(null); const [toast, setToast] = useState('');
  function showToast(message) { setToast(message); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => setToast(''), 2200); }
  async function handleLike(postId) { const wasLiked = liked.has(postId); setLiked(current => { const next = new Set(current); if (next.has(postId)) next.delete(postId); else next.add(postId); return next; }); const result = await toggleFeedLikeAction({ postId }); if (result?.error) { setLiked(current => { const next = new Set(current); if (wasLiked) next.add(postId); else next.delete(postId); return next; }); showToast(result.error); return; } router.refresh(); }
  async function handleDelete(post) { setMenu(null); if (!window.confirm('Delete this post? This will also remove its photo and comments.')) return; const result = await deleteFeedPostAction({ postId: post.id }); if (result?.error) { showToast(result.error); return; } showToast('Post deleted'); router.refresh(); }
  async function handleShare(post) { const url = `${window.location.origin}/?post=${encodeURIComponent(post.id)}`; const author = post.profiles?.display_name || 'A Protlys member'; const text = post.body ? `${author} on Protlys: ${post.body}` : `${author} shared a post on Protlys.`; try { if (navigator.share) { await navigator.share({ title: 'Protlys community', text, url }); showToast('Shared'); } else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); showToast('Link copied'); } else window.prompt('Copy this Protlys link', url); } catch (error) { if (error?.name !== 'AbortError') showToast('Could not share this post'); } }
  return <div className="screen-pad"><span className="eyebrow">Community</span><h1>Progress feed</h1><p className="subhead">Share movement, milestones and everyday wins with the Hub.</p><ComposePost profile={profile} onPosted={() => { showToast('Posted'); router.refresh(); }} />{posts?.length ? posts.map(post => <article key={post.id} className="feed-card"><div className="feed-card-head"><Avatar name={post.profiles?.display_name} url={post.profiles?.avatar_url} href={`/member/${post.user_id}`} /><div style={{ flex: 1, minWidth: 0 }}><Link href={`/member/${post.user_id}`} className="feed-author" aria-label={`View ${post.profiles?.display_name || 'member'} profile`}>{post.profiles?.display_name || 'Member'}</Link><div className="feed-meta">{timeAgo(post.created_at)}</div></div>{post.user_id === userId && <div style={{ position: 'relative' }}><button onClick={() => setMenu(menu === post.id ? null : post.id)} aria-label="Post options" className="btn-secondary" style={{ width: 34, height: 34, padding: 0, marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}><Icon name="more" size={17} /></button>{menu === post.id && <div style={{ position: 'absolute', right: 0, top: 40, zIndex: 10, width: 150, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: 5 }}><button onClick={() => { setEditing(post.id); setMenu(null); }} style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'center', padding: '9px 10px', border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 8, font: 'inherit', textAlign: 'left' }}><Icon name="edit" size={15} /> Edit post</button><button onClick={() => handleDelete(post)} style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'center', padding: '9px 10px', border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 8, font: 'inherit', textAlign: 'left', color: '#B3261E' }}><Icon name="trash" size={15} /> Delete post</button></div>}</div>}</div>{editing === post.id ? <EditPost post={post} onDone={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} onToast={showToast} /> : <><div className="feed-card-body">{post.body && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{post.body}</p>}{post.image_url && <img src={post.image_url} alt="Post photo" style={{ width: '100%', borderRadius: 14, maxHeight: 520, objectFit: 'cover', marginTop: post.body ? 10 : 0 }} />}{post.stats && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>{post.stats.steps && <StatChip label="Steps" value={post.stats.steps} />}{post.stats.distance && <StatChip label="Distance" value={`${post.stats.distance} km`} />}{post.stats.duration && <StatChip label="Duration" value={post.stats.duration} />}</div>}</div><div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}><button onClick={() => handleLike(post.id)} className="btn-secondary" style={{ width: 'auto', padding: '5px 0', border: 'none', background: 'transparent', marginTop: 0, display: 'flex', alignItems: 'center', gap: 6, color: liked.has(post.id) ? 'var(--green-dark)' : 'var(--ink-60)' }}><Icon name="heart" size={17} /> {post.like_count || 0}</button><CommentsPanel postId={post.id} initialCount={post.comment_count || 0} onCommented={() => router.refresh()} /><button onClick={() => handleShare(post)} className="btn-secondary" style={{ width: 'auto', padding: '5px 0', border: 'none', background: 'transparent', marginTop: 0, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-60)' }}><Icon name="share" size={17} /> Share</button></div></>}</article>) : <EmptyState />}{toast && <div style={{ position: 'fixed', left: '50%', bottom: 84, transform: 'translateX(-50%)', zIndex: 100, background: 'var(--ink)', color: '#fff', borderRadius: 999, padding: '10px 16px', fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>{toast}</div>}</div>;
}
