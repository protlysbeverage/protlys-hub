'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function nairobiDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}

export async function logProteinAction({ productId = 'custom', productLabel = 'Protein', grams }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not signed in' };
  const value = Math.round(Number(grams));
  if (!Number.isFinite(value) || value <= 0 || value > 300) return { error: 'Enter protein between 1g and 300g.' };
  const { error: logError } = await supabase.from('protein_logs').insert({ user_id:user.id, product_id:productId, product_label:productLabel || 'Protein', grams:value, log_date:nairobiDateStr() });
  if (logError) return { error: logError.message };
  await supabase.from('profiles').update({ onboarding_complete:true }).eq('id', user.id);
  revalidatePath('/'); revalidatePath('/hub'); revalidatePath('/hub/week');
  return { ok:true };
}

export async function saveTargetAction({ targetG, source = 'custom', effectiveDate = null }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error:'Not signed in' };
  const target = Math.round(Number(targetG));
  if (!Number.isFinite(target) || target < 20 || target > 500) return { error:'Target must be between 20g and 500g.' };
  const effectiveFrom = effectiveDate || nairobiDateStr();
  const safeSource = source === 'calculator' ? 'calculator' : 'custom';

  // Keep the current profile target for the rest of the app, while also recording
  // the effective date so historical week views remain accurate after edits.
  const { error } = await supabase.from('profiles').update({ target_g:target }).eq('id', user.id);
  if (error) return { error:error.message };
  const { error: historyError } = await supabase.from('protein_target_history').insert({ user_id:user.id, target_g:target, source:safeSource, effective_from:effectiveFrom });
  if (historyError && !/protein_target_history|relation .* does not exist/i.test(historyError.message || '')) return { error:historyError.message };

  revalidatePath('/'); revalidatePath('/hub'); revalidatePath('/hub/week'); revalidatePath('/hub/goal'); revalidatePath('/calculator'); revalidatePath('/account');
  return { ok:true, historySaved:!historyError };
}

export async function completeOnboardingAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error:'Not signed in' };
  const { data: profile } = await supabase.from('profiles').select('target_g').eq('id', user.id).maybeSingle();
  await supabase.from('profiles').update({ onboarding_complete:true }).eq('id', user.id);
  if (profile?.target_g) await supabase.from('protein_target_history').insert({ user_id:user.id, target_g:Number(profile.target_g), source:'custom', effective_from:nairobiDateStr() });
  revalidatePath('/hub');
  return { ok:true };
}
