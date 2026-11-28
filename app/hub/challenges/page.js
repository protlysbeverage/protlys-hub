import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChallengeInviteClient from '@/components/ChallengeInviteClient';

export const dynamic = 'force-dynamic';

export default async function ChallengeInvitePage({ searchParams }) {
  const params = await searchParams;
  const challengeId = typeof params?.challenge === 'string' ? params.challenge : '';
  const inviteToken = typeof params?.invite === 'string' ? params.invite : '';
  if (!/^\d+$/.test(challengeId)) redirect('/challenges');

  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  const { data:rows, error } = await supabase.rpc('get_challenge_invite', {
    p_challenge_id:Number(challengeId),
    p_invite_token:inviteToken || null,
  });
  const challenge = Array.isArray(rows) ? rows[0] : rows;
  if (error || !challenge) redirect('/challenges');

  const { data:membership } = user
    ? await supabase.from('challenge_members').select('challenge_id').eq('challenge_id',challenge.id).eq('user_id',user.id).maybeSingle()
    : { data:null };

  const returnPath = '/hub/challenges?challenge=' + encodeURIComponent(challenge.id) + (inviteToken ? '&invite=' + encodeURIComponent(inviteToken) : '');
  return <AppShell><ChallengeInviteClient challenge={challenge} inviteToken={inviteToken} isJoined={Boolean(membership)} isAuthenticated={Boolean(user)} returnPath={returnPath}/></AppShell>;
}
