'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import '../globals.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="protlys-app">
      <div className="app-shell" style={{ justifyContent: 'center' }}>
        <div className="screen-pad" style={{ paddingTop: 40 }}>
          <div className="wordmark display" style={{ marginBottom: 24 }}>PROT<span>LYS</span></div>
          <span className="eyebrow">Welcome back</span>
          <h1 style={{ fontSize: 22 }}>Log in to your Hub</h1>

          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="email">EMAIL</label>
              <input
                id="email"
                type="email"
                required
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="password">PASSWORD</label>
              <input
                id="password"
                type="password"
                required
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="subhead" style={{ marginTop: 18 }}>
            New to Protlys? <Link href="/signup" style={{ color: 'var(--green-dark)', fontWeight: 700 }}>Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
