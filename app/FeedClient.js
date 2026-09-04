'use client';

import Link from 'next/link';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createFeedPostAction, toggleFeedLikeAction, addFeedCommentAction } from './feed-actions';

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
    x: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.9 7.6-4.5M8.2 13.1l7.6 4.5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Avatar({ name, url, size = 40, href }) {
  const avatar = url ? (
    <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: 'var(--green-dark)', flexShrink: 0 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
  if (!href) return avatar;
  return <Link href={href} aria-label={`View ${name || 'member'} profile`} style={{ display: 'block', lineHeight: 0 }}>{avatar}</Link>;
}

function timeAgo(ts) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(ts)) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function StatChip({ label, value }) {
  return <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '7px 9px', background: 'var(--paper)', minWidth: 88 }}><div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 800, color: 'var(--ink-45)' }}>{label}</div><div className="mono" style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{value}</div></div>;
}

async function prepareImage(file) {
  const maxSide = 1600;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob); });
  return { base64, name: `${file.name.replace(/\.[^.]+$/, '')}.jpg`, type: 'image/jpeg' };
}

function CommentInput({ postId, onDone }) {
  const ref = useRef(null);
  const [loading, setLoading] = useState(false);
  async function submit() {
    const body = ref.current?.value?.trim();
    if (!body || loading) return;
    setLoading(true);
    const result = await addFeedCommentAction({ postId, body });
    setLoading(false);
    if (result?.error) return;
    ref.current.value = '';
    onDone();
  }
  return <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><input ref={ref} className="field-input" type="text" placeholder="Write a comment" style={{ flex: 1, padding: '9px 12px', fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && submit()} /><button className="btn-secondary" onClick={submit} disabled={loading} style={{ width: 'auto', padding: '9px 14px', marginTop: 0, fontSize: 13 }}>{loading ? 'Posting…' : 'Post'}</button></div>;
}

function ComposePost({ profile, onPosted }) {
  const bodyRef = useRef(null);
  const fileRef = useRef(null);
  const [postType, setPostType] = useState('progress');
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [stats, setStats] = useState({ steps: '', distance: '', duration: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStats, setShowStats] = useState(false);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    setError(''); setPreview(URL.createObjectURL(file)); prepareImage(file).then(setImageData).catch(() => setError('Could not prepare that photo.'));
  }
  const handleStatChange = useCallback((key) => (e) => setStats(current => ({ ...current, [key]: e.target.value })), []);
  async function handlePost() {
    const body = bodyRef.current?.value?.trim();
    if (!body && !imageData) { setError('Add a caption or photo before posting.'); return; }
    setLoading(true); setError('');
    const statsData = (stats.steps || stats.distance || stats.duration) ? { steps: stats.steps || null, distance: stats.distance || null, duration: stats.duration || null } : null;
    const result = await createFeedPostAction({ body, postType, stats: statsData, imageBase64: imageData?.base64 || null, imageName: imageData?.name || null, imageType: imageData?.type || null });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    if (bodyRef.current) bodyRef.current.value = '';
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null); setImageData(null); setStats({ steps: '', distance: '', duration: '' }); setShowStats(false); if (fileRef.current) fileRef.current.value = ''; onPosted();
  }

  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, border: '1.5px solid var(--line)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}><Avatar name={profile?.display_name} url={profile?.avatar_url} /><textarea ref={bodyRef} placeholder="Share your progress with the community…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit', resize: 'none', minHeight: 72, color: 'var(--ink)', background: 'transparent' }} /></div>

      <div className="feed-post-type-selector">
        {POST_TYPES.map(type => <button key={type.value} onClick={() => setPostType(type.value)} aria-pressed={postType === type.value} style={{ border: postType === type.value ? '1.5px solid var(--green)' : '1.5px solid var(--line)', background: postType === type.value ? 'var(--green-soft)' : '#fff', borderRadius: 11, padding: '7px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: postType === type.value ? 'var(--green-dark)' : 'var(--ink-70)' }}>{type.label}</button>)}
      </div>

      {preview && <div style={{ position: 'relative', marginBottom: 12 }}><img src={preview} alt="Selected photo" style={{ width: '100%', borderRadius: 12, maxHeight: 280, objectFit: 'cover' }} /><button onClick={() => { URL.revokeObjectURL(preview); setPreview(null); setImageData(null); if (fileRef.current) fileRef.current.value = ''; }} aria-label="Remove photo" style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="x" size={16} /></button></div>}

      {showStats && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>{[['steps', 'Steps'], ['distance', 'Distance (km)'], ['duration', 'Duration']].map(([key, label]) => <div key={key}><label style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-45)', display: 'block', marginBottom: 3 }}>{label.toUpperCase()}</label><input className="field-input" type="text" value={stats[key]} onChange={handleStatChange(key)} style={{ padding: '8px 10px', fontSize: 13 }} placeholder="—" /></div>)}</div>}
      {error && <div style={{ fontSize: 13, color: '#B3261E', marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><div style={{ display: 'flex', gap: 8 }}><button onClick={() => fileRef.current?.click()} className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="image" size={16} /> Photo</button><button onClick={() => setShowStats(value => !value)} className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: 6, background: showStats ? 'var(--green-soft)' : undefined }}><Icon name="chart" size={16} /> Activity</button></div><button className="btn-primary" onClick={handlePost} disabled={loading} style={{ width: 'auto', padding: '9px 18px', marginTop: 0 }}>{loading ? 'Posting…' : 'Post'}</button></div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

function EmptyState() { return <div style={{ textAlign: 'center', padding: '38px 20px', background: '#fff', borderRadius: 18, border: '1.5px solid var(--line)' }}><div style={{ width: 44, height: 44, margin: '0 auto 12px', borderRadius: 12, background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="image" size={21} /></div><div style={{ fontWeight: 800, marginBottom: 5 }}>Start the conversation</div><p className="subhead" style={{ margin: 0 }}>Share a workout, walk, milestone or photo with the community.</p></div>; }

export default function FeedClient({ posts, likedIds, userId, profile }) {
  const router = useRouter();
  const [liked, setLiked] = useState(new Set(likedIds));
  const [commenting, setCommenting] = useState(null);
  const [toast, setToast] = useState('');
  function showToast(message) { setToast(message); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => setToast(''), 2200); }
  async function handleLike(postId) {
    const wasLiked = liked.has(postId);
    setLiked(current => { const next = new Set(current); if (next.has(postId)) next.delete(postId); else next.add(postId); return next; });
    const result = await toggleFeedLikeAction({ postId, like: !wasLiked });
    if (result?.error) { setLiked(current => { const next = new Set(current); if (wasLiked) next.add(postId); else next.delete(postId); return next; }); showToast(result.error); return; }
    router.refresh();
  }
  async function refreshComments() { setCommenting(null); router.refresh(); }
  return <div className="screen-pad"><span className="eyebrow">Community</span><h1>Progress feed</h1><p className="subhead">Share movement, milestones and everyday wins with the Hub.</p><ComposePost profile={profile} onPosted={() => { showToast('Posted'); router.refresh(); }} />{posts?.length ? posts.map(post => <article key={post.id} className="feed-card"><div className="feed-card-head"><Avatar name={post.profiles?.display_name} url={post.profiles?.avatar_url} href={`/member/${post.user_id}`} /><div style={{ flex: 1, minWidth: 0 }}><Link href={`/member/${post.user_id}`} className="feed-author">{post.profiles?.display_name || 'Member'}</Link><div className="feed-meta">{timeAgo(post.created_at)}</div></div></div>{post.body && <div className="feed-body">{post.body}</div>}{post.image_url && <img className="feed-image" src={post.image_url} alt="" />}{post.stats && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{post.stats.steps && <StatChip label="Steps" value={post.stats.steps} />}{post.stats.distance && <StatChip label="Distance" value={`${post.stats.distance} km`} />}{post.stats.duration && <StatChip label="Duration" value={post.stats.duration} />}</div>}<div className="feed-actions"><button type="button" onClick={() => handleLike(post.id)} aria-label={liked.has(post.id) ? 'Unlike post' : 'Like post'}><Icon name="heart" size={19} strokeWidth={liked.has(post.id) ? 2.3 : 1.8} /> <span>{post.like_count || 0}</span></button><button type="button" onClick={() => setCommenting(commenting === post.id ? null : post.id)}><Icon name="message" size={19} /> <span>{post.comment_count || 0}</span></button></div>{commenting === post.id && <CommentInput postId={post.id} onDone={refreshComments} />}</article>) : <EmptyState />}{toast && <div style={{ position: 'fixed', left: '50%', bottom: 84, transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', padding: '9px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, zIndex: 30 }}>{toast}</div>}</div>;
}