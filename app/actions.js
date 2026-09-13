'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function nairobiDateStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
}

export async function logProteinAction({ productId = 'custom', productLabel = 'Protein', grams }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not signed in' };

  const value = Math.round(Number(grams));
  if (!Number.isFinite(value) || value <= 0 || value > 300) return { error: 'Enter protein between 1g and 300g.' };

  const { error: logError } = await supabase.from('protein_logs').insert({
    user_id: user.id,
    product_id: productId,
    product_label: productLabel || 'Protein',
    grams: value,
    log_date: nairobiDateStr(),
  });
  if (logError) return { error: logError.message };

  await supabase.from('profiles').update({ onboarding_complete:true }).eq('id', user.id);
  revalidatePath('/');
  revalidatePath('/hub');
  return { ok: true };
}

export async function saveTargetAction({ targetG }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const target = Math.round(Number(targetG));
  if (!Number.isFinite(target) || target < 20 || target > 500) return { error: 'Target must be between 20g and 500g.' };

  const { error } = await supabase.from('profiles').update({ target_g:target }).eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/hub');
  revalidatePath('/calculator');
  revalidatePath('/account');
  return { ok: true };
}

export async function completeOnboardingAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  const { error } = await supabase.from('profiles').update({ onboarding_complete:true }).eq('id', user.id);
  if (error) return { error:error.message };
  revalidatePath('/hub');
  return { ok:true };
}
