'use client';

import { useState } from 'react';
import Link from 'next/link';
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

function PasswordStrength({ password }) {
  const checks = [
    { label: '6+ characters', pass: password.length >= 6 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['var(--ink-20)', '#FCA5A5', '#FCD34D', 'var(--green)'];
  const labels = ['', 'Weak', 'Fair', 'Strong'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 99,
            background: i < score ? colors[score] : 'var(--ink-20)',
            transition: 'background .3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {checks.map((c, i) => (
          <span key={i} style={{ fontSize: 11, color: c.pass ? 'var(--green-dark)' : 'var(--ink-45)',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            {c.pass ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [agreed, setAgreed]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) { setError('Please accept the terms to continue.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  const Wrap = ({ children }) => (
    <div className="protlys-app">
      <div className="app-shell" style={{ justifyContent: 'flex-start', overflowY: 'auto' }}>
        <div className="screen-pad" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src="/logo.png" alt="Protlys"
              style={{ width: 110, height: 'auto', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
            <div className="wordmark display" style={{ marginTop: 4 }}>PROT<span>LYS</span></div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );

  if (done) return (
    <Wrap>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
        <h1 style={{ fontSize: 22 }}>You're almost in!</h1>
        <p className="subhead" style={{ marginTop: 8 }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your Protlys Hub account.
        </p>
        <div style={{ background: 'var(--green-soft)', borderRadius: 14, padding: 14, marginTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--green-dark)', fontWeight: 600, margin: 0 }}>
            Don't see it? Check your spam or junk folder.
          </p>
        </div>
        <Link href="/login">
          <button className="btn-secondary" style={{ marginTop: 20 }}>Back to log in</button>
        </Link>
      </div>
    </Wrap>
  );

  return (
    <Wrap>
      <span className="eyebrow">Join the Hub</span>
      <h1 style={{ fontSize: 22 }}>Create your account</h1>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        {/* Name */}
        <div className="field-group">
          <label className="field-label" htmlFor="name">YOUR NAME</label>
          <input id="name" type="text" required className="field-input"
            value={name} onChange={e => setName(e.target.value)}
            autoComplete="name" placeholder="John Doe" />
        </div>

        {/* Email */}
        <div className="field-group">
          <label className="field-label" htmlFor="email">EMAIL</label>
          <input id="email" type="email" required className="field-input"
            value={email} onChange={e => setEmail(e.target.value)}
            autoComplete="email" placeholder="you@example.com" />
        </div>

        {/* Password with show/hide + strength meter */}
        <div className="field-group">
          <label className="field-label" htmlFor="password">PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input id="password" type={showPw ? 'text' : 'password'} required
              minLength={6} className="field-input"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="new-password" placeholder="Min. 6 characters"
              style={{ paddingRight: 48 }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-45)', display: 'flex', alignItems: 'center', padding: 0 }}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              <EyeIcon open={showPw} />
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        {/* Terms checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <input type="checkbox" id="agree" checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--green)', flexShrink: 0 }} />
          <label htmlFor="agree" style={{ fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.5, cursor: 'pointer' }}>
            I agree to the Protlys{' '}
            <a href="/pages/terms" style={{ color: 'var(--green-dark)', fontWeight: 700 }}>Terms of Service</a>
            {' '}and{' '}
            <a href="/pages/privacy" style={{ color: 'var(--green-dark)', fontWeight: 700 }}>Privacy Policy</a>
          </label>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#B3261E', marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading || !agreed}
          style={{ marginTop: 6, opacity: !agreed ? 0.6 : 1 }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin .7s linear infinite', display: 'inline-block' }} />
              Creating account…
            </span>
          ) : 'Create account'}
        </button>
      </form>

      <p className="subhead" style={{ marginTop: 18, textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--green-dark)', fontWeight: 700 }}>Log in</Link>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Wrap>
  );
}
