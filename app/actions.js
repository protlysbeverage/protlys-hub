'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function nairobiDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}

function cleanProteinLabel(value) {
  return String(value || 'Protein').trim().slice(0, 80) || 'Protein';
}

function validProteinGrams(value) {
  const grams = Math.round(Number(value));
  return Number.isFinite(grams) && grams >= 1 && grams <= 300 ? grams : null;
}

function revalidateProteinViews(userId) {
  revalidatePath('/protein');
  revalidatePath('/hub');
  revalidatePath('/hub/week');
  revalidatePath('/account');
  revalidatePath('/challenges');
  if (userId) revalidatePath('/member/' + userId);
}

export async function logProteinAction({ productId = 'custom', productLabel = 'Protein', grams }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Not signed in' };
  const value = validProteinGrams(grams);
  if (!value) return { error: 'Enter protein between 1g and 300g.' };

  const safeProductId = String(productId || 'custom').trim().slice(0, 80) || 'custom';
  const safeLabel = cleanProteinLabel(productLabel);
  const { data: log, error: logError } = await supabase
    .from('protein_logs')
    .insert({ user_id:user.id, product_id:safeProductId, product_label:safeLabel, grams:value, log_date:nairobiDateStr() })
    .select('id,product_id,product_label,grams,log_date,logged_at')
    .single();
  if (logError) return { error: logError.message };

  const { error: profileError } = await supabase.from('profiles').update({ onboarding_complete:true }).eq('id', user.id);
  revalidateProteinViews(user.id);
  return { ok:true, log, warning:profileError ? 'Protein was logged, but your profile status could not be refreshed.' : null };
}

export async function updateProteinLogAction({ logId, productLabel, grams }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error:'Not signed in' };
  const value = validProteinGrams(grams);
  if (!value) return { error:'Enter protein between 1g and 300g.' };
  const id = String(logId || '').trim();
  if (!id || id.length > 80) return { error:'Protein entry not found.' };

  const { data: log, error } = await supabase.from('protein_logs')
    .update({ product_label:cleanProteinLabel(productLabel), grams:value })
    .eq('id', id).eq('user_id', user.id)
    .select('id,product_id,product_label,grams,log_date,logged_at')
    .maybeSingle();
  if (error) return { error:error.message };
  if (!log) return { error:'This protein entry could not be found. Refresh and try again.' };
  revalidateProteinViews(user.id);
  return { ok:true, log };
}

export async function deleteProteinLogAction({ logId }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error:'Not signed in' };
  const id = String(logId || '').trim();
  if (!id || id.length > 80) return { error:'Protein entry not found.' };

  const { data: deleted, error } = await supabase.from('protein_logs')
    .delete().eq('id', id).eq('user_id', user.id)
    .select('id').maybeSingle();
  if (error) return { error:error.message };
  if (!deleted) return { error:'This protein entry could not be found. Refresh and try again.' };
  revalidateProteinViews(user.id);
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

  const { error } = await supabase.rpc('save_protein_target', {
    p_target_g:target,
    p_source:safeSource,
    p_effective_from:effectiveFrom,
  });
  if (error) return { error:error.message };

  revalidateProteinViews(user.id);
  revalidatePath('/hub/goal');
  revalidatePath('/calculator');
  return { ok:true, historySaved:true };
}

export async function confirmCalculatorTargetAction({ targetG }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error:'Not signed in' };
  const target = Math.round(Number(targetG));
  if (!Number.isFinite(target) || target < 20 || target > 500) return { error:'Target must be between 20g and 500g.' };

  const { error } = await supabase.rpc('save_protein_target', {
    p_target_g:target,
    p_source:'calculator',
    p_effective_from:nairobiDateStr(),
  });
  if (error) return { error:error.message };

  revalidateProteinViews(user.id);
  revalidatePath('/calculator');
  return { ok:true };
}

export async function completeOnboardingAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error:'Not signed in' };
  const { data: profile, error:profileError } = await supabase.from('profiles').select('target_g').eq('id', user.id).maybeSingle();
  if (profileError || !profile) return { error:profileError?.message || 'Profile not found.' };
  const { error } = await supabase.from('profiles').update({ onboarding_complete:true }).eq('id', user.id);
  if (error) return { error:error.message };
  if (profile.target_g) {
    const { error:historyError } = await supabase.from('protein_target_history').insert({
      user_id:user.id, target_g:Number(profile.target_g), source:'custom', effective_from:nairobiDateStr()
    });
    if (historyError) { revalidateProteinViews(user.id); return { ok:true, warning:'Onboarding is complete, but target history could not be saved.' }; }
  }
  revalidateProteinViews(user.id);
  return { ok:true };
}
