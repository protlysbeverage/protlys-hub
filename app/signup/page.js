'use client';

import { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import '../globals.css';

const EyeIcon = ({ open }) => open ? (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
) : (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);

function StrengthBar({ score }) {
  if (score === 0) return null;
  const colors = ['', '#FCA5A5', '#FCD34D', 'var(--green)'];
  const labels = ['', 'Weak', 'Fair', 'Strong'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
        {[0,1,2].map(i => <div key={i} style={{ flex:1, height:4, borderRadius:99, background:i < score ? colors[score] : 'var(--ink-20)', transition:'background .25s' }} />)}
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:colors[score] }}>{labels[score]}</span>
    </div>
  );
}

export default function SignupPage() {
  const nameRef = useRef();
  const emailRef = useRef();
  const passwordRef = useRef();
  const [showPw, setShowPw] = useState(false);
  const [strength, setStrength] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneEmail, setDoneEmail] = useState('');

  function togglePw() {
    setShowPw(v => {
      const next = !v;
      if (passwordRef.current) passwordRef.current.type = next ? 'text' : 'password';
      return next;
    });
  }

  const handlePwChange = useCallback(() => {
    const pw = passwordRef.current?.value || '';
    const s = [pw.length >= 6, /[A-Z]/.test(pw), /[0-9]/.test(pw)].filter(Boolean).length;
    setStrength(s);
  }, []);

  async function handleGoogle() {
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    if (error) setError(error.message);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) { setError('Please accept the terms to continue.'); return; }
    const pw = passwordRef.current.value;
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    const supabase = createClient();
    const email = emailRef.current.value.trim();
    const { error } = await supabase.auth.signUp({ email, password: pw, options: { data: { display_name: nameRef.current.value.trim() } } });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDoneEmail(email);
    setDone(true);
  }

  if (done) return (
    <div className="protlys-app"><div className="app-shell" style={{ justifyContent:'flex-start', overflowY:'auto' }}><div className="screen-pad" style={{ paddingTop:40 }}>
      <div style={{ textAlign:'center', marginBottom:32 }}><img src="/logo.png" alt="Protlys" style={{ width:120, height:'auto' }} onError={e=>{e.target.style.display='none'}} /></div>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:52, marginBottom:12 }}>🎉</div><h1 style={{ fontSize:22 }}>You're almost in!</h1><p className="subhead" style={{ marginTop:8 }}>Confirmation link sent to <strong>{doneEmail}</strong>. Click it to activate your account.</p><div style={{ background:'var(--green-soft)', borderRadius:14, padding:14, marginTop:16 }}><p style={{ fontSize:13, color:'var(--green-dark)', fontWeight:600, margin:0 }}>Don't see it? Check your spam or junk folder.</p></div><Link href="/login"><button className="btn-secondary" style={{ marginTop:20 }}>Back to log in</button></Link></div>
    </div></div></div>
  );

  return (
    <div className="protlys-app"><div className="app-shell" style={{ justifyContent:'flex-start', overflowY:'auto' }}><div className="screen-pad" style={{ paddingTop:40, paddingBottom:40 }}>
      <div style={{ textAlign:'center', marginBottom:32 }}><img src="/logo.png" alt="Protlys" style={{ width:120, height:'auto' }} onError={e=>{e.target.style.display='none'}} /></div>
      <span className="eyebrow">Join the Hub</span><h1 style={{ fontSize:22 }}>Create your account</h1>
      <button onClick={handleGoogle} style={googleBtnStyle}><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Sign up with Google</button>
      <div style={dividerStyle}><span>or</span></div>
      <form onSubmit={handleSubmit}>
        <div className="field-group"><label className="field-label" htmlFor="name">YOUR NAME</label><input id="name" ref={nameRef} type="text" required className="field-input" placeholder="John Doe" autoComplete="name" /></div>
        <div className="field-group"><label className="field-label" htmlFor="email">EMAIL</label><input id="email" ref={emailRef} type="email" required className="field-input" placeholder="you@example.com" autoComplete="email" /></div>
        <div className="field-group"><label className="field-label" htmlFor="password">PASSWORD</label><div style={{ position:'relative' }}><input id="password" ref={passwordRef} type="password" required className="field-input" placeholder="Min. 6 characters" autoComplete="new-password" onChange={handlePwChange} style={{ paddingRight:48 }} /><button type="button" onClick={togglePw} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--ink-45)', display:'flex', alignItems:'center', padding:0 }}><EyeIcon open={showPw} /></button></div><StrengthBar score={strength} /></div>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16 }}><input type="checkbox" id="agree" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{ width:18, height:18, marginTop:2, accentColor:'var(--green)', flexShrink:0 }} /><label htmlFor="agree" style={{ fontSize:13, color:'var(--ink-70)', lineHeight:1.5, cursor:'pointer' }}>I agree to the Protlys <a href="https://protlys.com/pages/terms" style={{ color:'var(--green-dark)', fontWeight:700 }}>Terms</a> and <a href="https://protlys.com/pages/privacy" style={{ color:'var(--green-dark)', fontWeight:700 }}>Privacy Policy</a></label></div>
        {error && <div style={errStyle}>{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading || !agreed} style={{ opacity:!agreed ? .6 : 1 }}>{loading ? <Spinner text="Creating account…" /> : 'Create account'}</button>
      </form>
      <p style={{ textAlign:'center', marginTop:18, fontSize:14, color:'var(--ink-70)' }}>Already have an account? <Link href="/login" style={{ color:'var(--green-dark)', fontWeight:700 }}>Log in</Link></p>
    </div></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  );
}

const Spinner = ({ text }) => <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/>{text}</span>;
const errStyle = { background:'#FEE2E2', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#B3261E', marginBottom:10 };
const googleBtnStyle = { width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'#fff', border:'1.5px solid var(--line)', borderRadius:12, padding:'13px 16px', fontSize:14, fontWeight:600, cursor:'pointer', color:'var(--ink)', marginTop:20, fontFamily:'inherit' };
const dividerStyle = { display:'flex', alignItems:'center', gap:12, margin:'18px 0', color:'var(--ink-45)', fontSize:13, fontWeight:600 };
