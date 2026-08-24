'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Called when a member logs a Protlys product.
// Writes the log row, then updates their streak and points.
export async function logProteinAction({ productId, productLabel, grams }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not signed in' };

  const today = new Date().toISOString().slice(0, 10);

  // 1. Insert the log entry
  const { error: logError } = await supabase.from('protein_logs').insert({
    user_id: user.id,
    product_id: productId,
    product_label: productLabel,
    grams: grams || 0,
    log_date: today,
  });
  if (logError) return { error: logError.message };

  // 2. Load current profile to update streak + points
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak, last_log_date, points')
    .eq('id', user.id)
    .single();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  let newStreak = 1;
  if (profile?.last_log_date === today) {
    newStreak = profile.streak; // already logged today, keep streak
  } else if (profile?.last_log_date === yStr) {
    newStreak = (profile.streak || 0) + 1; // continued from yesterday
  }

  const newPoints = (profile?.points || 0) + 10;

  await supabase.from('profiles').upsert({
    id: user.id,
    streak: newStreak,
    last_log_date: today,
    points: newPoints,
  });

  revalidatePath('/');
  return { ok: true };
}

// Called by the calculator page to save a protein target.
export async function saveTargetAction({ targetG }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  await supabase.from('profiles').upsert({ id: user.id, target_g: targetG });
  revalidatePath('/');
  revalidatePath('/calculator');
  return { ok: true };
}
