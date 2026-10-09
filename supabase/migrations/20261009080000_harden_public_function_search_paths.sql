-- Security hardening based on the 2026-10-09 Supabase advisor review.
-- Intentionally leaves the public member-count RPC available because the
-- app's public /api/member-count endpoint uses it and returns only an aggregate.
-- No RLS policies are added to leaderboard_settings or weekly_results:
-- these tables currently deny direct client access, which is safer than broad reads.

-- These functions already schema-qualify their table references. An empty
-- search_path prevents object-shadowing attacks if untrusted objects are added.
ALTER FUNCTION public.challenge_member_counts(bigint[]) SET search_path = '';
ALTER FUNCTION public.ensure_founding_250_member() SET search_path = '';
ALTER FUNCTION public.get_hub_member_count() SET search_path = '';

-- The founding-member RPC changes data and does not need to be callable by
-- unauthenticated visitors. Signed-in members retain access; the function
-- itself returns without changing anything if auth.uid() is null.
REVOKE EXECUTE ON FUNCTION public.ensure_founding_250_member() FROM anon;
