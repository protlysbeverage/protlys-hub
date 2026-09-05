'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ── helpers ──────────────────────────────────────────────────
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

// Smart step goals — based on activity level
const GOAL_LADDER = {
  low:      [3000, 4000, 5000, 7500, 10000],
  moderate: [5000, 7500, 10000, 12500, 15000],
  high:     [7500, 10000, 12500, 15000, 20000],
};

function nextGoal(activityLevel, currentTarget) {
  const ladder = GOAL_LADDER[activityLevel] || GOAL_LADDER.moderate;
  const idx = ladder.indexOf(currentTarget);
  return idx >= 0 && idx < ladder.length - 1 ? ladder[idx + 1] : null;
}

// ── AWARD POINTS (internal) ──────────────────────────────────
async function awardPoints(supabase, userId, points, reason, refId = null) {
  await supabase.from('user_points').insert({ user_id: userId, points, reason, ref_id: refId });
  const { data: p } = await supabase.from('profiles').select('points').eq('id', userId).single();
  await supabase.from('profiles').update({ points: (p?.points || 0) + points }).eq('id', userId);
}

// ── AWARD ACHIEVEMENT (internal) ─────────────────────────────
async function awardAchievement(supabase, userId, slug) {
  const { data: ach } = await supabase.from('achievements').select('*').eq('slug', slug).single();
  if (!ach) return;
  const { error } = await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: ach.id });
  if (error) return; // already earned
  await awardPoints(supabase, userId, ach.points, 'achievement', ach.id);
  await supabase.from('notifications').insert({
    user_id: userId, type: 'achievement',
    title: `Achievement unlocked: ${ach.name}`,
    body: ach.description, ref_id: ach.id,
  });
  await supabase.from('community_posts').insert({
    user_id: userId, post_type: 'milestone',
    body: `Just earned the "${ach.name}" achievement! ${ach.icon}`,
    ref_id: ach.id,
  });
}

// ── LOG STEPS ────────────────────────────────────────────────
export async function logStepsAction({ steps, source = 'manual', stepDate, stepTime }) {
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

  // Keep manual timestamps available without changing the daily_steps schema.
  // synced_at is the precise date/time the entry was submitted/logged.
  const now = new Date();
  let syncedAt = now.toISOString();
  if (selectedDate !== today) {
    const safeTime = /^\d{2}:\d{2}$/.test(stepTime || '') ? stepTime : '12:00';
    syncedAt = new Date(`${selectedDate}T${safeTime}:00`).toISOString();
  } else if (/^\d{2}:\d{2}$/.test(stepTime || '')) {
    syncedAt = new Date(`${selectedDate}T${stepTime}:00`).toISOString();
  }

  const { data: existing } = await supabase
    .from('daily_steps').select('steps').eq('user_id', user.id).eq('step_date', selectedDate).single();

  const dailyTotal = (existing?.steps || 0) + numericSteps;

  const { error: upsertError } = await supabase.from('daily_steps').upsert({
    user_id: user.id, step_date: selectedDate, steps: dailyTotal, source, synced_at: syncedAt,
  }, { onConflict: 'user_id,step_date' });
  if (upsertError) return { error: upsertError.message };

  const { data: profile } = await supabase
    .from('profiles').select('step_streak, last_step_date, total_steps, step_goal, activity_level, points')
    .eq('id', user.id).single();

  const goal = profile?.step_goal || 7500;
  const newTotal = (profile?.total_steps || 0) + numericSteps;
  let newStreak = profile?.step_streak || 0;
  const isToday = selectedDate === today;

  // Historical entries contribute to lifetime totals but never rewrite today's streak.
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

  // Achievements are based on the selected day's accumulated steps, while streak achievements
  // only react to current-day logging.
  if (dailyTotal >= 1 && !existing) await awardAchievement(supabase, user.id, 'first_steps');
  if (dailyTotal >= 5000)  await awardAchievement(supabase, user.id, 'steps_5k');
  if (dailyTotal >= 10000) await awardAchievement(supabase, user.id, 'steps_10k');
  if (dailyTotal >= 15000) await awardAchievement(supabase, user.id, 'steps_15k');
  if (newTotal >= 1000000) await awardAchievement(supabase, user.id, 'steps_1m');
  if (isToday && newStreak >= 3)  await awardAchievement(supabase, user.id, 'streak_3');
  if (isToday && newStreak >= 7)  await awardAchievement(supabase, user.id, 'streak_7');
  if (isToday && newStreak >= 30) await awardAchievement(supabase, user.id, 'streak_30');

  const weekStart = addDays(today, -6);
  const { data: weekRows } = await supabase.from('daily_steps')
    .select('steps').eq('user_id', user.id).gte('step_date', weekStart).lte('step_date', today);
  const weekTotal = (weekRows || []).reduce((s, r) => s + r.steps, 0);
  if (weekTotal >= 50000)  await awardAchievement(supabase, user.id, 'steps_50k_week');
  if (weekTotal >= 100000) await awardAchievement(supabase, user.id, 'steps_100k_week');

  // Smart milestone advancement only happens when TODAY reaches the current daily goal.
  let milestoneReached = false;
  let next = null;
  if (isToday && dailyTotal >= goal) {
    const actLevel = profile?.activity_level || 'moderate';
    next = nextGoal(actLevel, goal);
    const { data: currentGoalRow } = await supabase.from('goals')
      .select('id').eq('user_id', user.id).eq('is_current', true).eq('step_target', goal).single();

    if (currentGoalRow) {
      milestoneReached = true;
      await supabase.from('goals').update({ achieved_at: today, is_current: false }).eq('id', currentGoalRow.id);
      if (next) {
        await supabase.from('goals').insert({ user_id: user.id, step_target: next, is_current: true });
        await supabase.from('profiles').update({ step_goal: next }).eq('id', user.id);
      }
      await awardPoints(supabase, user.id, 25, 'step_milestone');
      await supabase.from('notifications').insert({
        user_id: user.id, type: 'achievement',
        title: `Goal hit! ${goal.toLocaleString()} steps`,
        body: next ? `New goal: ${next.toLocaleString()} steps` : 'You\'ve reached the top tier!',
      });
    }
  }

  revalidatePath('/');
  revalidatePath('/movement');
  return {
    ok: true,
    totalSteps: dailyTotal,
    goal,
    streak: newStreak,
    stepDate: selectedDate,
    stepTime: stepTime || null,
    milestoneReached,
    nextGoal: next,
  };
}

