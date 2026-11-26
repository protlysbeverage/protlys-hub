'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ReferralJoinClient({ code = '' }) {
  const router = useRouter();
  const message = 'Opening your Protlys invitation…';

  useEffect(() => {
    let cancelled = false;
    async function continueJoin() {
      const referralCode = String(code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{8,16}$/.test(referralCode)) {
        router.replace('/signup');
        return;
      }
      const supabase = createClient();
      try {
        let visitorKey = sessionStorage.getItem('protlys-referral-visitor');
        if (!visitorKey) {
          visitorKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          sessionStorage.setItem('protlys-referral-visitor', visitorKey);
        }
        await supabase.rpc('record_referral_visit', { p_code: referralCode, p_visitor_key: visitorKey });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('claim_referral_code', { p_code: referralCode });
          if (!cancelled) router.replace('/feed');
          return;
        }
        sessionStorage.setItem('protlys-referral-code', referralCode);
        if (!cancelled) router.replace(`/signup?ref=${encodeURIComponent(referralCode)}`);
      } catch {
        if (!cancelled) {
          sessionStorage.setItem('protlys-referral-code', referralCode);
          router.replace(`/signup?ref=${encodeURIComponent(referralCode)}`);
        }
      }
    }
    continueJoin();
    return () => { cancelled = true; };
  }, [code, router]);

  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--paper)', color: 'var(--ink)' }}><p role="status" style={{ fontSize: 14, fontWeight: 750 }}>{message}</p></main>;
}
