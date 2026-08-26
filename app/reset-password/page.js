'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import '../globals.css';

const EyeIcon = ({ open }) => open ? (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    // Supabase sends the recovery token via URL hash — wait for it
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push('/'), 2000);
  }

  const match = confirm && password === confirm;
  const mismatch = confirm && password !== confirm;

  return (
    <div className="protlys-app">
      <div className="app-shell" style={{ justifyContent: 'flex-start', overflowY: 'auto' }}>
        <div className="screen-pad" style={{ paddingTop: 40, paddingBottom: 40 }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src="/logo.png" alt="Protlys"
              style={{ width: 110, height: 'auto', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
            <div className="wordmark display" style={{ marginTop: 4 }}>PROT<span>LYS</span></div>
          </div>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h1 style={{ fontSize: 22 }}>Password updated!</h1>
              <p className="subhead" style={{ marginTop: 8 }}>Taking you to the Hub…</p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <h1 style={{ fontSize: 20 }}>Verifying your link…</h1>
              <p className="subhead" style={{ marginTop: 8 }}>
                If nothing happens, go back to your email and click the reset link again.
              </p>
            </div>
          ) : (
            <>
              <span className="eyebrow">Set new password</span>
              <h1 style={{ fontSize: 22 }}>Choose a new password</h1>

              <form onSubmit={handleReset} style={{ marginTop: 20 }}>
                <div className="field-group">
                  <label className="field-label" htmlFor="pw">NEW PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input id="pw" type={showPw ? 'text' : 'password'} required
                      className="field-input" value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters" style={{ paddingRight: 48 }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-45)', display: 'flex', padding: 0 }}>
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="cf">CONFIRM PASSWORD</label>
                  <div style={{ position: 'relative' }}>
                    <input id="cf" type={showCf ? 'text' : 'password'} required
                      className="field-input" value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      style={{ paddingRight: 48, borderColor: match ? 'var(--green)' : mismatch ? '#B3261E' : undefined }} />
                    <button type="button" onClick={() => setShowCf(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-45)', display: 'flex', padding: 0 }}>
                      <EyeIcon open={showCf} />
                    </button>
                  </div>
                  {match && <p style={{ fontSize: 12, color: 'var(--green-dark)', fontWeight: 600, marginTop: 5 }}>✓ Passwords match</p>}
                  {mismatch && <p style={{ fontSize: 12, color: '#B3261E', fontWeight: 600, marginTop: 5 }}>✗ Passwords do not match</p>}
                </div>

                {error && (
                  <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 14px',
                    fontSize: 13, color: '#B3261E', marginBottom: 10 }}>{error}</div>
                )}

                <button className="btn-primary" type="submit" disabled={loading || mismatch}
                  style={{ marginTop: 6 }}>
                  {loading ? 'Updating…' : 'Set new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
