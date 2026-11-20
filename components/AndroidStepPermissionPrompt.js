'use client';

import { useEffect, useState } from 'react';

export default function AndroidStepPermissionPrompt() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const refresh = () => {
      try {
        const native = window.ProtlysNative;
        if (!native?.isAvailable) {
          setStatus(null);
          return;
        }
        const next = native.permissionStatus?.() || 'granted';
        setStatus(next === 'denied' || next === 'permanently_denied' ? next : null);
      } catch {
        setStatus(null);
      }
    };
    refresh();
    window.addEventListener('protlys:native-ready', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('protlys:native-ready', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  if (!status) return null;

  return (
    <div className="hub-card" role="status" style={{ marginTop: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ minWidth: 0, flex: 1, fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink-70)' }}>
        Allow activity recognition to count steps
      </div>
      <button
        type="button"
        className="btn-primary"
        style={{ minHeight: 38, padding: '8px 13px', flex: '0 0 auto' }}
        onClick={() => window.ProtlysNative?.requestPermission?.()}
      >
        {status === 'permanently_denied' ? 'Open settings' : 'Allow'}
      </button>
    </div>
  );
}
