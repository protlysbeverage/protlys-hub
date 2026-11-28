import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Protein navigation opens a real daily log and keeps the calculator accessible', () => {
  const shell = read('components/AppShell.js');
  const page = read('app/protein/page.js');
  const client = read('app/protein/ProteinClient.js');
  assert.match(shell, /href:\s*['"]\/protein['"]/);
  assert.match(page, /from\('protein_logs'\)/);
  assert.match(page, /from\('protein_target_history'\)/);
  assert.match(client, /href="\/calculator"/);
  assert.match(client, /href="\/hub\/week"/);
});

test('Protein log edits and deletes are authenticated and owner-scoped', () => {
  const actions = read('app/actions.js');
  const client = read('app/protein/ProteinClient.js');
  const week = read('app/hub/week/WeekClient.js');
  assert.match(actions, /export async function updateProteinLogAction/);
  assert.match(actions, /export async function deleteProteinLogAction/);
  assert.match(actions, /\.eq\('id', id\)\.eq\('user_id', user\.id\)/);
  assert.match(client, /updateProteinLogAction/);
  assert.match(client, /deleteProteinLogAction/);
  assert.match(week, /updateProteinLogAction/);
  assert.match(week, /deleteProteinLogAction/);
});

test('Protein targets are saved transactionally through the authenticated RPC', () => {
  const actions = read('app/actions.js');
  const migration = read('supabase/migrations/20261128105450_protein_log_editing_and_owner_update_checks.sql');
  assert.match(actions, /rpc\('save_protein_target'/);
  assert.match(migration, /create or replace function public\.save_protein_target/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(migration, /protein_logs owner delete/);
});

test('Feed comments respect block filtering and owners can delete their own comments', () => {
  const actions = read('app/feed-actions.js');
  const client = read('app/FeedClient.js');
  assert.match(actions, /comments: visibleComments\.map/);
  assert.doesNotMatch(actions, /comments: comments\.map/);
  assert.match(actions, /export async function deleteFeedCommentAction/);
  assert.match(actions, /You can only delete your own comments/);
  assert.match(client, /deleteFeedCommentAction/);
});

test('Feed post mutations keep database state authoritative when storage or movement sync fails', () => {
  const actions = read('app/feed-actions.js');
  const createAt = actions.indexOf('export async function createFeedPostAction');
  const updateAt = actions.indexOf('export async function updateFeedPostAction');
  const deleteAt = actions.indexOf('export async function deleteFeedPostAction');
  const commentsAt = actions.indexOf('export async function getFeedCommentsAction');
  const create = actions.slice(createAt, updateAt);
  const update = actions.slice(updateAt, deleteAt);
  const remove = actions.slice(deleteAt, commentsAt);
  assert.ok(create.indexOf('.insert({ user_id:user.id') < create.indexOf('applyMovementDelta'));
  assert.match(create, /storage\.from\('feed-images'\)\.remove/);
  assert.ok(update.indexOf('.update({ body:rawBody') < update.indexOf('storage\.from\('));
  assert.ok(remove.indexOf('.delete()') < remove.indexOf('storage\.from\('));
  assert.match(create, /return \{ ok:true, warning \}/);
  assert.match(update, /return \{ ok:true, warning \}/);
  assert.match(remove, /return \{ ok:true, warning \}/);
});

test('Challenge invitations use token-validated RPCs rather than direct membership inserts', () => {
  const page = read('app/hub/challenges/page.js');
  const client = read('components/ChallengeInviteClient.js');
  const migration = read('supabase/migrations/20261128110206_secure_challenge_invites_and_leaderboards.sql');
  assert.match(page, /rpc\('get_challenge_invite'/);
  assert.match(client, /rpc\('join_challenge_by_invite_token'/);
  assert.doesNotMatch(client, /from\('challenge_members'\)\.insert/);
  assert.match(migration, /create or replace function public\.get_challenge_invite/);
  assert.match(migration, /create or replace function public\.join_challenge_by_invite_token/);
  assert.match(migration, /c\.visibility = 'public'/);
});

test('Challenge leaderboards can read participant aggregates while respecting group privacy', () => {
  const page = read('app/challenges/page.js');
  const migration = read('supabase/migrations/20261128110335_fix_challenge_progress_return_ambiguity.sql');
  assert.match(page, /rpc\('challenge_member_previews'/);
  assert.match(page, /rpc\('challenge_progress'/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /pr\.show_group_steps/);
  assert.match(migration, /pr\.show_group_protein/);
  assert.match(migration, /revoke all on function public\.challenge_progress\(bigint\) from anon/i);
});

test('Account dashboard uses actual founding membership and Nairobi date keys', () => {
  const page = read('app/account/page.js');
  const client = read('app/account/AccountClient.js');
  assert.match(page, /from\('group_members'\)/);
  assert.match(page, /foundingMember=\{foundingMember\}/);
  assert.match(page, /from\('protein_logs'\)/);
  assert.match(client, /founding=\{Boolean\(foundingMember\)\}/);
  assert.doesNotMatch(client, /\|\|\s*true\s*\}/);
  assert.match(client, /timeZone:'Africa\/Nairobi'/);
});

test('Settings reports profile update failures and verifies affected rows', () => {
  const settings = read('app/settings/SettingsClient.js');
  assert.match(settings, /\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(settings, /Could not sign out/);
  assert.match(settings, /Support & legal/);
});


test('Movement week and calendar use Nairobi dates and sensor-only current-day totals', () => {
  const weekApi = read('app/api/movement/week/route.js');
  const movement = read('app/movement/MovementClient.js');
  const activity = read('app/movement/MovementActivity.js');
  assert.match(weekApi, /nairobiDate\(-6\)/);
  assert.match(weekApi, /row\.step_date === today && row\.source === 'health_connect'/);
  assert.match(movement, /weekLoadedRef\.current = false/);
  assert.match(movement, /protlys_movement_cache_v3/);
  assert.match(movement, /row\.step_date === todayKey && row\.source === 'health_connect'/);
  assert.match(activity, /addLocalDays/);
  assert.match(activity, /row\.step_date === todayKey && row\.source === 'health_connect'/);
});

test('Account movement cache keeps historical backfill but excludes today backfill', () => {
  const account = read('app/account/AccountClient.js');
  assert.match(account, /protlys-dashboard-cache-v3/);
  assert.match(account, /select\('step_date,steps,source'\)/);
  assert.match(account, /row\.step_date === today && row\.source === 'health_connect'/);
  assert.match(account, /addEventListener\('online', onOnline\)/);
});

test('Challenge RPCs expose invoker wrappers while keeping definer logic private', () => {
  const migration = read('supabase/migrations/20261128111103_move_challenge_definer_functions_to_private_schema.sql');
  assert.match(migration, /create or replace function private\.challenge_progress/);
  assert.match(migration, /create or replace function public\.challenge_progress/);
  assert.match(migration, /language sql stable security invoker/);
  assert.match(migration, /revoke all on function public\.challenge_progress\(bigint\) from anon/i);
});

test('Founding membership and referral RPCs require authentication', () => {
  const migration = read('supabase/migrations/20261128111427_move_account_and_referral_definers_to_private_schema.sql');
  assert.match(migration, /drop function if exists public\.add_user_to_founding_250/);
  assert.match(migration, /private\.ensure_founding_250_group_member/);
  assert.match(migration, /private\.ensure_referral_code/);
  assert.match(migration, /revoke all on function public\.ensure_referral_code\(\) from public,anon/i);
  assert.match(migration, /revoke all on function public\.get_group_member_profile\(uuid,uuid,date,text\) from public,anon/i);
});


test('Flagged movement rows are excluded consistently from daily, weekly, calendar and lifetime totals', () => {
  const todayApi = read('app/api/movement/today/route.js');
  const weekApi = read('app/api/movement/week/route.js');
  const activity = read('app/movement/MovementActivity.js');
  const account = read('app/account/AccountClient.js');
  const sync = read('supabase/functions/health-connect-sync/index.ts');
  const challenge = read('supabase/migrations/20261128111720_exclude_flagged_steps_from_challenge_progress.sql');
  assert.match(todayApi, /!todayRow\?\.is_flagged/);
  assert.match(weekApi, /row\.is_flagged/);
  assert.match(activity, /row\.is_flagged/);
  assert.match(account, /row\.is_flagged/);
  assert.match(sync, /!row\.is_flagged/);
  assert.match(sync, /stored\?\.is_flagged && incomingSteps > 0/);
  assert.match(challenge, /not coalesce\(d\.is_flagged,false\)/);
});
