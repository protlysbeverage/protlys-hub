'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const PAIRING_KEY = 'protlys_android_tracking_paired';

export default function AutomaticTrackingCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const attemptedRef = useRef(false);

  useEffect(() => {
    const referrer = document.referrer || '';
    const isProtlysAndroidApp = referrer.startsWith('android-app://com.protlys.hub');
    const alreadyPaired = window.localStorage.getItem(PAIRING_KEY) === '1';

    if (!isProtlysAndroidApp || alreadyPaired || attemptedRef.current) return;

    attemptedRef.current = true;

    (async () => {
      setLoading(true);
      setMessage('Setting up automatic step tracking…');

      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          setMessage('Please sign in first.');
          return;
        }

        const { data, error } = await supabase.functions.invoke('health-connect-pair', {
          body: { platform: 'android', device_name: 'Protlys Android' },
        });

        if (error || !data?.token) {
          setMessage('Could not set up automatic tracking. Please try again.');
          return;
        }

        window.localStorage.setItem(PAIRING_KEY, '1');
        window.location.href = `protlys://health-connect?token=${encodeURIComponent(data.token)}`;
      } catch {
        setMessage('Could not set up automatic tracking. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function connect() {
    setLoading(true);
    setMessage('');

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        setMessage('Please sign in first.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('health-connect-pair', {
        body: { platform: 'android', device_name: 'Protlys Android' },
      });

      if (error || !data?.token) {
        setMessage('Could not connect automatic tracking. Try again.');
        return;
      }

      window.localStorage.setItem(PAIRING_KEY, '1');
      window.location.href = `protlys://health-connect?token=${encodeURIComponent(data.token)}`;
      setMessage('Opening Protlys…');
    } catch {
      setMessage('Could not connect automatic tracking. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const isAndroidBrowser =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isProtlysAndroidApp =
    typeof document !== 'undefined' &&
    (document.referrer || '').startsWith('android-app://com.protlys.hub');

  return (
    <div className="hub-card" style={{ marginTop: 10, padding: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>Automatic tracking</div>
      <div style={{ fontSize: 12, color: 'var(--ink-45)', marginTop: 3 }}>
        {isProtlysAndroidApp
          ? 'Protlys will track your steps automatically from your phone. No GPS or location tracking.'
          : 'Automatic step tracking works in the Protlys Android app. No GPS or location tracking.'}
      </div>

      {!isProtlysAndroidApp && isAndroidBrowser && (
        <button
          type="button"
          className="btn-primary"
          disabled={loading}
          onClick={connect}
          style={{ width: '100%', marginTop: 12 }}
        >
          {loading ? 'Connecting…' : 'Open Protlys Android tracking'}
        </button>
      )}

      {loading && isProtlysAndroidApp && (
        <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 8 }}>
          Setting up automatic tracking…
        </div>
      )}

      {message && !loading && (
        <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 8 }}>
          {message}
        </div>
      )}
    </div>
  );
}
