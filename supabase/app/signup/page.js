'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import '../globals.css';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) return (
    <div className="protlys-app">
      <div className="app-shell" style={{ justifyContent: 'center' }}>
        <div className="screen-pad" style={{ paddingTop: 60 }}>
          <div className="wordmark display" style={{ marginBottom: 24 }}>PROT<span>LYS</span></div>
          <h1 style={{ fontSize: 22 }}>Check your email</h1>
          <p className="subhead">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your Hub account.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="protlys-app">
      <div className="app-shell" style={{ justifyContent: 'center' }}>
        <div className="screen-pad" style={{ paddingTop: 40 }}>
          <div className="wordmark display" style={{ marginBottom: 24 }}>PROT<span>LYS</span></div>
          <span className="eyebrow">Join the Hub</span>
          <h1 style={{ fontSize: 22 }}>Create your account</h1>

          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="name">YOUR NAME</label>
              <input id="name" type="text" required className="field-input" value={name}
                onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="email">EMAIL</label>
              <input id="email" type="email" required className="field-input" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="password">PASSWORD</label>
              <input id="password" type="password" required minLength={6} className="field-input"
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="subhead" style={{ marginTop: 18 }}>
            Already have an account? <Link href="/login" style={{ color: 'var(--green-dark)', fontWeight: 700 }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
