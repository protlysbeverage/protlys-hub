'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AndroidStepTrackingCard() {
  const [android, setAndroid] = useState(false);
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');

  const refreshStatus = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.functions.invoke('health-connect-pair', {
        body: { action: 'status', platform: 'android' },
      });
      setStatus(data?.active && data?.last_synced_at ? 'connected' : 'idle');
    } catch { setStatus('idle'); }
  }, []);

  useEffect(() => { setAndroid(/Android/i.test(window.navigator.userAgent || '')); }, []);

  useEffect(() => {
    if (!android) return undefined;
    refreshStatus();
    const onReturn = () => {
      window.dispatchEvent(new Event('protlys:steps-updated'));
      refreshStatus();
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [android, refreshStatus]);

  if (!android) return null;

  async function connect() {
    setStatus('working');
    setMessage('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('health-connect-pair', {
        body: { action: 'pair', platform: 'android', device_name: window.navigator.userAgent.slice(0, 120) },
      });
      if (error || !data?.token) throw new Error(error?.message || 'Could not start step tracking');
      const deepLink = 'protlys://health-connect?token=' + encodeURIComponent(data.token);
      setMessage('Opening Android permission settings. Return to Movement after allowing access.');
      window.location.href = deepLink;
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'Could not connect step tracking. Please try again.');
    }
  }

  return (
    <div className="hub-card" style={{marginTop:10,padding:16}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{width:42,height:42,borderRadius:12,display:'grid',placeItems:'center',flex:'0 0 42px',background:'var(--green-soft)',color:'var(--green-dark)'}}>
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7.5 4.5c1.6 2.1 1.8 4.3.7 6.1-1 1.7-2.7 2.5-4 1.7-1.3-.8-1.1-2.5-.1-3.7 1-1.2 2.2-1.5 3.4-2.4Z"/>
            <path d="M16.5 19.5c-1.6-2.1-1.8-4.3-.7-6.1 1-1.7 2.7-2.5 4-1.7 1.3.8 1.1 2.5.1 3.7-1.2 1.2-2.2 1.5-3.4 2.4Z"/>
          </svg>
        </div>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontSize:15,fontWeight:800}}>Allow Protlys to read your steps</div>
          <div style={{fontSize:12.5,color:'var(--ink-45)',lineHeight:1.45,marginTop:4}}>
            {status === 'connected'
              ? 'Step tracking is connected. Your phone sensor and Health Connect totals are reconciled without double-counting.'
              : 'Allow step access to automatically update Steps today, distance, calories, movement history and group totals.'}
          </div>
          {message && <div role="status" style={{fontSize:11,color:status === 'error' ? 'var(--ink)' : 'var(--green-dark)',lineHeight:1.4,marginTop:7}}>{message}</div>}
          <button type="button" className="btn-primary" onClick={connect} disabled={status === 'working'} style={{marginTop:11,minHeight:42,padding:'9px 14px'}}>
            {status === 'working' ? 'Opening permissions…' : status === 'connected' ? 'Refresh step connection' : 'Allow step access'}
          </button>
        </div>
      </div>
    </div>
  );
}