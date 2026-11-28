function localDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}

function addDays(dateStr, delta) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta, 12)).toISOString().slice(0, 10);
}

function calculateStreak(stepRows) {
  const dates = [...new Set((stepRows || []).filter(row => row.source !== 'health_connect' && !row.is_flagged && Number(row.steps || 0) > 0).map(row => row.step_date))].sort();
  if (!dates.length) return 0;

  const today = localDateStr();
  const yesterday = addDays(today, -1);
  const last = dates[dates.length - 1];
  if (last !== today && last !== yesterday) return 0;

  let streak = 1;
  for (let i = dates.length - 1; i > 0; i -= 1) {
    if (addDays(dates[i - 1], 1) !== dates[i]) break;
    streak += 1;
  }
  return streak;
}

export function extractStepCount(stats) {
  if (!stats || typeof stats !== 'object') return 0;
  const value = String(stats.steps ?? '').replace(/,/g, '').trim();
  const compact = value.match(/^(\d+(?:\.\d+)?)\s*k$/i);
  const steps = compact ? Number(compact[1]) * 1000 : Number(value);
  return Number.isFinite(steps) && steps > 0 ? Math.floor(steps) : 0;
}

export function dateFromTimestamp(timestamp) {
  const date = new Date(timestamp || '');
  if (Number.isNaN(date.getTime())) return localDateStr();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function applyMovementDelta({ supabase, userId, stepDate, delta, source = 'manual', syncedAt = null }) {
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return { ok: true };

  const { data: existing, error: existingError } = await supabase
    .from('daily_steps')
    .select('steps,source,is_flagged')
    .eq('user_id', userId)
    .eq('step_date', stepDate)
    .maybeSingle();
  if (existingError) return { error: existingError.message };

  const previousSteps = existing?.source === 'health_connect' || existing?.is_flagged ? 0 : Number(existing?.steps || 0);
  const nextSteps = Math.max(0, previousSteps + numericDelta);
  const payload = {
    user_id: userId,
    step_date: stepDate,
    steps: nextSteps,
    source,
    synced_at: syncedAt || new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('daily_steps')
    .upsert(payload, { onConflict: 'user_id,step_date' });
  if (upsertError) return { error: upsertError.message };

  const { data: allSteps, error: allStepsError } = await supabase
    .from('daily_steps')
    .select('step_date, steps, source, is_flagged')
    .eq('user_id', userId)
    .gt('steps', 0)
    .order('step_date', { ascending: true });
  if (allStepsError) return { error: allStepsError.message };

  const validSteps = (allSteps || []).filter(row => row.source !== 'health_connect' && !row.is_flagged);
  const totalSteps = validSteps.reduce((sum, row) => sum + Number(row.steps || 0), 0);
  const stepStreak = calculateStreak(validSteps);
  const lastStepDate = validSteps.length ? validSteps[validSteps.length - 1].step_date : null;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      total_steps: totalSteps,
      step_streak: stepStreak,
      last_step_date: lastStepDate,
    })
    .eq('id', userId);
  if (profileError) return { error: profileError.message };

  return { ok: true, dailyTotal: nextSteps, totalSteps, stepStreak };
}
