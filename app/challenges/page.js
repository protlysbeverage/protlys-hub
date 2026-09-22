import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChallengesClient from './ChallengesClient';

export default async function ChallengesPage({ searchParams }) {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return <AppShell><div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:28}}><span className="eyebrow">Challenges</span><h1 style={{fontSize:28,marginTop:6}}>Build the habit together.</h1><p className="subhead" style={{marginTop:8}}>Sign in to join Protlys community challenges.</p></div></AppShell>;

  await supabase.rpc('ensure_founding_250_member');

  const params = await searchParams;
  const inviteToken = typeof params?.invite === 'string' ? params.invite : '';
  const challengeId = typeof params?.challenge === 'string' ? params.challenge : '';

  let challengeQuery = supabase
    .from('challenges')
    .select('id,creator_id,name,description,step_target,start_date,end_date,visibility,allow_teams,invite_token,created_at,group_id');

  const { data:challengeRows } = inviteToken
    ? await challengeQuery.or(`visibility.eq.public,creator_id.eq.${user.id},invite_token.eq.${inviteToken}`).order('created_at',{ascending:false})
    : await challengeQuery.or(`visibility.eq.public,creator_id.eq.${user.id}`).order('created_at',{ascending:false});

  let challenges = challengeRows || [];
  if (challengeId && inviteToken && !challenges.some(c => String(c.id) === challengeId)) {
    const { data:invitedChallenge } = await supabase
      .from('challenges')
      .select('id,creator_id,name,description,step_target,start_date,end_date,visibility,allow_teams,invite_token,created_at,group_id')
      .eq('invite_token',inviteToken).eq('id',challengeId).maybeSingle();
    if (invitedChallenge) challenges = [invitedChallenge, ...challenges];
  }

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

  const { data:groups } = await supabase
    .from('groups')
    .select('id,name,emoji,privacy,invite_code,created_by,created_at')
    .order('created_at',{ascending:false});

  const groupRows = groups || [];
  const groupIds = groupRows.map(g=>g.id);
  const [{data:groupMemberRows},{data:groupMemberProfiles}] = await Promise.all([
    groupIds.length ? supabase.from('group_members').select('group_id,user_id,role,joined_at').in('group_id',groupIds).order('joined_at',{ascending:true}) : Promise.resolve({data:[]}),
    groupIds.length ? supabase.from('group_members').select('group_id,user_id').in('group_id',groupIds) : Promise.resolve({data:[]})
  ]);
  const groupUserIds=[...new Set((groupMemberProfiles||[]).map(r=>r.user_id))];
  const {data:groupProfiles}=groupUserIds.length ? await supabase.from('profiles').select('id,display_name,avatar_url,streak,points').in('id',groupUserIds) : {data:[]};
  const groupProfileMap=Object.fromEntries((groupProfiles||[]).map(p=>[p.id,p]));
  const groupMembersById=Object.fromEntries(groupIds.map(id=>[id,(groupMemberRows||[]).filter(r=>r.group_id===id).map(r=>({
    id:r.user_id,name:groupProfileMap[r.user_id]?.display_name||'Protlys member',avatar:groupProfileMap[r.user_id]?.avatar_url||null,
    streak:Number(groupProfileMap[r.user_id]?.streak||0),points:Number(groupProfileMap[r.user_id]?.points||0),role:r.role
  }))]));
  const activeToday=[...groupUserIds].map(id=>groupProfileMap[id]).filter(Boolean).sort((a,b)=>Number(b.streak||0)-Number(a.streak||0)).slice(0,10).map(p=>({id:p.id,name:p.display_name||'Protlys member',avatar:p.avatar_url||null,streak:Number(p.streak||0)}));

  return <AppShell><ChallengesClient
    challenges={challenges} joinedIds={joinedIds} memberCounts={memberCounts} memberPreviews={memberPreviews}
    userId={user.id} groups={groupRows} groupMembers={groupMembersById} activeToday={activeToday}
  /></AppShell>;
}
