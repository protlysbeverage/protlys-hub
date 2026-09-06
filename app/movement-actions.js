'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return localDateStr(date);
}
function isValidDateString(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || ''); }
function todayStr() { return localDateStr(); }
function yesterdayStr() { return addDays(todayStr(), -1); }

export async function logStepsAction({ steps, source = 'manual', stepDate, stepTime, stepTimestamp }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const numericSteps = Number(steps);
  if (!Number.isInteger(numericSteps) || numericSteps < 1 || numericSteps > 99999) return { error: 'Enter a number between 1 and 99,999' };
  const today = todayStr();
  const selectedDate = stepDate || today;
  if (!isValidDateString(selectedDate)) return { error: 'Choose a valid date' };
  if (selectedDate > today) return { error: 'Steps cannot be logged for a future date' };

  let syncedAt = new Date().toISOString();
  if (stepTimestamp) {
    const parsedTimestamp = new Date(stepTimestamp);
    if (!Number.isNaN(parsedTimestamp.getTime())) syncedAt = parsedTimestamp.toISOString();
  } else if (/^\d{2}:\d{2}$/.test(stepTime || '')) {
    const parsedLocalKenyaTime = new Date(`${selectedDate}T${stepTime}:00+03:00`);
    if (!Number.isNaN(parsedLocalKenyaTime.getTime())) syncedAt = parsedLocalKenyaTime.toISOString();
  }

  const { data: existing } = await supabase.from('daily_steps').select('steps').eq('user_id', user.id).eq('step_date', selectedDate).single();
  const dailyTotal = (existing?.steps || 0) + numericSteps;
  const { error: upsertError } = await supabase.from('daily_steps').upsert({ user_id: user.id, step_date: selectedDate, steps: dailyTotal, source, synced_at: syncedAt }, { onConflict: 'user_id,step_date' });
  if (upsertError) return { error: upsertError.message };

  const { data: profile } = await supabase.from('profiles').select('step_streak, last_step_date, total_steps').eq('id', user.id).single();
  const newTotal = (profile?.total_steps || 0) + numericSteps;
  let newStreak = profile?.step_streak || 0;
  if (selectedDate === today) {
    const last = profile?.last_step_date;
    if (last === today) { } else if (last === yesterdayStr()) newStreak += 1; else newStreak = 1;
    await supabase.from('profiles').update({ step_streak: newStreak, last_step_date: today, total_steps: newTotal }).eq('id', user.id);
  } else {
    await supabase.from('profiles').update({ total_steps: newTotal }).eq('id', user.id);
  }
  revalidatePath('/');
  revalidatePath('/movement');
  return { ok: true, totalSteps: dailyTotal, stepDate: selectedDate, stepTime: stepTime || null, streak: newStreak };
}

export async function createChallengeAction({ name, description, stepTarget, startDate, endDate, visibility = 'public', allowTeams = false }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const cleanName = String(name || '').trim();
  const cleanDescription = String(description || '').trim() || null;
  const numericTarget = Number(stepTarget);
  if (!cleanName) return { error: 'Give the challenge a name.' };
  if (!Number.isInteger(numericTarget) || numericTarget < 1) return { error: 'Enter a valid step target.' };
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) return { error: 'Choose valid challenge dates.' };
  if (endDate < startDate) return { error: 'End date must be after the start date.' };
  if (!['public', 'invite', 'private'].includes(visibility)) return { error: 'Choose who can join this challenge.' };

  const { data: challenge, error } = await supabase.from('challenges').insert({
    creator_id: user.id,
    name: cleanName,
    description: cleanDescription,
    step_target: numericTarget,
    start_date: startDate,
    end_date: endDate,
    visibility,
    allow_teams: Boolean(allowTeams),
  }).select().single();

  if (error || !challenge) {
    return { error: error?.message || 'Could not create the challenge.' };
  }

  const { error: memberError } = await supabase.from('challenge_members').upsert(
    { challenge_id: challenge.id, user_id: user.id },
    { onConflict: 'challenge_id,user_id', ignoreDuplicates: true }
  );

  if (memberError) {
    await supabase.from('challenges').delete().eq('id', challenge.id).eq('creator_id', user.id);
    return { error: `Challenge was not created completely: ${memberError.message}` };
  }

  revalidatePath('/challenges');
  return { ok: true, challenge };
}

export async function joinChallengeAction({ challengeId, teamName }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { error } = await supabase.from('challenge_members').upsert({ challenge_id: challengeId, user_id: user.id, team_name: teamName || null }, { onConflict: 'challenge_id,user_id', ignoreDuplicates: true });
  if (error) return { error: error.message };
  revalidatePath('/challenges');
  return { ok: true };
}

export async function createPostAction({ body, imageUrl, postType = 'post', refId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  const { data, error } = await supabase.from('community_posts').insert({ user_id: user.id, body, image_url: imageUrl, post_type: postType, ref_id: refId }).select().single();
  if (error) return { error: error.message };
  revalidatePath('/community');
  return { ok: true, post: data };
}

export async function toggleLikeAction({ postId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', user.id).single();
  if (existing) await supabase.from('post_likes').delete().eq('id', existing.id); else await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
  revalidatePath('/community');
  return { ok: true, liked: !existing };
}

export async function addCommentAction({ postId, body }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  const cleanBody = String(body || '').trim();
  if (!cleanBody) return { error: 'Comment cannot be empty.' };
  const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, body: cleanBody });
  if (error) return { error: error.message };
  revalidatePath('/community');
  return { ok: true };
}

export async function setActivityLevelAction({ activityLevel }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  await supabase.from('profiles').update({ activity_level: activityLevel }).eq('id', user.id);
  revalidatePath('/movement');
  return { ok: true };
}
