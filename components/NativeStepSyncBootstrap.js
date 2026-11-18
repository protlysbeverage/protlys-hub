'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NativeStepSyncBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let pairing = false;

    const provisionToken = async () => {
      const native = window.ProtlysNative;
      if (!native?.isAvailable?.() || pairing || cancelled) return;
      pairing = true;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const userId = String(user.id);
        if (native.hasSyncTokenForUser?.(userId)) return;

        const { data, error } = await supabase.functions.invoke('health-connect-pair', {
          body: {
            action: 'pair',
            platform: 'android',
            device_name: 'Protlys Hub native Android',
          },
        });
        if (!cancelled && !error && data?.token) {
          native.setSyncToken(data.token, userId);
        }
      } catch {
        // Retry on the next native-ready event or app navigation.
      } finally {
        pairing = false;
      }
    };

    const onNativeReady = () => { provisionToken(); };
    window.addEventListener('protlys:native-ready', onNativeReady);
    window.addEventListener('online', onNativeReady);
    provisionToken();
    return () => {
      cancelled = true;
      window.removeEventListener('protlys:native-ready', onNativeReady);
      window.removeEventListener('online', onNativeReady);
    };
  }, []);

  return null;
}
