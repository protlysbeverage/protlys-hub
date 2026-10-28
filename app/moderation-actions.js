'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function cleanSnapshot(value) {
  if (value == null) return null;
  try {
    const raw = typeof value === 'string' ? JSON.parse(value) : value;
    const text = JSON.stringify(raw);
    return text.length > 12000 ? JSON.parse(text.slice(0, 12000) + 'null') : raw;
  } catch {
    return { text: String(value).slice(0, 12000) };
  }
}

export async function blockUserAction({ blockedUserId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  if (!blockedUserId || String(blockedUserId) === String(user.id)) return { error: 'You cannot block yourself.' };

  const { error } = await supabase.from('blocks').upsert(
    { blocker_id: user.id, blocked_id: blockedUserId },
    { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }
  );
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/challenges');
  revalidatePath('/leaderboard');
  revalidatePath('/settings');
  revalidatePath(`/member/${blockedUserId}`);
  return { ok: true };
}

export async function unblockUserAction({ blockedUserId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedUserId);
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/challenges');
  revalidatePath('/leaderboard');
  revalidatePath('/settings');
  return { ok: true };
}

export async function createReportAction({
  reportedUserId,
  contentType,
  contentId,
  reason,
  details = '',
  contentSnapshot = null,
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };
  if (!reportedUserId || String(reportedUserId) === String(user.id)) return { error: 'You cannot report your own content.' };

  const allowed = new Set([
    'spam',
    'harassment/bullying',
    'hate/abusive',
    'inappropriate/sexual',
    'impersonation',
    'misleading health advice',
    'other',
  ]);
  if (!allowed.has(reason)) return { error: 'Choose a valid report reason.' };
  if (!contentType || !contentId) return { error: 'Report target is missing.' };

  const cleanDetails = String(details || '').trim().slice(0, 500);
  const { data, error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_user_id: reportedUserId,
    content_type: String(contentType).slice(0, 50),
    content_id: String(contentId).slice(0, 200),
    reason,
    details: cleanDetails || null,
    content_snapshot: cleanSnapshot(contentSnapshot),
  }).select('id').single();

  if (error) {
    if (error.code === '23505') return { ok: true, duplicate: true };
    return { error: error.message };
  }

  revalidatePath('/settings');
  return { ok: true, reportId: data?.id };
}
