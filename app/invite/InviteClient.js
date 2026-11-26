'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function InviteClient() {
  const [code, setCode] = useState('');
  const [invited, setInvited] = useState(0);
  const [joined, setJoined] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const inviteUrl = useMemo(() => code ? `https://hub.protlys.com/join?ref=${encodeURIComponent(code)}` : '', [code]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [{ data: referralCode, error: codeError }, { data: stats, error: statsError }] = await Promise.all([
        supabase.rpc('ensure_my_referral_code'),
        supabase.rpc('get_my_referral_stats'),
      ]);
      if (cancelled) return;
      if (codeError) setError(codeError.message || 'Could not create your invite link.');
      else setCode(String(referralCode || '').toUpperCase());
      if (!statsError) {
        const row = Array.isArray(stats) ? stats[0] : stats;
        setInvited(Number(row?.invited_count || 0));
        setJoined(Number(row?.joined_count || 0));
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy automatically. Press and hold the invite link to copy it.');
    }
  }

  async function shareWhatsApp() {
    if (!inviteUrl) return;
    const message = `Join me on Protlys, track your steps and protein. ${inviteUrl}`;
    try {
      if (navigator.share) await navigator.share({ text: message });
      else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      if (error?.name !== 'AbortError') window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className="screen-pad" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 18, paddingBottom: 28 }}>
      <Link href="/feed" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--green-dark)', fontSize: 13, fontWeight: 850, textDecoration: 'none', padding: '8px 0' }}><span aria-hidden="true" style={{ fontSize: 22 }}>‹</span> Back</Link>
      <div style={{ textAlign: 'center', padding: '26px 22px 22px', border: '1px solid var(--line)', borderRadius: 22, background: 'var(--white)', marginTop: 12 }}>
        <div aria-hidden="true" style={{ width: 58, height: 58, borderRadius: 18, margin: '0 auto 14px', display: 'grid', placeItems: 'center', background: 'var(--green-soft)', color: 'var(--green-dark)', fontSize: 28 }}>↗</div>
        <h1 style={{ fontSize: 23, margin: 0 }}>Bring a friend to Protlys</h1>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-60)', margin: '9px auto 0', maxWidth: 360 }}>Invite someone to track their steps, keep up with protein and take on challenges with you.</p>
      </div>
      <div style={{ marginTop: 13, border: '1.5px dashed var(--green-dark)', borderRadius: 13, padding: '13px 14px', background: 'var(--white)', color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.5, overflowWrap: 'anywhere', minHeight: 48, display: 'flex', alignItems: 'center' }}>
        {loading ? 'Preparing your invite link…' : inviteUrl || 'Your invite link is not available yet.'}
      </div>
      {error && <p role="alert" style={{ color: '#B3261E', fontSize: 12, margin: '8px 2px' }}>{error}</p>}
      <button type="button" onClick={copyLink} disabled={!inviteUrl || loading} style={{ width: '100%', height: 44, minHeight: 44, marginTop: 12, border: '1.5px solid var(--green-dark)', borderRadius: 999, background: 'var(--white)', color: 'var(--green-dark)', fontSize: 13, fontWeight: 850, cursor: 'pointer', opacity: inviteUrl ? 1 : .55 }}>
        {copied ? '✓ Link copied' : 'Copy link'}
      </button>
      <button type="button" onClick={shareWhatsApp} disabled={!inviteUrl || loading} style={{ width: '100%', height: 44, minHeight: 44, marginTop: 9, border: 0, borderRadius: 999, background: '#6BCB45', color: '#111', fontSize: 13, fontWeight: 900, cursor: 'pointer', opacity: inviteUrl ? 1 : .55 }}>
        Share on WhatsApp
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <div style={{ border: '1px solid var(--line)', borderRadius: 15, background: 'var(--white)', padding: '15px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : invited.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-45)', fontWeight: 750, marginTop: 4 }}>Invited</div>
        </div>
        <div style={{ border: '1px solid var(--line)', borderRadius: 15, background: 'var(--white)', padding: '15px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : joined.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-45)', fontWeight: 750, marginTop: 4 }}>Joined</div>
        </div>
      </div>
    </div>
  );
}
