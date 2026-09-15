import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import ChallengeInviteClient from '@/components/ChallengeInviteClient';

export default async function ChallengeInvitePage({ searchParams }) {
  const params = await searchParams;
  const challengeId = typeof params?.challenge === 'string' ? params.challenge : '';
  const inviteToken = typeof params?.invite === 'string' ? params.invite : '';

  if (!challengeId) redirect('/challenges');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('challenges')
    .select('id,creator_id,name,description,step_target,start_date,end_date,visibility,allow_teams,invite_token,created_at')
    .eq('id', challengeId);

  const { data: challenge } = inviteToken
    ? await query.or(`visibility.eq.public,creator_id.eq.${user?.id || '00000000-0000-0000-0000-000000000000'},invite_token.eq.${inviteToken}`).maybeSingle()
    : await query.or(`visibility.eq.public,creator_id.eq.${user?.id || '00000000-0000-0000-0000-000000000000'}`).maybeSingle();

  if (!challenge) redirect('/challenges');

  const { data: membership } = user
    ? await supabase.from('challenge_members').select('challenge_id').eq('challenge_id', challenge.id).eq('user_id', user.id).maybeSingle()
    : { data: null };

  const returnPath = `/hub/challenges?challenge=${encodeURIComponent(challenge.id)}${inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ''}`;

  return (
    <AppShell>
      <ChallengeInviteClient
        challenge={challenge}
        isJoined={!!membership}
        isAuthenticated={!!user}
        returnPath={returnPath}
      />
    </AppShell>
  );
}