// ── CREATE CHALLENGE ─────────────────────────────────────────
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
  await awardAchievement(supabase, user.id, 'challenge_first');
  await awardPoints(supabase, user.id, 10, 'challenge_create', data.id);

  revalidatePath('/challenges');
  return { ok: true, challenge: data };
}

// ── JOIN CHALLENGE ────────────────────────────────────────────
export async function joinChallengeAction({ challengeId, teamName }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { error } = await supabase.from('challenge_members').insert({
    challenge_id: challengeId, user_id: user.id, team_name: teamName || null,
  });
  if (error) return { error: 'Already joined or challenge not found' };

  await awardAchievement(supabase, user.id, 'challenge_first');
  await awardPoints(supabase, user.id, 5, 'challenge_join', challengeId);

  revalidatePath('/challenges');
  return { ok: true };
}

// ── CREATE COMMUNITY POST ─────────────────────────────────────
export async function createPostAction({ body, imageUrl, postType = 'post', refId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data, error } = await supabase.from('community_posts').insert({
    user_id: user.id, body, image_url: imageUrl, post_type: postType, ref_id: refId,
  }).select().single();

  if (error) return { error: error.message };
  await awardPoints(supabase, user.id, 2, 'community', data.id);
  revalidatePath('/community');
  return { ok: true };
}

// ── LIKE POST ────────────────────────────────────────────────
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

// ── ADD COMMENT ──────────────────────────────────────────────
export async function addCommentAction({ postId, body }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, body });
  revalidatePath('/community');
  return { ok: true };
}

// ── UPDATE ACTIVITY LEVEL ────────────────────────────────────
export async function setActivityLevelAction({ activityLevel }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const ladder = GOAL_LADDER[activityLevel] || GOAL_LADDER.moderate;
  const initialGoal = ladder[0];

  await supabase.from('profiles').update({ activity_level: activityLevel, step_goal: initialGoal }).eq('id', user.id);
  const { data: existing } = await supabase.from('goals').select('id').eq('user_id', user.id).eq('is_current', true).single();
  if (!existing) {
    await supabase.from('goals').insert({ user_id: user.id, step_target: initialGoal, is_current: true });
  }
  revalidatePath('/movement');
  return { ok: true, goal: initialGoal };
}
