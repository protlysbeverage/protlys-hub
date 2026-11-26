import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import LeaderboardClient from './LeaderboardClient';

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/leaderboard');
  await supabase.rpc('ensure_founding_250_member');
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('name', 'Founding 250')
    .maybeSingle();
  return <AppShell><LeaderboardClient viewerId={user.id} foundingGroupId={group?.id || null} /></AppShell>;
}
