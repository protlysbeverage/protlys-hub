'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function getVisitorId() {
  try {
    const saved = window.localStorage.getItem('protlys_referral_visitor_id');
    if (saved) return saved;
    const created = window.crypto?.randomUUID?.() || `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem('protlys_referral_visitor_id', created);
    return created;
  } catch {
    return `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function ReferralJoinClient({ code = '' }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function continueJoin() {
      const referralCode = String(code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{4,32}$/.test(referralCode)) {
        router.replace('/signup?next=/feed');
        return;
      }

      // Keep the attribution on this device through signup and email confirmation.
      window.localStorage.setItem('protlys_referral_code', referralCode);
      document.cookie = `protlys_referral_code=${encodeURIComponent(referralCode)}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;

      await fetch('/api/referrals/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: referralCode, visitorId: getVisitorId() }),
      }).catch(() => {});

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        await supabase.rpc('apply_referral_code', { p_code: referralCode });
        window.localStorage.removeItem('protlys_referral_code');
        document.cookie = 'protlys_referral_code=; Path=/; Max-Age=0; SameSite=Lax; Secure';
        if (!cancelled) router.replace('/feed');
        return;
      }
      router.replace(`/signup?ref=${encodeURIComponent(referralCode)}&next=/feed`);
    }
    continueJoin().catch(() => {
      if (!cancelled) router.replace(`/signup?ref=${encodeURIComponent(String(code || '').trim().toUpperCase())}&next=/feed`);
    });
    return () => { cancelled = true; };
  }, [code, router]);

  return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:24,background:'var(--paper)',color:'var(--ink)'}}><p role="status" style={{fontSize:14,fontWeight:750}}>Opening your Protlys invitation…</p></main>;
}
