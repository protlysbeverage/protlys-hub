'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const HANDOFF_KEY = 'protlys_android_tracking_token_handed_over';

function formatLastSynced(value) {
  if (!value) return 'waiting for first sync';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'waiting for first sync';
  const diff = Math.max(0, Date.now() - date.getTime());
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  return date.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AutomaticTrackingCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ active: false, lastSyncedAt: null });
  const attemptedRef = useRef(false);

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isProtlysAndroidApp =
    typeof document !== 'undefined' &&
    (document.referrer || '').startsWith('android-app://com.protlys.hub');

  const refreshStatus = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('health-connect-pair', {
        body: { action: 'status', platform: 'android' },
      });
      if (!error && data) {
        setStatus({
          active: Boolean(data.active),
          lastSyncedAt: data.last_synced_at || null,
        });
      }
    } catch {}
  }, []);

  const handoffToken = useCallback(async () => {
    if (!isProtlysAndroidApp || attemptedRef.current) return;
    if (window.localStorage.getItem(HANDOFF_KEY) === '1') return;

    attemptedRef.current = true;
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
        setMessage('Could not start automatic tracking. Please try again.');
        return;
      }

      window.localStorage.setItem(HANDOFF_KEY, '1');
      window.location.href = `protlys://health-connect?token=${encodeURIComponent(data.token)}`;
    } catch {
      setMessage('Could not start automatic tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isProtlysAndroidApp]);

  useEffect(() => {
    handoffToken();
    refreshStatus();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        handoffToken();
        refreshStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(refreshStatus, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [handoffToken, refreshStatus]);

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
        setMessage('Could not start automatic tracking. Please try again.');
        return;
      }

      window.localStorage.setItem(HANDOFF_KEY, '1');
      window.location.href = `protlys://health-connect?token=${encodeURIComponent(data.token)}`;
    } catch {
      setMessage('Could not start automatic tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const trackingText = status.active
    ? `Tracking active · last synced ${formatLastSynced(status.lastSyncedAt)}`
    : 'Tap to enable automatic step tracking';

  return (
    <div className="hub-card" style={{ marginTop: 10, padding: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>Automatic tracking</div>
      <div style={{ fontSize: 12, color: 'var(--ink-45)', marginTop: 3 }}>
        {isProtlysAndroidApp
          ? 'Protlys reads your phone step counter automatically. No GPS or location tracking.'
          : 'Automatic step tracking works in the Protlys Android app. No GPS or location tracking.'}
      </div>

      <div style={{ fontSize: 12, color: status.active ? 'var(--green-dark)' : 'var(--ink-70)', marginTop: 10, fontWeight: 700 }}>
        {loading && isProtlysAndroidApp ? 'Setting up automatic tracking…' : trackingText}
      </div>

      {!isProtlysAndroidApp && isAndroid && (
        <button
          type="button"
          className="btn-primary"
          disabled={loading}
          onClick={connect}
          style={{ width: '100%', marginTop: 12 }}
        >
          {loading ? 'Opening Protlys…' : status.active ? 'Open Protlys Android tracking' : 'Enable automatic tracking'}
        </button>
      )}

      {message && !loading && (
        <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 8 }}>
          {message}
        </div>
      )}
    </div>
  );
}
