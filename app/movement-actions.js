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

// Movement logging is intentionally descriptive. There are no step goals,
// milestone ladders, point rewards, or achievement triggers here.
export async function logStepsAction({ steps, source = 'manual', stepDate, stepTime, stepTimestamp }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const numericSteps = Number(steps);
  if (!Number.isInteger(numericSteps) || numericSteps < 1 || numericSteps > 99999) {
    return { error: 'Enter a number between 1 and 99,999' };
  }

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

  const { data: existing } = await supabase
    .from('daily_steps').select('steps').eq('user_id', user.id).eq('step_date', selectedDate).single();

  const dailyTotal = (existing?.steps || 0) + numericSteps;

  const { error: upsertError } = await supabase.from('daily_steps').upsert({
    user_id: user.id, step_date: selectedDate, steps: dailyTotal, source, synced_at: syncedAt,
  }, { onConflict: 'user_id,step_date' });
  if (upsertError) return { error: upsertError.message };

  const { data: profile } = await supabase
    .from('profiles').select('step_streak, last_step_date, total_steps').eq('id', user.id).single();

  const newTotal = (profile?.total_steps || 0) + numericSteps;
  let newStreak = profile?.step_streak || 0;
  const isToday = selectedDate === today;

  // Keep the existing descriptive streak data, but do not use it to create
  // milestones, goals, points, or notifications.
  if (isToday) {
    const last = profile?.last_step_date;
    if (last === today) {
      // same day, no streak change
    } else if (last === yesterdayStr()) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    await supabase.from('profiles').update({
      step_streak: newStreak,
      last_step_date: today,
      total_steps: newTotal,
    }).eq('id', user.id);
  } else {
    await supabase.from('profiles').update({ total_steps: newTotal }).eq('id', user.id);
  }

  revalidatePath('/');
  revalidatePath('/movement');
  return {
    ok: true,
    totalSteps: dailyTotal,
    stepDate: selectedDate,
    stepTime: stepTime || null,
    streak: newStreak,
  };
}

export async function createChallengeAction({ name, description, stepTarget, startDate, endDate, visibility, allowTeams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data, error } = await supabase.from('challenges').insert({
    creator_id: user.id, name, description, step_target: stepTarget,
    start_date: startDate, end_date: endDate, visibility, allow_teams: allowTeams,
  }).select().single();

  if (error) return { error: error.message };
  await supabase.from('challenge_members').insert({ challenge_id: data.id, user_id: user.id });

  revalidatePath('/challenges');
  return { ok: true, challenge: data };
}

export async function joinChallengeAction({ challengeId, teamName }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { error } = await supabase.from('challenge_members').insert({
    challenge_id: challengeId, user_id: user.id, team_name: teamName || null,
  });
  if (error) return { error: 'Already joined or challenge not found' };

  revalidatePath('/challenges');
  return { ok: true };
}

export async function createPostAction({ body, imageUrl, postType = 'post', refId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data, error } = await supabase.from('community_posts').insert({
    user_id: user.id, body, image_url: imageUrl, post_type: postType, ref_id: refId,
  }).select().single();

  if (error) return { error: error.message };
  revalidatePath('/community');
  return { ok: true, post: data };
}

export async function toggleLikeAction({ postId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: existing } = await supabase.from('post_likes')
    .select('id').eq('post_id', postId).eq('user_id', user.id).single();

  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath('/community');
  return { ok: true, liked: !existing };
}

export async function addCommentAction({ postId, body }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, body });
  revalidatePath('/community');
  return { ok: true };
}

// Kept as a compatibility action for older clients. It no longer creates a
// step goal or milestone because movement no longer uses prescribed targets.
export async function setActivityLevelAction({ activityLevel }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  await supabase.from('profiles').update({ activity_level: activityLevel }).eq('id', user.id);
  revalidatePath('/movement');
  return { ok: true };
}
