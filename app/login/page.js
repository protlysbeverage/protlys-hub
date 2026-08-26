'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import '../globals.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [mode, setMode]             = useState('login'); // 'login' | 'forgot' | 'forgot-sent'
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/');
    router.refresh();
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError('');
    setResetLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) { setError(error.message); return; }
    setMode('forgot-sent');
  }

  // ── EyeIcon ──────────────────────────────────────────────
  const EyeIcon = ({ open }) => open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  // ── Shared wrapper ───────────────────────────────────────
  const Wrap = ({ children }) => (
    <div className="protlys-app">
      <div className="app-shell" style={{ justifyContent: 'flex-start', overflowY: 'auto' }}>
        <div className="screen-pad" style={{ paddingTop: 40, paddingBottom: 40 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img
              src="/logo.png"
              alt="Protlys"
              style={{ width: 110, height: 'auto', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="wordmark display" style={{ marginTop: 4 }}>PROT<span>LYS</span></div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );

  // ── Forgot sent ──────────────────────────────────────────
  if (mode === 'forgot-sent') return (
    <Wrap>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
        <h1 style={{ fontSize: 22 }}>Check your inbox</h1>
        <p className="subhead" style={{ marginTop: 8 }}>
          We sent a password reset link to <strong>{resetEmail}</strong>. Click it to set a new password.
        </p>
        <button className="btn-secondary" style={{ marginTop: 20 }} onClick={() => { setMode('login'); setError(''); }}>
          Back to log in
        </button>
      </div>
    </Wrap>
  );

  // ── Forgot password ──────────────────────────────────────
  if (mode === 'forgot') return (
    <Wrap>
      <span className="eyebrow">Reset password</span>
      <h1 style={{ fontSize: 22 }}>Forgot your password?</h1>
      <p className="subhead" style={{ marginTop: 6 }}>Enter your email and we'll send you a reset link.</p>

      <form onSubmit={handleForgotPassword} style={{ marginTop: 20 }}>
        <div className="field-group">
          <label className="field-label" htmlFor="resetEmail">EMAIL</label>
          <input
            id="resetEmail" type="email" required className="field-input"
            value={resetEmail} onChange={e => setResetEmail(e.target.value)}
            autoComplete="email" placeholder="you@example.com"
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={resetLoading} style={{ marginTop: 6 }}>
          {resetLoading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="subhead" style={{ marginTop: 18, textAlign: 'center' }}>
        Remember it?{' '}
        <button onClick={() => { setMode('login'); setError(''); }}
          style={{ background: 'none', border: 'none', color: 'var(--green-dark)', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0 }}>
          Back to log in
        </button>
      </p>
    </Wrap>
  );

  // ── Login ────────────────────────────────────────────────
  return (
    <Wrap>
      <span className="eyebrow">Welcome back</span>
      <h1 style={{ fontSize: 22 }}>Log in to your Hub</h1>

      <form onSubmit={handleLogin} style={{ marginTop: 20 }}>
        <div className="field-group">
          <label className="field-label" htmlFor="email">EMAIL</label>
          <input
            id="email" type="email" required className="field-input"
            value={email} onChange={e => setEmail(e.target.value)}
            autoComplete="email" placeholder="you@example.com"
          />
        </div>

        <div className="field-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="field-label" htmlFor="password" style={{ marginBottom: 0 }}>PASSWORD</label>
            <button type="button" onClick={() => { setMode('forgot'); setResetEmail(email); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--green-dark)', fontWeight: 700,
                fontSize: 12, cursor: 'pointer', padding: 0 }}>
              Forgot password?
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="password" type={showPw ? 'text' : 'password'} required className="field-input"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" placeholder="Your password"
              style={{ paddingRight: 48 }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-45)',
                display: 'flex', alignItems: 'center', padding: 0 }}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              <EyeIcon open={showPw} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#B3261E', marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)',
                borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
              Logging in…
            </span>
          ) : 'Log in'}
        </button>
      </form>

      <p className="subhead" style={{ marginTop: 18, textAlign: 'center' }}>
        New to Protlys?{' '}
        <Link href="/signup" style={{ color: 'var(--green-dark)', fontWeight: 700 }}>Create an account</Link>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Wrap>
  );
}
