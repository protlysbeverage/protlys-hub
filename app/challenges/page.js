import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChallengesClient from './ChallengesClient';

const HUB_CHALLENGES = ['Founding 250', '5-Day Protein Week'];

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return <AppShell><div className="screen-pad" style={{maxWidth:620,margin:'0 auto',paddingTop:28}}><span className="eyebrow">Challenges</span><h1 style={{fontSize:28,marginTop:6}}>Build the habit together.</h1><p className="subhead" style={{marginTop:8}}>Sign in to join Protlys community challenges.</p></div></AppShell>;

  const { data:challengeRows } = await supabase
    .from('challenges')
    .select('id,name,description,start_date,end_date')
    .in('name', HUB_CHALLENGES)
    .eq('visibility','public')
    .order('id');

  const challenges = challengeRows || [];
  const ids = challenges.map(c => c.id);
  const [{ data:members }, { data:counts }] = await Promise.all([
    ids.length ? supabase.from('challenge_members').select('challenge_id').eq('user_id', user.id).in('challenge_id', ids) : Promise.resolve({data:[]}),
    ids.length ? supabase.rpc('challenge_member_counts', { p_challenge_ids: ids }) : Promise.resolve({data:[]}),
  ]);

  const joinedIds = [...new Set((members || []).map(row => Number(row.challenge_id)))];
  const memberCounts = Object.fromEntries((counts || []).map(row => [Number(row.challenge_id), Number(row.member_count || 0)]));

  return <AppShell><ChallengesClient challenges={challenges} joinedIds={joinedIds} memberCounts={memberCounts} /></AppShell>;
}
