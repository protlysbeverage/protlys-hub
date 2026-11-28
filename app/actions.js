'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function nairobiDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}

function revalidateTargetViews() {
  revalidatePath('/hub');
  revalidatePath('/hub/goal');
  revalidatePath('/calculator');
  revalidatePath('/account');
}

export async function saveTargetAction({ targetG, source = 'custom', effectiveDate = null }) {
  const supabase = await createClient();
  const { data:{ user }, error:authError } = await supabase.auth.getUser();
  if (authError || !user) return { error:'Not signed in' };
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
  revalidateTargetViews();
  return { ok:true, historySaved:true };
}

export async function confirmCalculatorTargetAction({ targetG }) {
  const supabase = await createClient();
  const { data:{ user }, error:authError } = await supabase.auth.getUser();
  if (authError || !user) return { error:'Not signed in' };
  const target = Math.round(Number(targetG));
  if (!Number.isFinite(target) || target < 20 || target > 500) return { error:'Target must be between 20g and 500g.' };

  const { error } = await supabase.rpc('save_protein_target', {
    p_target_g:target,
    p_source:'calculator',
    p_effective_from:nairobiDateStr(),
  });
  if (error) return { error:error.message };
  revalidateTargetViews();
  return { ok:true };
}

export async function completeOnboardingAction() {
  const supabase = await createClient();
  const { data:{ user }, error:authError } = await supabase.auth.getUser();
  if (authError || !user) return { error:'Not signed in' };
  const { data:profile, error:profileError } = await supabase.from('profiles').select('target_g').eq('id',user.id).maybeSingle();
  if (profileError || !profile) return { error:profileError?.message || 'Profile not found.' };
  const { error } = await supabase.from('profiles').update({ onboarding_complete:true }).eq('id',user.id);
  if (error) return { error:error.message };
  if (profile.target_g) {
    const { error:historyError } = await supabase.from('protein_target_history').insert({
      user_id:user.id, target_g:Number(profile.target_g), source:'custom', effective_from:nairobiDateStr()
    });
    if (historyError) {
      revalidateTargetViews();
      return { ok:true, warning:'Onboarding is complete, but target history could not be saved.' };
    }
  }
  revalidateTargetViews();
  return { ok:true };
}
