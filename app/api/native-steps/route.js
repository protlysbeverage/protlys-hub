import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyMovementDelta } from '@/lib/movement-sync';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const steps = Number(body?.steps);
  const stepDate = String(body?.stepDate || '');
  const stepTimestamp = String(body?.stepTimestamp || '');

  if (!Number.isInteger(steps) || steps < 0 || steps > 999999) {
    return NextResponse.json({ error: 'Invalid step count' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stepDate)) {
    return NextResponse.json({ error: 'Invalid step date' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('daily_steps')
    .select('steps')
    .eq('user_id', user.id)
    .eq('step_date', stepDate)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const currentSteps = Number(existing?.steps || 0);
  const delta = steps - currentSteps;

  if (delta === 0) return NextResponse.json({ ok: true, dailyTotal: steps });

  const result = await applyMovementDelta({
    supabase,
    userId: user.id,
    stepDate,
    delta,
    source: 'native',
    syncedAt: stepTimestamp || new Date().toISOString(),
  });

  if (result?.error) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true, dailyTotal: result.dailyTotal, stepDate, source: 'native' });
}
