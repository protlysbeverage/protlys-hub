-- Production additive moderation/terms migration. No existing table or RLS policy is modified.

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_pkey primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_id_idx on public.blocks(blocked_id);

alter table public.blocks enable row level security;
grant select, insert, delete on public.blocks to authenticated;

create policy "blocks: own select"
  on public.blocks for select to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "blocks: own insert"
  on public.blocks for insert to authenticated
  with check ((select auth.uid()) = blocker_id and blocker_id <> blocked_id);

create policy "blocks: own delete"
  on public.blocks for delete to authenticated
  using ((select auth.uid()) = blocker_id);

create table public.reports (
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  reason text not null check (reason in (
    'spam',
    'harassment/bullying',
    'hate/abusive',
    'inappropriate/sexual',
    'impersonation',
    'misleading health advice',
    'other'
  )),
  details varchar(500),
  content_snapshot jsonb,
  status text not null default 'open' check (status in ('open','reviewed','resolved','rejected')),
  created_at timestamptz not null default now(),
  constraint reports_no_self_report check (reporter_id <> reported_user_id)
);

create index reports_reported_user_idx on public.reports(reported_user_id, created_at desc);
create index reports_status_idx on public.reports(status, created_at desc);
create unique index reports_open_duplicate_idx
  on public.reports(reporter_id, content_type, content_id)
  where status = 'open';

alter table public.reports enable row level security;
grant select, insert on public.reports to authenticated;

create policy "reports: own select"
  on public.reports for select to authenticated
  using ((select auth.uid()) = reporter_id);

create policy "reports: own insert"
  on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id and reporter_id <> reported_user_id);

create table public.terms_acceptances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  constraint terms_acceptances_pkey primary key (user_id, version)
);

alter table public.terms_acceptances enable row level security;
grant select, insert on public.terms_acceptances to authenticated;

create policy "terms_acceptances: own select"
  on public.terms_acceptances for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "terms_acceptances: own insert"
  on public.terms_acceptances for insert to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function private.remove_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

revoke execute on function private.remove_follows_on_block() from public, anon, authenticated;

drop trigger if exists blocks_remove_follows_trigger on public.blocks;
create trigger blocks_remove_follows_trigger
after insert on public.blocks
for each row
execute function private.remove_follows_on_block();
