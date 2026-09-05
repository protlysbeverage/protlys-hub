import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import AccountClient from './AccountClient';

function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getShopUrl() {
  return 'https://protlys.com/collections/all';
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = localDateStr();
  const weekAgoDate = new Date();
  weekAgoDate.setDate(weekAgoDate.getDate() - 6);
  const weekAgo = localDateStr(weekAgoDate);

  const [{ data: profile }, { data: achievements }, { data: todaySteps }, { data: weekSteps }, { data: proteinLogs }] = await Promise.all([
    supabase.from('profiles')
      .select('id, display_name, avatar_url, streak, target_g, step_streak, total_steps, step_goal')
      .eq('id', user.id)
      .single(),
    supabase.from('user_achievements')
      .select('earned_at, achievements(slug, name, icon, description)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false }),
    supabase.from('daily_steps')
      .select('steps, source, synced_at')
      .eq('user_id', user.id)
      .eq('step_date', today)
      .single(),
    supabase.from('daily_steps')
      .select('step_date, steps')
      .eq('user_id', user.id)
      .gte('step_date', weekAgo)
      .lte('step_date', today)
      .order('step_date'),
    supabase.from('protein_logs')
      .select('grams')
      .eq('user_id', user.id)
      .eq('log_date', today),
  ]);

  const todayProtein = (proteinLogs || []).reduce((sum, row) => sum + (Number(row.grams) || 0), 0);

  return (
    <AppShell>
      <AccountClient
        profile={profile || {}}
        achievements={achievements || []}
        todaySteps={todaySteps?.steps || 0}
        weekSteps={weekSteps || []}
        todayProtein={todayProtein}
        shopUrl={getShopUrl()}
        email={user.email}
      />
    </AppShell>
  );
}
