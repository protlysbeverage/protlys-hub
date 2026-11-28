import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Protein intake logging is not exposed; calculator and target settings remain available', () => {
  const shell = read('components/AppShell.js');
  const actions = read('app/actions.js');
  const week = read('app/hub/week/page.js');
  const goal = read('app/hub/goal/GoalClient.js');
  const calculator = read('app/calculator/CalculatorClient.js');
  assert.match(shell, /href:\s*['"]\/calculator['"]/);
  assert.doesNotMatch(actions, /logProteinAction|updateProteinLogAction|deleteProteinLogAction|from\('protein_logs'\)/);
  assert.match(week, /redirect\('\/movement'\)/);
  assert.match(goal, /router\.push\('\/account'\)/);
  assert.doesNotMatch(goal, /router\.push\('\/protein'\)/);
  assert.doesNotMatch(calculator, /router\.push\('\/protein'\)|Start logging protein/);
});

test('Protein targets are saved transactionally through the authenticated RPC', () => {
  const actions = read('app/actions.js');
  const migration = read('supabase/migrations/20261128105450_protein_log_editing_and_owner_update_checks.sql');
  assert.match(actions, /rpc\('save_protein_target'/);
  assert.match(migration, /create or replace function public\.save_protein_target/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /grant execute on function public\.save_protein_target/);
});

test('Protein intake writes are disabled without deleting existing history', () => {
  const migration = read('supabase/migrations/20261128112822_disable_protein_intake_logging.sql');
  assert.match(migration, /drop policy if exists "logs: owner insert"/);
  assert.match(migration, /drop policy if exists "protein_logs owner update"/);
  assert.match(migration, /drop policy if exists "protein_logs owner delete"/);
  assert.doesNotMatch(migration, /delete from public\.protein_logs/i);
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

test('PROT and public product copy do not advertise protein intake logging', () => {
  const dot = read('app/api/dot/route.js');
  const prompt = read('app/dot/config.js');
  const home = read('app/page.js');
  assert.doesNotMatch(dot, /protein_logs|today_g|Log protein|protein gap/);
  assert.match(dot, /protein:\{target_g:profile\?\.target_g/);
  assert.doesNotMatch(prompt, /protein logging|protein for the week/i);
  assert.doesNotMatch(home, /log protein|logging tools|record your intake/i);
});

test('New community challenges do not offer untracked protein logging challenges', () => {
  const client = read('app/challenges/new/NewChallengeClient.js');
  assert.doesNotMatch(client, /\['protein','Protein'/);
});

test('Movement summaries exclude Health Connect backfill and flagged step rows', () => {
  const weekApi = read('app/api/movement/week/route.js');
  const activity = read('app/movement/MovementActivity.js');
  const account = read('app/account/AccountClient.js');
  const sync = read('lib/movement-sync.js');
  const edge = read('supabase/functions/health-connect-sync/index.ts');
  assert.match(weekApi, /filter\(row => row\.source !== 'health_connect'\)/);
  assert.match(activity, /days\.filter\(d => d\.source !== 'health_connect'\)/);
  assert.match(account, /row => row\.source !== 'health_connect'/);
  assert.match(sync, /row\.source !== 'health_connect' && !row\.is_flagged/);
  assert.match(edge, /Only phone sensor step sync is supported/);
  assert.match(edge, /row\.source !== "health_connect" && !row\.is_flagged/);
});

test('Settings do not expose protein intake visibility or inactive notification controls', () => {
  const settings = read('app/settings/SettingsClient.js');
  assert.doesNotMatch(settings, /show_group_protein|protein intake|under-target|protlys_evening_reminder/);
  assert.match(settings, /Reminders and weekly notifications are not available yet/);
  assert.match(settings, /show_group_steps/);
  assert.match(settings, /show_active_today/);
});
