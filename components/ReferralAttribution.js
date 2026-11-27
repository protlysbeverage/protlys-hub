'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ReferralAttribution() {
  useEffect(() => {
    let cancelled = false;
    async function applyPendingReferral() {
      let code = '';
      try {
        code = window.localStorage.getItem('protlys_referral_code') || '';
        if (!code) {
          const cookie = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith('protlys_referral_code='));
          code = cookie ? decodeURIComponent(cookie.slice('protlys_referral_code='.length)) : '';
        }
      } catch {}
      if (!code) return;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const { error } = await supabase.rpc('apply_referral_code', { p_code: code });
      if (cancelled || error) return;
      try {
        window.localStorage.removeItem('protlys_referral_code');
        document.cookie = 'protlys_referral_code=; Path=/; Max-Age=0; SameSite=Lax; Secure';
      } catch {}
    }
    applyPendingReferral().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return null;
}
