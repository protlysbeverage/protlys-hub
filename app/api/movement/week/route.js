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

  const todayDate = new Date();
  const today = localDateStr(todayDate);
  const start = new Date(todayDate);
  start.setDate(start.getDate() - 6);
  const weekStart = localDateStr(start);

  const { data, error } = await supabase
    .from('daily_steps')
    .select('step_date, steps, source, synced_at')
    .eq('user_id', user.id)
    .gte('step_date', weekStart)
    .lte('step_date', today)
    .order('step_date');

  if (error) return NextResponse.json({ error: 'Unable to load movement history' }, { status: 500 });

  return NextResponse.json({ rows: data || [] }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
