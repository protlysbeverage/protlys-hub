import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChallengesClient from './ChallengesClient';

export default async function ChallengesPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = searchParams?.invite;
    if (token) redirect(`/login?next=/challenges?invite=${token}`);
    redirect('/login');
  }

  // Handle invite token — auto-join
  const inviteToken = searchParams?.invite;
  if (inviteToken) {
    const { data: challenge } = await supabase
      .from('challenges').select('id').eq('invite_token', inviteToken).single();
    if (challenge) {
      await supabase.from('challenge_members')
        .insert({ challenge_id: challenge.id, user_id: user.id })
        .onConflict('challenge_id,user_id').ignore();
      redirect('/challenges');
    }
  }

  // Load public + user's own challenges
  const [{ data: publicChallenges }, { data: myChallenges }, { data: profile }] = await Promise.all([
    supabase.from('challenges').select(`
      *, challenge_members(count), creator:profiles!creator_id(display_name)
    `).eq('visibility', 'public').gte('end_date', new Date().toISOString().slice(0, 10))
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('challenge_members').select(`
      challenge_id, challenges(*, challenge_members(count))
    `).eq('user_id', user.id),
    supabase.from('profiles').select('display_name, step_streak, points').eq('id', user.id).single(),
  ]);

  const myIds = new Set((myChallenges || []).map(m => m.challenge_id));

  return (
    <AppShell>
      <ChallengesClient
        publicChallenges={publicChallenges || []}
        myChallenges={(myChallenges || []).map(m => m.challenges).filter(Boolean)}
        myIds={[...myIds]}
        userId={user.id}
        profile={profile || {}}
      />
    </AppShell>
  );
}
