'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Called when a member logs a Protlys product.
// Logging is intentionally simple: save the entry and let the member review it.
export async function logProteinAction({ productId, productLabel, grams }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not signed in' };

  const today = new Date().toISOString().slice(0, 10);

  const { error: logError } = await supabase.from('protein_logs').insert({
    user_id: user.id,
    product_id: productId,
    product_label: productLabel,
    grams: grams || 0,
    log_date: today,
  });
  if (logError) return { error: logError.message };

  revalidatePath('/');
  revalidatePath('/hub');
  return { ok: true };
}

// Called by the calculator page to save a protein target for the member profile.
// The saved target is displayed informationally on the member's dashboard.
export async function saveTargetAction({ targetG }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { error } = await supabase.from('profiles').upsert({ id: user.id, target_g: targetG });
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/calculator');
  revalidatePath('/account');
  return { ok: true };
}
