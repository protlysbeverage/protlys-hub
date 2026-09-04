-- ============================================================
-- PROTLYS HUB — MIGRATION 004
-- Social feed + challenge invite hardening
-- ============================================================

-- Invite-only challenges must be resolvable by someone holding
-- the invite link, while remaining absent from Discover.
drop policy if exists "challenges: read" on challenges;

create policy "challenges: read" on challenges for select using (
  visibility in ('public', 'invite')
  or creator_id = auth.uid()
  or exists (
    select 1
    from challenge_members
    where challenge_id = challenges.id
      and user_id = auth.uid()
  )
);

create index if not exists idx_challenges_invite_token on challenges(invite_token);
create index if not exists idx_challenge_members_user on challenge_members(user_id);
