'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-KE', { timeZone:'Africa/Nairobi', day:'numeric', month:'short', year:'numeric' }).format(new Date(value + 'T12:00:00+03:00'));
}
const UNITS = { steps:'steps', protein:'g protein', distance:'km', movement_days:'active days', stillness:'minutes' };

export default function ChallengeInviteClient({ challenge, inviteToken = '', isJoined, isAuthenticated, returnPath }) {
  const router = useRouter();
  const [joined, setJoined] = useState(isJoined);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  async function joinChallenge() {
    if (!isAuthenticated || joined || joining) return;
    setJoining(true); setError('');
    try {
      const supabase = createClient();
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) { setJoining(false); router.push('/login?next=' + encodeURIComponent(returnPath)); return; }
      const { error:joinError } = await supabase.rpc('join_challenge_by_invite_token', {
        p_challenge_id:challenge.id,
        p_invite_token:inviteToken || null,
      });
      if (joinError) throw joinError;
      setJoined(true); router.refresh();
    } catch (err) {
      setError(err?.message || 'We could not join you right now. Check the invitation and try again.');
    } finally { setJoining(false); }
  }

  const loginUrl = '/login?next=' + encodeURIComponent(returnPath);
  const signupUrl = '/signup?next=' + encodeURIComponent(returnPath);
  const type = challenge.challenge_type || 'steps';
  const target = Number(challenge.target || challenge.step_target || 0);
  const unit = UNITS[type] || 'points';
  const targetLabel = target > 0 ? target.toLocaleString('en-KE') + ' ' + unit : '';

  return <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:24,paddingBottom:40}}>
    <Link href="/challenges" style={{display:'inline-flex',alignItems:'center',gap:6,color:'var(--ink-70)',fontSize:13,fontWeight:800,textDecoration:'none',marginBottom:22}}>← Challenges</Link>
    <div style={{background:'var(--white)',border:'1.5px solid rgba(46,158,91,.28)',borderRadius:22,padding:22,boxShadow:'0 8px 30px rgba(15,42,74,.06)'}}>
      <span className="eyebrow">Protlys Challenge</span>
      <h1 style={{fontSize:29,lineHeight:1.05,margin:'7px 0 0'}}>{challenge.emoji || '🏁'} {challenge.name}</h1>
      <p style={{fontSize:14,lineHeight:1.55,color:'var(--ink-70)',margin:'12px 0 0'}}>{challenge.description || 'Join the Protlys community and take part in this challenge.'}</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginTop:20}}>
        <div style={{background:'var(--paper)',borderRadius:13,padding:13}}><div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--ink-45)'}}>Starts</div><div style={{fontSize:13,fontWeight:800,marginTop:4}}>{formatDate(challenge.start_date) || 'Now'}</div></div>
        <div style={{background:'var(--paper)',borderRadius:13,padding:13}}><div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--ink-45)'}}>Ends</div><div style={{fontSize:13,fontWeight:800,marginTop:4}}>{formatDate(challenge.end_date) || '—'}</div></div>
      </div>
      {targetLabel && <div style={{marginTop:9,background:'var(--green-soft)',borderRadius:13,padding:13,fontSize:13,fontWeight:800}}>{targetLabel} target</div>}
      {error && <div role="alert" style={{marginTop:14,padding:'11px 13px',borderRadius:12,background:'var(--berry-soft)',color:'var(--ink)',fontSize:12.5,fontWeight:700}}>{error}</div>}
      {joined ? <div style={{marginTop:20}}><div style={{padding:'12px 14px',borderRadius:13,background:'var(--green-soft)',color:'var(--green-dark)',fontSize:13,fontWeight:850}}>You are in this challenge.</div><Link href="/challenges" className="btn-primary" style={{marginTop:10,textDecoration:'none'}}>Open Challenges</Link></div> :
        isAuthenticated ? <button className="btn-primary" onClick={joinChallenge} disabled={joining} style={{marginTop:20}}>{joining?'Joining…':'Join this challenge'}</button> :
        <div style={{marginTop:20}}><p style={{fontSize:12.5,color:'var(--ink-70)',margin:'0 0 10px'}}>Log in or create your Protlys account to join. We’ll bring you back to this challenge.</p><Link href={loginUrl} className="btn-primary" style={{marginTop:0,textDecoration:'none'}}>Log in to join</Link><Link href={signupUrl} className="btn-secondary" style={{marginTop:9,textDecoration:'none'}}>Create an account</Link></div>}
    </div>
  </div>;
}
