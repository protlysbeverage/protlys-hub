'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NativeStepTrackerBootstrap({ userId }) {
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    let connecting = false;
    let widgetConnecting = false;
    const connectWidget = async () => {
      const native = window.ProtlysNative;
      if (!native?.isAvailable || !native.hasWidgetTokenForUser || widgetConnecting || cancelled) return;
      try {
        if (native.hasWidgetTokenForUser(String(userId))) return;
        widgetConnecting = true;
        const supabase = createClient();
        const deviceId = native.getWidgetDeviceId?.() || 'android';
        const { data, error } = await supabase.functions.invoke('widget-pair', {
          body: {
            action: 'pair',
            device_name: ('Protlys widget ' + String(deviceId)).slice(0, 120),
          },
        });
        if (error || !data?.token || cancelled) return;
        native.setWidgetToken?.(data.token, String(userId));
      } catch {
        // Widget pairing is optional; existing step tracking continues independently.
      } finally {
        widgetConnecting = false;
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
    window.addEventListener('protlys:native-ready', connectWidget);
    return () => {
      cancelled = true;
      window.removeEventListener('protlys:native-ready', connectNative);
      window.removeEventListener('protlys:native-ready', connectWidget);
    };
  }, [userId]);

  return null;
}
