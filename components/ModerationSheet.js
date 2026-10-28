'use client';

import { useEffect, useState } from 'react';
import { blockUserAction, createReportAction } from '@/app/moderation-actions';

export const REPORT_REASONS = [
  ['spam', 'Spam'],
  ['harassment/bullying', 'Harassment / bullying'],
  ['hate/abusive', 'Hate / abusive'],
  ['inappropriate/sexual', 'Inappropriate / sexual'],
  ['impersonation', 'Impersonation'],
  ['misleading health advice', 'Misleading health advice'],
  ['other', 'Other'],
];

export default function ModerationSheet({
  open,
  onClose,
  mode = 'report',
  reportedUserId,
  reportedUsername = 'this member',
  contentType = 'profile',
  contentId,
  contentSnapshot = null,
  allowBlock = true,
  onBlocked,
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
      setDetails('');
      setBusy(false);
      setSubmitted(false);
      setDuplicate(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function submitReport() {
    if (!reason || busy) return;
    setBusy(true);
    setError('');
    const result = await createReportAction({
      reportedUserId,
      contentType,
      contentId,
      reason,
      details,
      contentSnapshot,
    });
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setDuplicate(Boolean(result?.duplicate));
    setSubmitted(true);
  }

  async function blockNow() {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await blockUserAction({ blockedUserId: reportedUserId });
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onBlocked?.(reportedUserId);
    onClose?.();
  }

  async function reportAndBlock() {
    await blockNow();
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:30000, background:'rgba(0,0,0,.52)', display:'flex', alignItems:'flex-end' }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'block' ? 'Block member' : 'Report content'}
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:620, margin:'0 auto', background:'var(--paper)', color:'var(--ink)', borderRadius:'22px 22px 0 0', padding:'12px 16px calc(20px + env(safe-area-inset-bottom))', maxHeight:'88dvh', overflowY:'auto' }}
      >
        <div style={{ width:40,height:4,borderRadius:99,background:'var(--ink-20)',margin:'0 auto 15px' }} />
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:10 }}>
          <div>
            <div className="eyebrow">{mode === 'block' ? 'Privacy' : 'Safety'}</div>
            <h2 style={{ margin:'4px 0 0',fontSize:21 }}>{mode === 'block' ? `Block ${reportedUsername}?` : 'Report content'}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width:44,height:44,border:'1px solid var(--line)',borderRadius:'50%',background:'var(--white)',color:'var(--ink)',fontSize:22 }}>×</button>
        </div>

        {mode === 'block' ? (
          <>
            <p style={{ fontSize:13,lineHeight:1.5,color:'var(--ink-70)',marginTop:12 }}>
              They won't be notified. Their profile, posts, comments, chat messages and leaderboard entry will be hidden from you.
            </p>
            {error && <div role="alert" style={{ marginTop:10,color:'#B3261E',fontSize:12 }}>{error}</div>}
            <button type="button" className="btn-primary" disabled={busy} onClick={blockNow} style={{ width:'100%',marginTop:14 }}>{busy ? 'Blocking…' : 'Block'}</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={onClose} style={{ width:'100%',marginTop:8 }}>Cancel</button>
          </>
        ) : submitted ? (
          <>
            <div style={{ marginTop:16,padding:14,borderRadius:14,background:'var(--green-soft)',color:'var(--green-dark)',fontSize:13,fontWeight:800 }}>
              Thanks, we'll review this.
            </div>
            {duplicate && <div style={{ marginTop:8,fontSize:11.5,color:'var(--ink-45)' }}>You already had an open report for this item.</div>}
            {allowBlock && (
              <div style={{ marginTop:15 }}>
                <div style={{ fontSize:12,fontWeight:800 }}>Also block @{reportedUsername.replace(/^@/,'')}?</div>
                <p style={{ margin:'4px 0 0',fontSize:11.5,color:'var(--ink-45)' }}>Blocking is silent and takes effect immediately.</p>
                {error && <div role="alert" style={{ marginTop:8,color:'#B3261E',fontSize:12 }}>{error}</div>}
                <button type="button" className="btn-primary" disabled={busy} onClick={reportAndBlock} style={{ width:'100%',marginTop:10 }}>{busy ? 'Blocking…' : 'Also block'}</button>
              </div>
            )}
            <button type="button" className="btn-secondary" disabled={busy} onClick={onClose} style={{ width:'100%',marginTop:8 }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ marginTop:15,display:'grid',gap:7 }}>
              {REPORT_REASONS.map(([value,label]) => (
                <label key={value} style={{ display:'flex',alignItems:'center',gap:10,minHeight:44,padding:'0 10px',border:'1px solid var(--line)',borderRadius:12,background:reason===value?'var(--green-soft)':'var(--white)',cursor:'pointer' }}>
                  <input type="radio" name="report-reason" value={value} checked={reason===value} onChange={() => setReason(value)} />
                  <span style={{ fontSize:12.5,fontWeight:700 }}>{label}</span>
                </label>
              ))}
            </div>
            <textarea
              maxLength={500}
              value={details}
              onChange={e => setDetails(e.target.value.slice(0,500))}
              placeholder="Optional details"
              style={{ width:'100%',boxSizing:'border-box',marginTop:10,minHeight:80,resize:'vertical',border:'1px solid var(--line)',borderRadius:12,background:'var(--white)',color:'var(--ink)',padding:11,fontFamily:'inherit',fontSize:12.5 }}
            />
            {error && <div role="alert" style={{ marginTop:8,color:'#B3261E',fontSize:12 }}>{error}</div>}
            <button type="button" className="btn-primary" disabled={!reason || busy} onClick={submitReport} style={{ width:'100%',marginTop:10 }}>{busy ? 'Submitting…' : 'Submit report'}</button>
          </>
        )}
      </section>
    </div>
  );
}
