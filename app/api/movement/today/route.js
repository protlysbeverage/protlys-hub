import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function localDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = localDateStr();
  const [{ data: profile }, { data: todayRow }] = await Promise.all([
    supabase
      .from('profiles')
      .select('total_steps, step_streak, step_goal, display_name, avatar_url')
      .eq('id', user.id)
      .single(),
    supabase
      .from('daily_steps')
      .select('steps, source, synced_at')
      .eq('user_id', user.id)
      .eq('step_date', today)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    date: today,
    steps: Number(todayRow?.steps || 0),
    source: todayRow?.source || null,
    syncedAt: todayRow?.synced_at || null,
    totalSteps: Number(profile?.total_steps || 0),
    currentStreak: Number(profile?.step_streak || 0),
    stepGoal: Number(profile?.step_goal || 7500),
    displayName: profile?.display_name || null,
    avatarUrl: profile?.avatar_url || '',
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
