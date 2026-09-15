'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function Card({children,featured=false}){
  return <section style={{background:'var(--white)',border:`1.5px solid ${featured?'rgba(46,158,91,.32)':'var(--line)'}`,borderRadius:18,padding:18,boxShadow:'0 2px 10px rgba(15,42,74,.035)',marginBottom:12}}>{children}</section>;
}

function milestoneText(count, cap){
  if (!cap) return count === 0 ? 'Be one of the first to join.' : count === 1 ? 'You can start the group with one more member.' : `${count} people are already in.`;
  if (count >= cap) return 'The founding 250 is full.';
  const milestones = [10,25,50,100,150,200,250];
  const next = milestones.find(n => n > count) || cap;
  const left = next - count;
  if (count === 0) return `Be one of the first ${next} members.`;
  return `${left} more ${left === 1 ? 'member' : 'members'} to reach ${next}.`;
}

export default function ChallengesClient({challenges=[],joinedIds=[],memberCounts={}}){
  const router = useRouter();
  const supabase = createClient();
  const [joined,setJoined] = useState(() => new Set(joinedIds));
  const [counts,setCounts] = useState(() => ({...memberCounts}));
  const [joining,setJoining] = useState(null);
  const [error,setError] = useState('');

  async function joinChallenge(challengeId){
    if (joined.has(challengeId) || joining === challengeId) return;
    setError('');
    setJoining(challengeId);
    const { data:{user} } = await supabase.auth.getUser();
    if (!user){ setJoining(null); setError('Please sign in to join a challenge.'); return; }

    const { error:insertError } = await supabase.from('challenge_members').insert({challenge_id:challengeId,user_id:user.id});
    if (insertError && insertError.code !== '23505') {
      setError('We could not join you right now. Please try again.');
      setJoining(null);
      return;
    }

    setJoined(prev => new Set([...prev, challengeId]));
    setCounts(prev => ({...prev,[challengeId]:(Number(prev[challengeId])||0) + (insertError ? 0 : 1)}));
    setJoining(null);
    router.refresh();
  }

  return <div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:20,paddingBottom:24}}>
    <Link href="/hub" style={{display:'inline-flex',alignItems:'center',gap:6,color:'var(--ink-70)',fontSize:13,fontWeight:800,textDecoration:'none',marginBottom:18}}>← Back to Hub</Link>

    <div>
      <span className="eyebrow">Challenges</span>
      <h1 style={{fontSize:26,lineHeight:1.05,margin:'5px 0 0'}}>Build the habit together.</h1>
      <p className="subhead" style={{marginTop:7}}>Join a challenge when it feels right. No protein entry screens or complicated tracking here.</p>
    </div>

    {error && <div role="alert" style={{marginTop:14,padding:'11px 13px',borderRadius:12,background:'var(--berry-soft)',color:'var(--ink)',fontSize:12.5,fontWeight:700}}>{error}</div>}

    <div style={{marginTop:18}}>
      {challenges.map((challenge,index)=>{
        const id = Number(challenge.id);
        const isJoined = joined.has(id);
        const count = Number(counts[id] || 0);
        const isFounding = challenge.name === 'Founding 250';
        const cap = isFounding ? 250 : null;
        const pct = cap ? Math.min(100,Math.round((Math.min(cap,count)/cap)*100)) : 0;
        const others = isJoined ? Math.max(0,count - 1) : count;

        return <Card key={id} featured={isFounding}>
          <div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:isFounding?'var(--green-dark)':'var(--ink-45)'}}>{isFounding?'Community milestone':'Community challenge'}</div>
              <h2 style={{fontSize:20,margin:'5px 0 0'}}>{challenge.name}</h2>
              <p style={{fontSize:13,lineHeight:1.5,color:'var(--ink-70)',margin:'7px 0 0'}}>{challenge.description}</p>
            </div>
            {isFounding && <div style={{width:46,height:46,borderRadius:14,background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--green-dark)',fontWeight:900,fontSize:15,flexShrink:0}}>250</div>}
          </div>

          <div style={{marginTop:16,padding:'13px',background:'var(--paper)',borderRadius:13}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,fontSize:12,fontWeight:800}}>
              <span>{count.toLocaleString()} {count===1?'member':'members'} joined</span>
              {isFounding && <span>{Math.min(250,count)} / 250</span>}
            </div>
            {isFounding && <div style={{marginTop:9,height:7,background:'var(--green-soft)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:'var(--green)',borderRadius:99,transition:'width .25s ease'}}/></div>}
            <div style={{fontSize:11,color:'var(--ink-45)',marginTop:isFounding?7:5}}>{isJoined ? `You + ${others} ${others === 1 ? 'other member' : 'other members'} are in.` : milestoneText(count,cap)}</div>
          </div>

          {isFounding && <div style={{marginTop:10,fontSize:11.5,fontWeight:700,color:'var(--green-dark)'}}>{milestoneText(count,cap)}</div>}

          <div style={{marginTop:13,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div style={{fontSize:11.5,color:'var(--ink-45)'}}>{isJoined?'Your place is saved.':'Join now and your membership will be counted immediately.'}</div>
            <button className={isJoined?'btn-secondary':'btn-primary'} onClick={()=>joinChallenge(id)} disabled={isJoined || joining===id} style={{width:'auto',padding:'9px 15px',margin:0,whiteSpace:'nowrap',minWidth:72}}>{joining===id?'Joining…':isJoined?'Joined':'Join'}</button>
          </div>
        </Card>;
      })}
    </div>

    {!challenges.length && <Card><div style={{fontWeight:800}}>No challenges are live yet.</div><p className="subhead" style={{marginTop:5}}>Check back soon for the next Protlys community challenge.</p></Card>}
  </div>;
}
