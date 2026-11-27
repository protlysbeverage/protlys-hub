import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

const META = {
  steps: { label: 'Steps', unit: 'steps', icon: '👣' },
  protein: { label: 'Protein', unit: 'g', icon: '🥛' },
  movement_days: { label: 'Movement days', unit: 'days', icon: '🏃' },
  distance: { label: 'Distance', unit: 'km', icon: '📍' },
  stillness: { label: 'Stillness', unit: 'min', icon: '🧘' },
};
const fmt = value => Number(value || 0).toLocaleString('en-US');

export default async function ChallengeLeaderboardPage({ searchParams }) {
  const params = await searchParams;
  const id = Number(params?.id || 0);
  if (!Number.isInteger(id) || id < 1) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/challenges/leaderboard?id=${id}`)}`);

  const { data: challenge } = await supabase
    .from('challenges')
    .select('id,name,emoji,challenge_type,target,step_target,start_date,end_date,visibility,group_id')
    .eq('id', id)
    .maybeSingle();
  if (!challenge) notFound();

  const { data: membership } = await supabase
    .from('challenge_members')
    .select('user_id')
    .eq('challenge_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (challenge.visibility === 'private' && !membership) notFound();

  const { data: progressRows, error } = await supabase.rpc('challenge_progress', { p_challenge_id: id });
  const rows = (progressRows || []).slice().sort((a, b) => Number(a.rank) - Number(b.rank));
  const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id,display_name,avatar_url').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles || []).map(profile => [profile.id, profile]));
  const ranked = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    name: profileMap[row.user_id]?.display_name || 'Protlys member',
    avatar: profileMap[row.user_id]?.avatar_url || null,
  }));
  const meta = META[challenge.challenge_type || 'steps'] || META.steps;
  const top = ranked.slice(0, 3);

  return (
    <AppShell>
      <div className="hub-page" style={{maxWidth:760,margin:'0 auto'}}>
        <Link href="/challenges" aria-label="Back to challenges" style={{display:'inline-flex',alignItems:'center',gap:8,color:'var(--green-dark)',fontSize:13,fontWeight:850,textDecoration:'none',padding:'8px 0 14px'}}>
          <span aria-hidden="true" style={{fontSize:22,lineHeight:1}}>‹</span> Back to challenges
        </Link>
        <div className="eyebrow">Challenge leaderboard</div>
        <h1 style={{fontSize:26,margin:'5px 0 4px'}}>{challenge.emoji || meta.icon} {challenge.name}</h1>
        <p className="page-subtitle">{meta.label} · {challenge.start_date} to {challenge.end_date}</p>

        {error ? <div className="library-coming-card"><p>Could not load this challenge leaderboard. Please try again.</p></div> : <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,marginTop:18}}>
            {top.map(row=><div key={row.user_id} style={{minWidth:0,padding:'14px 8px',border:'1px solid var(--line)',borderRadius:15,background:'var(--white)',textAlign:'center'}}>
              {row.avatar ? <img src={row.avatar} alt="" style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',margin:'0 auto 8px'}}/> : <div style={{width:44,height:44,borderRadius:'50%',background:'var(--green-soft)',color:'var(--green-dark)',display:'grid',placeItems:'center',fontWeight:900,margin:'0 auto 8px'}}>{row.name.trim().charAt(0).toUpperCase()}</div>}
              <div style={{fontSize:10,fontWeight:900,color:'var(--green-dark)'}}>#{row.rank}</div>
              <div style={{fontSize:11,fontWeight:800,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:3}}>{row.user_id === user.id ? 'You' : row.name}</div>
              <div style={{fontSize:11,color:'var(--ink-70)',marginTop:4}}>{fmt(row.progress)} {meta.unit}</div>
            </div>)}
          </div>
          <section style={{marginTop:18,border:'1px solid var(--line)',borderRadius:17,overflow:'hidden',background:'var(--white)'}}>
            {ranked.length === 0 && <div style={{padding:22,textAlign:'center',color:'var(--ink-60)'}}>No participants yet.</div>}
            {ranked.map(row=><div key={row.user_id} style={{display:'grid',gridTemplateColumns:'28px 38px minmax(0,1fr) auto',alignItems:'center',gap:9,padding:'11px 13px',borderBottom:'1px solid var(--line)',background:row.user_id===user.id?'var(--green-soft)':'transparent'}}>
              <strong style={{fontSize:12,color:'var(--green-dark)'}}>{row.rank}</strong>
              {row.avatar ? <img src={row.avatar} alt="" style={{width:34,height:34,borderRadius:'50%',objectFit:'cover'}}/> : <div style={{width:34,height:34,borderRadius:'50%',background:'var(--green-soft)',display:'grid',placeItems:'center',fontSize:12,fontWeight:900}}>{row.name.trim().charAt(0).toUpperCase()}</div>}
              <span style={{minWidth:0,fontSize:12,fontWeight:row.user_id===user.id?900:650,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.user_id===user.id?'You':row.name}</span>
              <strong style={{fontSize:12,whiteSpace:'nowrap'}}>{fmt(row.progress)} <small style={{fontSize:9,color:'var(--ink-45)'}}>{meta.unit}</small></strong>
            </div>)}
          </section>
        </>}
      </div>
    </AppShell>
  );
}
