'use client';

import { useEffect } from 'react';

const TRUSTED_ORIGIN = 'https://hub.protlys.com';

export default function NativeMovementBridge() {
  useEffect(() => {
    let port = null;

    const handleMessage = async (event) => {
      if (event.origin !== TRUSTED_ORIGIN) return;

      if (!port && event.ports?.[0]) {
        port = event.ports[0];
        port.onmessage = handleMessage;
        port.start?.();
        port.postMessage('PROTLYS_REQUEST_NATIVE_STEPS');
      }

      if (typeof event.data !== 'string') return;

      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload?.type !== 'PROTLYS_NATIVE_STEPS') return;

      const steps = Number(payload.steps);
      const stepDate = String(payload.date || '');
      const stepTimestamp = String(payload.timestamp || '');

      if (!Number.isInteger(steps) || steps < 0 || steps > 999999) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(stepDate)) return;

      try {
        await fetch('/api/native-steps', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ steps, stepDate, stepTimestamp }),
          credentials: 'same-origin',
          cache: 'no-store',
        });
      } catch {
        // Manual movement entry remains available.
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return null;
}
