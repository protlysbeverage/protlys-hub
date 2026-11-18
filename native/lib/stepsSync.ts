
import { supabase } from '@/lib/supabase';
import StepCounter from '../modules/protlys-step-counter';

export type StepSyncResult = {
  steps: number;
  changed: boolean;
};

type ExistingStepRow = {
  step_date: string;
  steps: number;
  is_flagged: boolean;
};

function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function syncRecentDailySteps(
  userId: string,
): Promise<StepSyncResult> {
  if (!userId) {
    throw new Error('A signed-in user is required to sync steps.');
  }

  const today = getLocalDateKey();
  const recordsByDate = new Map<string, number>();

  const recentRecords = StepCounter.getRecentDailySteps(userId, 30);

  for (const record of recentRecords) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) continue;
    if (record.date > today) continue;

    const steps = Math.min(
      60000,
      Math.max(0, Math.floor(Number(record.steps) || 0)),
    );

    if (steps > 0) {
      recordsByDate.set(
        record.date,
        Math.max(recordsByDate.get(record.date) ?? 0, steps),
      );
    }
  }

  // Always include the current live sensor reading.
  const liveTodaySteps = Math.min(
    60000,
    Math.max(
      0,
      Math.floor(Number(StepCounter.getTodaySteps(userId)) || 0),
    ),
  );

  if (liveTodaySteps > 0) {
    recordsByDate.set(
      today,
      Math.max(recordsByDate.get(today) ?? 0, liveTodaySteps),
    );
  }

  const localRecords = Array.from(recordsByDate.entries())
    .map(([step_date, steps]) => ({ step_date, steps }))
    .sort((a, b) => a.step_date.localeCompare(b.step_date));

  const earliestDate =
    localRecords.length > 0 ? localRecords[0].step_date : today;

  const { data: existingRows, error: readError } = await supabase
    .from('daily_steps')
    .select('step_date, steps, is_flagged')
    .eq('user_id', userId)
    .gte('step_date', earliestDate)
    .lte('step_date', today);

  if (readError) throw readError;

  const existingByDate = new Map<string, ExistingStepRow>();

  for (const row of (existingRows ?? []) as ExistingStepRow[]) {
    existingByDate.set(row.step_date, {
      step_date: row.step_date,
      steps: Math.max(0, Number(row.steps ?? 0)),
      is_flagged: Boolean(row.is_flagged),
    });
  }

  // Never overwrite a moderation-flagged row.
  // Never lower a larger total already stored in Supabase.
  const recordsToWrite = localRecords
    .filter(record => {
      const stored = existingByDate.get(record.step_date);

      if (stored?.is_flagged) return false;

      return record.steps > (stored?.steps ?? 0);
    })
    .map(record => ({
      user_id: userId,
      step_date: record.step_date,
      steps: record.steps,
      source: 'synced',
    }));

  if (recordsToWrite.length > 0) {
    const { error: writeError } = await supabase
      .from('daily_steps')
      .upsert(recordsToWrite, {
        onConflict: 'user_id,step_date',
      });

    if (writeError) throw writeError;
  }

  const todayStored = existingByDate.get(today);

  // Flagged server values are deliberately excluded from the result.
  const verifiedTodayStored =
    todayStored && !todayStored.is_flagged
      ? todayStored.steps
      : 0;

  const todayLocal = recordsByDate.get(today) ?? 0;

  return {
    steps: Math.max(todayLocal, verifiedTodayStored),
    changed: recordsToWrite.length > 0,
  };
}

export async function syncTodaySteps(
  userId: string,
): Promise<StepSyncResult> {
  return syncRecentDailySteps(userId);
}
