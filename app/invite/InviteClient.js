'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function InviteClient() {
  const [code, setCode] = useState('');
  const [invited, setInvited] = useState(0);
  const [joined, setJoined] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const copyTimer = useRef(null);
  const inviteUrl = useMemo(() => code ? `https://hub.protlys.com/join?ref=${encodeURIComponent(code)}` : '', [code]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [{ data: referralCode, error: codeError }, { data: stats, error: statsError }] = await Promise.all([
        supabase.rpc('ensure_referral_code'),
        supabase.rpc('get_referral_stats'),
      ]);
      if (cancelled) return;
      if (codeError) setError('Could not create your invite link. Please try again.');
      else setCode(String(referralCode || '').toUpperCase());
      if (!statsError) {
        setInvited(Number(stats?.invited_count || 0));
        setJoined(Number(stats?.joined_count || 0));
      }
      setLoading(false);
    }
    load();
    const refresh = () => { if (document.visibilityState !== 'hidden') load(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const field = document.createElement('textarea');
        field.value = inviteUrl;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy automatically. Press and hold the link to copy it.');
    }
  }

  async function shareWhatsApp() {
    if (!inviteUrl) return;
    const message = `Join me on Protlys, track your steps and protein. ${inviteUrl}`;
    try {
      if (window.ProtlysNative?.shareText) {
        if (!window.ProtlysNative.shareText('Join me on Protlys', message)) throw new Error('Native sharing is unavailable.');
      } else if (navigator.share) await navigator.share({ title: 'Join me on Protlys', text: message, url: inviteUrl });
      else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className="screen-pad" style={{maxWidth:560,margin:'0 auto',paddingTop:18,paddingBottom:28}}>
      <Link href="/feed" aria-label="Back to Hub" style={{display:'inline-flex',alignItems:'center',gap:7,color:'var(--green-dark)',fontSize:13,fontWeight:850,textDecoration:'none',padding:'8px 0'}}>
        <span aria-hidden="true" style={{fontSize:22,lineHeight:1}}>‹</span> Back
      </Link>

      <section style={{textAlign:'center',padding:'25px 20px 20px',border:'1px solid var(--line)',borderRadius:22,background:'var(--white)',marginTop:12,boxShadow:'0 8px 28px rgba(15,42,74,.045)'}}>
        <div aria-hidden="true" style={{width:58,height:58,borderRadius:18,margin:'0 auto 14px',display:'grid',placeItems:'center',background:'var(--green-soft)',color:'var(--green-dark)'}}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.4-3.1 2.5-5 6-5 2 0 3.5.7 4.5 2"/><path d="M18 8v8M14 12h8"/></svg>
        </div>
        <h1 style={{fontSize:23,lineHeight:1.2,margin:0}}>Bring a friend to Protlys</h1>
        <p style={{fontSize:13,lineHeight:1.55,color:'var(--ink-70)',margin:'9px auto 17px',maxWidth:390}}>Invite someone to track their steps, keep up with protein and take on challenges with you.</p>

        <div aria-label="Your invite link" style={{width:'100%',boxSizing:'border-box',padding:'13px 14px',border:'1.5px dashed var(--green-dark)',borderRadius:13,background:'var(--paper)',color:'var(--ink)',fontSize:12.5,lineHeight:1.5,textAlign:'left',overflowWrap:'anywhere',wordBreak:'break-word',minHeight:48}}>
          {loading ? 'Preparing your invite link…' : inviteUrl || 'Your invite link is not available yet.'}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:14}}>
          <button type="button" onClick={copyLink} disabled={!inviteUrl || loading} aria-live="polite" style={{width:'100%',height:44,minHeight:44,border:'1.5px solid var(--green-dark)',borderRadius:999,background:'transparent',color:'var(--green-dark)',fontSize:13,fontWeight:850,cursor:inviteUrl?'pointer':'not-allowed',opacity:inviteUrl?1:.55}}>
            {copied ? '✓  Link copied' : 'Copy link'}
          </button>
          <button type="button" onClick={shareWhatsApp} disabled={!inviteUrl || loading} style={{width:'100%',height:44,minHeight:44,border:'1px solid var(--green-dark)',borderRadius:999,background:'#6BCB45',color:'#111',fontSize:13,fontWeight:900,cursor:inviteUrl?'pointer':'not-allowed',opacity:inviteUrl?1:.55}}>
            Share on WhatsApp
          </button>
        </div>
        {error && <p role="alert" style={{color:'#B3261E',fontSize:11.5,margin:'11px 0 0'}}>{error}</p>}
      </section>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}>
        <div style={{border:'1px solid var(--line)',borderRadius:15,background:'var(--white)',padding:'15px 10px',textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:900,fontVariantNumeric:'tabular-nums'}}>{loading?'—':invited.toLocaleString()}</div>
          <div style={{fontSize:11,color:'var(--ink-45)',fontWeight:750,marginTop:4}}>Invited</div>
        </div>
        <div style={{border:'1px solid var(--line)',borderRadius:15,background:'var(--white)',padding:'15px 10px',textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:900,fontVariantNumeric:'tabular-nums'}}>{loading?'—':joined.toLocaleString()}</div>
          <div style={{fontSize:11,color:'var(--ink-45)',fontWeight:750,marginTop:4}}>Joined</div>
        </div>
      </div>
    </div>
  );
}
