import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import AccountClient from './AccountClient';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: achievements }] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, avatar_url, streak, target_g, step_streak, total_steps, step_goal')
      .eq('id', user.id)
      .single(),
    supabase.from('user_achievements')
      .select('earned_at, achievements(slug, name, icon, description)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false }),
  ]);

  const shopUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'https://protlys.com';

  return (
    <AppShell>
      <AccountClient
        profile={profile || {}}
        achievements={achievements || []}
        shopUrl={shopUrl}
        email={user.email}
      />
    </AppShell>
  );
}
