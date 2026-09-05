import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import MovementPolish from './MovementPolish';

function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default async function MovementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const todayDate = new Date();
  const today = localDateStr(todayDate);
  const weekAgo = new Date(todayDate);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = localDateStr(weekAgo);

  const [
    { data: profile },
    { data: todaySteps },
    { data: weekSteps },
    { data: achievements },
    { data: currentGoal },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('display_name, step_goal, step_streak, total_steps, last_step_date, activity_level')
      .eq('id', user.id).single(),
    supabase.from('daily_steps').select('steps, source, synced_at').eq('user_id', user.id).eq('step_date', today).single(),
    supabase.from('daily_steps').select('step_date, steps').eq('user_id', user.id).gte('step_date', weekAgoStr).lte('step_date', today).order('step_date'),
    supabase.from('user_achievements')
      .select('earned_at, achievements(slug, name, icon, description)')
      .eq('user_id', user.id).order('earned_at', { ascending: false }).limit(5),
    supabase.from('goals').select('step_target, started_at').eq('user_id', user.id).eq('is_current', true).single(),
  ]);

  return (
    <AppShell>
      <MovementPolish
        profile={profile || {}}
        todaySteps={todaySteps?.steps || 0}
        lastSync={todaySteps?.synced_at || null}
        source={todaySteps?.source || null}
        weekSteps={weekSteps || []}
        recentAchievements={(achievements || []).map(a => ({ ...a.achievements, earned_at: a.earned_at }))}
        currentGoal={currentGoal?.step_target || profile?.step_goal || 7500}
        activityLevel={profile?.activity_level || null}
      />
    </AppShell>
  );
}
