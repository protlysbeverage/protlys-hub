'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AutomaticTrackingCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
        body: { device_name: 'Protlys Android' },
      });

      if (error || !data?.token) {
        setMessage('Could not connect automatic tracking. Try again.');
        return;
      }

      window.location.href = `protlys://health-connect?token=${encodeURIComponent(data.token)}`;
      setMessage('Opening Health Connect…');
    } catch {
      setMessage('Could not connect automatic tracking. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hub-card" style={{ marginTop: 10, padding: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>Automatic tracking</div>
      <div style={{ fontSize: 12, color: 'var(--ink-45)', marginTop: 3 }}>
        Let Protlys read your phone steps through Health Connect. No GPS or location tracking.
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={loading}
        onClick={connect}
        style={{ width: '100%', marginTop: 12 }}
      >
        {loading ? 'Connecting…' : 'Connect automatic tracking'}
      </button>
      {message && (
        <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 8 }}>
          {message}
        </div>
      )}
    </div>
  );
}
