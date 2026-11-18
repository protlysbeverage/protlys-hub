'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NativeStepSyncBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let pairing = false;
    let retryAfterPair = false;
    const supabase = createClient();

    const provisionToken = async () => {
      const native = window.ProtlysNative;
      if (!native?.isAvailable?.() || cancelled) return;
      if (pairing) { retryAfterPair = true; return; }
      pairing = true;
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (cancelled || authError) return;
        if (!user) {
          native.clearSyncToken?.();
          return;
        }

        const userId = String(user.id);
        if (native.hasSyncTokenForUser?.(userId)) return;

        const { data, error } = await supabase.functions.invoke('health-connect-pair', {
          body: {
            action: 'pair',
            platform: 'android',
            device_name: 'Protlys Hub native Android',
          },
        });
        if (cancelled || error || !data?.token) return;

        // Do not attach a token if the member signed out or switched accounts
        // while the pairing request was in flight.
        const { data: { user: currentUser }, error: currentAuthError } = await supabase.auth.getUser();
        if (!cancelled && !currentAuthError && currentUser?.id === user.id) {
          native.setSyncToken(data.token, userId);
        }
      } catch {
        // Retry on the next native-ready event, sign-in event or online event.
      } finally {
        pairing = false;
        if (retryAfterPair && !cancelled) {
          retryAfterPair = false;
          queueMicrotask(provisionToken);
        }
      }
    };

    const onNativeReady = () => { provisionToken(); };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        window.ProtlysNative?.clearSyncToken?.();
      } else if (session?.user) {
        if (pairing) retryAfterPair = true;
        else queueMicrotask(provisionToken);
      }
    });

    window.addEventListener('protlys:native-ready', onNativeReady);
    window.addEventListener('online', onNativeReady);
    provisionToken();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('protlys:native-ready', onNativeReady);
      window.removeEventListener('online', onNativeReady);
    };
  }, []);

  return null;
}
