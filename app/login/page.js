'use client';

import { Suspense, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import '../globals.css';

const EyeIcon = ({ open }) => open ? (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
) : (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);

function Logo() {
  return <div style={{ textAlign:'center', marginBottom:32 }}><img src="/logo.png" alt="Protlys" style={{ width:120, height:'auto', objectFit:'contain' }} onError={e=>{e.target.style.display='none'}} /></div>;
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const emailRef = useRef();
  const passwordRef = useRef();
  const resetRef = useRef();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');
  const [resetSentTo, setResetSentTo] = useState('');

  const rawNext = searchParams.get('next');
  const nextPath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_failed') {
      setError('Google sign-in could not be completed. Please try again.');
    }
  }, [searchParams]);

  function togglePw() {
    setShowPw(v => { const next = !v; if (passwordRef.current) passwordRef.current.type = next ? 'text' : 'password'; return next; });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email:emailRef.current.value.trim(), password:passwordRef.current.value });
    if (error) { setLoading(false); setError(error.message); return; }
    window.location.assign(nextPath);
  }

  async function handleGoogle() {
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider:'google',
      options:{ redirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (error) setError(error.message);
  }

  async function handleForgot(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const supabase = createClient();
    const email = resetRef.current.value.trim();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo:`${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetSentTo(email); setMode('forgot-sent');
  }

  if (mode === 'forgot-sent') return (
    <div className="protlys-app"><div className="app-shell" style={{ justifyContent:'flex-start', overflowY:'auto' }}><div className="screen-pad" style={{ paddingTop:40 }}><Logo /><div style={{ textAlign:'center' }}><div style={{ fontSize:48, marginBottom:12 }}>📬</div><h1 style={{ fontSize:22 }}>Check your inbox</h1><p className="subhead" style={{ marginTop:8 }}>Reset link sent to <strong>{resetSentTo}</strong>. Check spam if you don't see it.</p><button className="btn-secondary" style={{ marginTop:20 }} onClick={()=>{setMode('login');setError('')}}>Back to log in</button></div></div></div></div>
  );

  if (mode === 'forgot') return (
    <div className="protlys-app"><div className="app-shell" style={{ justifyContent:'flex-start', overflowY:'auto' }}><div className="screen-pad" style={{ paddingTop:40 }}><Logo /><span className="eyebrow">Reset password</span><h1 style={{ fontSize:22 }}>Forgot your password?</h1><p className="subhead" style={{ marginTop:6 }}>We'll send a reset link to your email.</p><form onSubmit={handleForgot} style={{ marginTop:20 }}><div className="field-group"><label className="field-label" htmlFor="resetEmail">EMAIL</label><input id="resetEmail" ref={resetRef} type="email" required className="field-input" placeholder="you@example.com" autoComplete="email" /></div>{error&&<div style={errStyle}>{error}</div>}<button className="btn-primary" type="submit" disabled={loading} style={{ marginTop:6 }}>{loading?'Sending…':'Send reset link'}</button></form><p style={{ textAlign:'center', marginTop:18, fontSize:14 }}><button onClick={()=>{setMode('login');setError('')}} style={linkStyle}>← Back to log in</button></p></div></div></div>
  );

  return (
    <div className="protlys-app"><div className="app-shell" style={{ justifyContent:'flex-start', overflowY:'auto' }}><div className="screen-pad" style={{ paddingTop:40, paddingBottom:40 }}><Logo /><span className="eyebrow">Welcome back</span><h1 style={{ fontSize:22 }}>Log in to your Hub</h1>
      <button onClick={handleGoogle} style={googleBtnStyle}><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Continue with Google</button>
      <div style={dividerStyle}><span>or</span></div>
      <form onSubmit={handleLogin}><div className="field-group"><label className="field-label" htmlFor="email">EMAIL</label><input id="email" ref={emailRef} type="email" required className="field-input" placeholder="you@example.com" autoComplete="email" /></div><div className="field-group"><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}><label className="field-label" htmlFor="password" style={{ marginBottom:0 }}>PASSWORD</label><button type="button" onClick={()=>{setMode('forgot');setError('')}} style={linkStyle}>Forgot password?</button></div><div style={{ position:'relative' }}><input id="password" ref={passwordRef} type="password" required className="field-input" placeholder="Your password" autoComplete="current-password" style={{ paddingRight:48 }} /><button type="button" onClick={togglePw} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--ink-45)', display:'flex', alignItems:'center', padding:0 }}><EyeIcon open={showPw} /></button></div></div>{error&&<div style={errStyle}>{error}</div>}<button className="btn-primary" type="submit" disabled={loading}>{loading?<Spinner/>:'Log in'}</button></form>
      <p style={{ textAlign:'center', marginTop:18, fontSize:14, color:'var(--ink-70)' }}>New to Protlys? <Link href="/signup" style={{ color:'var(--green-dark)', fontWeight:700 }}>Create an account</Link></p>
    </div></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="protlys-app"><div className="app-shell" style={{ justifyContent:'center' }}><div className="screen-pad"><Logo /><p style={{ textAlign:'center', color:'var(--ink-70)' }}>Loading…</p></div></div></div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

const Spinner = () => <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/>Logging in…</span>;
const errStyle = { background:'#FEE2E2', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#B3261E', marginBottom:10 };
const linkStyle = { background:'none', border:'none', color:'var(--green-dark)', fontWeight:700, fontSize:13, cursor:'pointer', padding:0 };
const googleBtnStyle = { width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'#fff', border:'1.5px solid var(--line)', borderRadius:12, padding:'13px 16px', fontSize:14, fontWeight:600, cursor:'pointer', color:'var(--ink)', marginTop:20, fontFamily:'inherit' };
const dividerStyle = { display:'flex', alignItems:'center', gap:12, margin:'18px 0', color:'var(--ink-45)', fontSize:13, fontWeight:600 };
