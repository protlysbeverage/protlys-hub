'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.3.3';
const SUPPORT_EMAIL = 'protlysbeverage@gmail.com';

function getDeviceModel() {
  const ua = navigator.userAgent || '';
  const android = ua.match(/Android[^;)]*;\s*([^;)]+)/i);
  if (android?.[1]) return android[1].replace(/\s+Build\/.*/i, '').trim();
  const apple = ua.match(/(iPhone|iPad|iPod)/i);
  return apple?.[1] || navigator.platform || 'Unknown device';
}

export default function HelpClient({ initialEmail = '' }) {
  const [type, setType] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [deviceModel, setDeviceModel] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setDeviceModel(getDeviceModel()); }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSent(false);
    if (!message.trim()) {
      setError('Please enter a message before sending.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address so we can reply.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim(), email: email.trim(), appVersion: APP_VERSION, deviceModel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send your message.');
      setSent(true);
      setMessage('');
    } catch (sendError) {
      setError(sendError.message || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="hub-page" style={{maxWidth:620,margin:'0 auto'}}>
      <Link href="/feed" aria-label="Back to Hub" style={{display:'inline-flex',alignItems:'center',gap:8,color:'var(--green-dark)',fontSize:13,fontWeight:850,textDecoration:'none',padding:'8px 0 14px'}}>
        <span aria-hidden="true" style={{fontSize:22,lineHeight:1}}>‹</span> Back
      </Link>
      <div className="page-header">
        <div>
          <div className="eyebrow">We’re listening</div>
          <h1>Help and feedback</h1>
          <p className="page-subtitle">Tell us what is working, what is broken or where you need a hand.</p>
        </div>
      </div>

      <form onSubmit={submit} style={{marginTop:16,padding:18,border:'1px solid var(--line)',borderRadius:18,background:'var(--white)'}}>
        <label style={{display:'block',fontSize:12,fontWeight:850,marginBottom:7}}>Type</label>
        <select value={type} onChange={event=>setType(event.target.value)} style={{width:'100%',height:44,border:'1px solid var(--line)',borderRadius:11,padding:'0 12px',background:'var(--paper)',color:'var(--ink)',font:'inherit',marginBottom:15}}>
          <option value="Feedback">Feedback</option>
          <option value="Help">Help</option>
          <option value="Bug">Bug</option>
        </select>

        <label style={{display:'block',fontSize:12,fontWeight:850,marginBottom:7}}>Your email</label>
        <input type="email" value={email} onChange={event=>setEmail(event.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com" style={{width:'100%',height:44,boxSizing:'border-box',border:'1px solid var(--line)',borderRadius:11,padding:'0 12px',background:'var(--paper)',color:'var(--ink)',font:'inherit',marginBottom:15}}/>

        <label style={{display:'block',fontSize:12,fontWeight:850,marginBottom:7}}>Message</label>
        <textarea value={message} onChange={event=>setMessage(event.target.value)} required maxLength={5000} rows={6} placeholder="Tell us how we can help…" style={{width:'100%',boxSizing:'border-box',border:'1px solid var(--line)',borderRadius:11,padding:12,background:'var(--paper)',color:'var(--ink)',font:'inherit',fontSize:13,lineHeight:1.55,resize:'vertical'}}/>

        {error && <p role="alert" style={{fontSize:12,color:'#B3261E',margin:'10px 0 0'}}>{error}</p>}
        {sent && <p role="status" style={{fontSize:13,fontWeight:800,color:'var(--green-dark)',margin:'12px 0 0'}}>Sent. We'll reply to your email.</p>}

        <button type="submit" disabled={sending || !message.trim() || !email.trim()} className="btn-primary" style={{width:'100%',height:46,minHeight:46,borderRadius:999,marginTop:15,opacity:(sending||!message.trim()||!email.trim()) ? .55 : 1}}>
          {sending ? 'Sending…' : 'Send message'}
        </button>
      </form>

      <p style={{fontSize:12,color:'var(--ink-60)',textAlign:'center',marginTop:14}}>
        Prefer email? <a href={`mailto:${SUPPORT_EMAIL}?subject=Protlys%20Hub%20help%20and%20feedback`} style={{color:'var(--green-dark)',fontWeight:850}}>Email us instead</a>
      </p>
    </div>
  );
}
