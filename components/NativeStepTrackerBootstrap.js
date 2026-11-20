'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NativeStepTrackerBootstrap({ userId }) {
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    let connecting = false;
    const connectNative = async () => {
      const native = window.ProtlysNative;
      if (!native?.isAvailable || connecting || cancelled) return;
      connecting = true;
      try {
        if (!native.hasSyncTokenForUser?.(String(userId))) {
          native.clearSyncToken?.();
          const supabase = createClient();
          const { data, error } = await supabase.functions.invoke('health-connect-pair', {
            body: {
              action: 'pair',
              platform: 'android',
              device_name: String(window.navigator.userAgent || 'Android').slice(0, 120),
            },
          });
          if (error || !data?.token || cancelled) return;
          native.setSyncToken?.(data.token, String(userId));
        }
        if (!cancelled) native.startTracking?.(String(userId));
      } catch {
        // The native counter remains local; WorkManager retries sync after pairing/network recovery.
      } finally {
        connecting = false;
      }
    };
    connectNative();
    window.addEventListener('protlys:native-ready', connectNative);
    return () => {
      cancelled = true;
      window.removeEventListener('protlys:native-ready', connectNative);
    };
  }, [userId]);

  return null;
}
