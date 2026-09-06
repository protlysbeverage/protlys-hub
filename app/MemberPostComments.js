'use client';

import { useState } from 'react';
import { addFeedCommentAction, getFeedCommentsAction } from './feed-actions';

function Avatar({ name, url }) {
  if (url) return <img src={url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }} />;
  return <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--green-dark)', flexShrink: 0 }}>{(name || '?')[0].toUpperCase()}</div>;
}

function timeAgo(value) {
  const raw = String(value || '');
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short' }).format(date);
}

export default function MemberPostComments({ postId, initialCount = 0 }) {
  const [comments, setComments] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');

  async function load() {
    if (loading) return;
    setLoading(true); setError('');
    const result = await getFeedCommentsAction({ postId });
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setComments(result.comments || []);
  }

  async function ensureLoaded() {
    if (comments === null) await load();
  }

  async function submit() {
    const clean = body.trim();
    if (!clean || posting) return;
    setPosting(true); setError('');
    const result = await addFeedCommentAction({ postId, body: clean });
    if (result?.error) { setError(result.error); setPosting(false); return; }
    setBody('');
    const refreshed = await getFeedCommentsAction({ postId });
    setPosting(false);
    if (refreshed?.error) { setError(refreshed.error); return; }
    setComments(refreshed.comments || []);
    setExpanded(true);
  }

  const visible = expanded ? (comments || []) : (comments || []).slice(-3);
  const hiddenCount = Math.max(0, (comments || []).length - 3);

  if (initialCount === 0 && comments === null) {
    return <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}><button onClick={ensureLoaded} disabled={loading} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--ink-60)', font: 'inherit', fontSize: 12, cursor: 'pointer' }}>{loading ? 'Loading comments…' : 'Be the first to comment'}</button></div>;
  }

  return <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
    {comments === null ? <button onClick={ensureLoaded} disabled={loading} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--ink-60)', font: 'inherit', fontSize: 12, cursor: 'pointer' }}>{loading ? 'Loading comments…' : `${initialCount} ${initialCount === 1 ? 'comment' : 'comments'}`}</button> : <>
      {error && <div style={{ color: '#B3261E', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      {visible.map(comment => <div key={comment.id} style={{ display: 'flex', gap: 8, marginBottom: 9 }}><Avatar name={comment.profiles?.display_name} url={comment.profiles?.avatar_url} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 12, lineHeight: 1.35 }}><strong>{comment.profiles?.display_name || 'Member'}</strong><span style={{ color: 'var(--ink-45)', marginLeft: 6, fontSize: 10.5 }}>{timeAgo(comment.created_at)}</span></div><div style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.body}</div></div></div>)}
      {!expanded && hiddenCount > 0 && <button onClick={() => setExpanded(true)} style={{ border: 0, background: 'transparent', padding: '1px 0 5px', color: 'var(--ink-60)', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View {hiddenCount} more {hiddenCount === 1 ? 'comment' : 'comments'}</button>}
      {expanded && comments.length > 3 && <button onClick={() => setExpanded(false)} style={{ border: 0, background: 'transparent', padding: '1px 0 5px', color: 'var(--ink-60)', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Show less</button>}
      <div style={{ display: 'flex', gap: 8, marginTop: 7 }}><input value={body} onChange={e => setBody(e.target.value)} onFocus={ensureLoaded} onKeyDown={e => e.key === 'Enter' && submit()} className="field-input" placeholder="Add a comment…" style={{ flex: 1, minWidth: 0, padding: '8px 11px', fontSize: 12.5 }} /><button onClick={submit} disabled={posting || !body.trim()} className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', marginTop: 0, fontSize: 12 }}>{posting ? 'Posting…' : 'Post'}</button></div>
    </>}
  </div>;
}
