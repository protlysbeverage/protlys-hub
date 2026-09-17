-- PROTLYS HUB — MIGRATION 018
-- Allow authenticated members to view other members' logged movement.
-- The profile calendar uses daily_steps, which was previously owner-only.

drop policy if exists "steps: owner read" on public.daily_steps;

create policy "steps: authenticated read"
  on public.daily_steps
  for select
  to authenticated
  using (true);
