'use client';

import { useState } from 'react';
import Link from 'next/link';

const SUPPORT_EMAIL = 'protlysbeverage@gmail.com';

export default function HelpClient({ email = '' }) {
  const [category, setCategory] = useState('feedback');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'Web/PWA',
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown device',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send your message.');
      setResult(data);
      setMessage('');
    } catch (err) {
      setError(err.message || 'Could not send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen-pad" style={{ maxWidth: 620, margin: '0 auto', paddingTop: 18, paddingBottom: 28 }}>
      <Link href="/feed" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--green-dark)', fontSize: 13, fontWeight: 850, textDecoration: 'none', padding: '8px 0' }}><span aria-hidden="true" style={{ fontSize: 22 }}>‹</span> Back</Link>
      <div style={{ marginTop: 12 }}>
        <span className="eyebrow">We’re listening</span>
        <h1 style={{ fontSize: 23, margin: '5px 0 7px' }}>Help and feedback</h1>
        <p className="subhead">Tell us what’s working, what needs attention or where you need a hand.</p>
      </div>
      {result ? (
        <div role="status" style={{ marginTop: 18, padding: 18, border: '1px solid var(--line)', borderRadius: 16, background: 'var(--white)' }}>
          <div style={{ fontSize: 24, color: 'var(--green-dark)' }}>✓</div>
          <h2 style={{ fontSize: 17, margin: '8px 0' }}>Thanks for getting in touch.</h2>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-60)' }}>{result.emailSent ? 'Your message has been sent to the Protlys team.' : 'Your message has been saved. Email delivery is not configured, so you can also contact us directly.'}</p>
          {!result.emailSent && <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Protlys Hub support')}`} style={{ color: 'var(--green-dark)', fontWeight: 850, fontSize: 13 }}>Email {SUPPORT_EMAIL}</a>}
          <button type="button" className="btn-primary" onClick={() => setResult(null)} style={{ marginTop: 16 }}>Send another message</button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 18, padding: 17, border: '1px solid var(--line)', borderRadius: 17, background: 'var(--white)' }}>
          <label className="field-label" htmlFor="help-category">WHAT DO YOU NEED?</label>
          <select id="help-category" value={category} onChange={event => setCategory(event.target.value)} className="field-input" style={{ marginTop: 7, marginBottom: 15 }}>
            <option value="feedback">Feedback</option><option value="help">Help</option><option value="bug">Report a bug</option>
          </select>
          <label className="field-label" htmlFor="help-email">ACCOUNT EMAIL</label>
          <input id="help-email" className="field-input" type="email" value={email} readOnly style={{ marginTop: 7, marginBottom: 15, opacity: .8 }} />
          <label className="field-label" htmlFor="help-message">YOUR MESSAGE</label>
          <textarea id="help-message" required minLength={5} maxLength={4000} rows={6} value={message} onChange={event => setMessage(event.target.value)} placeholder="Tell us how we can help…" className="field-input" style={{ marginTop: 7, resize: 'vertical', minHeight: 130 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 5, fontSize: 10, color: 'var(--ink-45)' }}><span>Do not include passwords or sensitive information.</span><span>{message.length}/4000</span></div>
          {error && <p role="alert" style={{ color: '#B3261E', fontSize: 12, margin: '12px 0 0' }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading || message.trim().length < 5} style={{ width: '100%', minHeight: 44, marginTop: 16 }}>{loading ? 'Sending…' : 'Send message'}</button>
        </form>
      )}
    </div>
  );
}
