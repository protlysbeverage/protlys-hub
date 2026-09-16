'use client';

import { useState } from 'react';

export default function ShareProfileButton({ profileId, displayName }) {
  const [status, setStatus] = useState('');

  async function handleShare() {
    const url = `${window.location.origin}/member/${profileId}`;
    const shareData = {
      title: `${displayName} on Protlys Hub`,
      text: `Check out ${displayName}'s Protlys Hub profile.`,
      url,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus('Link copied');
      window.setTimeout(() => setStatus(''), 1800);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        setStatus('Link copied');
        window.setTimeout(() => setStatus(''), 1800);
      } catch {
        setStatus('Could not share');
        window.setTimeout(() => setStatus(''), 1800);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Share ${displayName}'s profile`}
      style={{
        display:'inline-flex',
        alignItems:'center',
        justifyContent:'center',
        gap:6,
        minHeight:34,
        padding:'7px 10px',
        border:'1.5px solid var(--line)',
        borderRadius:10,
        background:'#fff',
        color:'var(--ink)',
        fontSize:11,
        fontWeight:800,
        cursor:'pointer',
        whiteSpace:'nowrap',
      }}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <path d="m8.6 10.7 6.8-3.4M8.6 13.3l6.8 3.4"/>
      </svg>
      {status || 'Share'}
    </button>
  );
}
