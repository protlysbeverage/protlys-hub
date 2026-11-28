import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function nairobiDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit',
  }).formatToParts(new Date()).reduce((result, part) => (result[part.type]=part.value,result), {});
  return new Date(Date.UTC(Number(parts.year), Number(parts.month)-1, Number(parts.day)+offset)).toISOString().slice(0,10);
}

export async function GET() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:'Unauthorized' }, { status:401 });

  const today = nairobiDate(0);
  const weekStart = nairobiDate(-6);
  const { data, error } = await supabase.from('daily_steps')
    .select('step_date,steps,source,synced_at,is_flagged')
    .eq('user_id',user.id)
    .gte('step_date',weekStart)
    .lte('step_date',today)
    .order('step_date');

  if (error) return NextResponse.json({ error:'Unable to load movement history' }, { status:500 });

  // Historical Health Connect backfill is retained; today's total must come from the phone sensor.
  const rows = (data || []).map(row =>
    (row.step_date === today && row.source === 'health_connect') || row.is_flagged
      ? { ...row, steps:0, source:null, synced_at:null }
      : { ...row, steps:Number(row.steps || 0) }
  );
  return NextResponse.json({ rows }, { headers:{ 'Cache-Control':'private, no-store' } });
}
