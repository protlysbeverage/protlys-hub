'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NativeStepTrackerBootstrap({ userId }) {
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    let connecting = false;
    const connectWidget = async () => {
      try {
        const isAndroidTwa = /Android/i.test(window.navigator.userAgent || '') &&
          (window.matchMedia?.('(display-mode: standalone)').matches ||
           String(document.referrer || '').startsWith('android-app://com.protlys.hub'));
        if (!isAndroidTwa || cancelled) return;
        const pairedUser = localStorage.getItem('protlys-widget-pair-user');
        const pairedAt = Number(localStorage.getItem('protlys-widget-pair-at') || 0);
        if (pairedUser === String(userId) && Date.now() - pairedAt < 24 * 60 * 60 * 1000) return;
        let deviceId = localStorage.getItem('protlys-widget-device-id');
        if (!deviceId) {
          deviceId = window.crypto?.randomUUID?.() || (String(Date.now()) + '-' + Math.random().toString(16).slice(2));
          localStorage.setItem('protlys-widget-device-id', deviceId);
        }
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke('widget-pair', {
          body: {
            action: 'pair',
            device_name: ('Protlys widget ' + deviceId).slice(0, 120),
          },
        });
        if (error || !data?.token || cancelled) return;
        localStorage.setItem('protlys-widget-pair-user', String(userId));
        localStorage.setItem('protlys-widget-pair-at', String(Date.now()));
        window.location.href = 'protlys://widget-auth?token=' + encodeURIComponent(data.token);
      } catch {
        // Widget pairing is optional; existing step tracking continues independently.
      }
    };
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
    connectWidget();
    connectNative();
    window.addEventListener('protlys:native-ready', connectNative);
    return () => {
      cancelled = true;
      window.removeEventListener('protlys:native-ready', connectNative);
    };
  }, [userId]);

  return null;
}
