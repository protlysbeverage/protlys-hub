import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChallengesClient from './ChallengesClient';

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return <AppShell><div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:28}}><span className="eyebrow">Challenges</span><h1 style={{fontSize:28,marginTop:6}}>Build the habit together.</h1><p className="subhead" style={{marginTop:8}}>Sign in to join Protlys community challenges.</p></div></AppShell>;

  const { data:challengeRows } = await supabase
    .from('challenges')
    .select('id,creator_id,name,description,step_target,start_date,end_date,visibility,allow_teams,invite_token,created_at')
    .or(`visibility.eq.public,creator_id.eq.${user.id}`)
    .order('created_at',{ascending:false});

  const challenges = challengeRows || [];
  const ids = challenges.map(c => c.id);
  const [{ data:members }, { data:counts }, { data:previewRows }] = await Promise.all([
    ids.length ? supabase.from('challenge_members').select('challenge_id').eq('user_id', user.id).in('challenge_id', ids) : Promise.resolve({data:[]}),
    ids.length ? supabase.rpc('challenge_member_counts', { p_challenge_ids: ids }) : Promise.resolve({data:[]}),
    ids.length ? supabase.from('challenge_members').select('challenge_id,user_id,joined_at').in('challenge_id',ids).order('joined_at',{ascending:true}).limit(30) : Promise.resolve({data:[]}),
  ]);

  const joinedIds = [...new Set((members || []).map(row => Number(row.challenge_id)))];
  const memberCounts = Object.fromEntries((counts || []).map(row => [Number(row.challenge_id), Number(row.member_count || 0)]));
  const previewUserIds = [...new Set((previewRows || []).map(r=>r.user_id))];
  const { data:profiles } = previewUserIds.length ? await supabase.from('profiles').select('id,display_name,avatar_url').in('id',previewUserIds) : {data:[]};
  const profileMap = Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
  const memberPreviews = Object.fromEntries(ids.map(id=>[Number(id),(previewRows||[]).filter(r=>Number(r.challenge_id)===Number(id)).slice(0,5).map(r=>({id:r.user_id,name:profileMap[r.user_id]?.display_name||'Protlys member',avatar:profileMap[r.user_id]?.avatar_url||null}))]));

  return <AppShell><ChallengesClient challenges={challenges} joinedIds={joinedIds} memberCounts={memberCounts} memberPreviews={memberPreviews} userId={user.id} /></AppShell>;
}
