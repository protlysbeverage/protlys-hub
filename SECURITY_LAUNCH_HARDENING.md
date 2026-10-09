# Protlys Hub Production Hardening

Status: in progress. A checklist item is not complete until there is implementation evidence and a test result.

## Changes committed to `security/launch-hardening`
- [x] Added a database migration that fixes mutable search paths on `challenge_member_counts`, `ensure_founding_250_member`, and `get_hub_member_count`. Inspected the live function definitions: referenced tables and `auth.uid()` are schema-qualified, so an empty search path is compatible with these definitions.
- [x] Migration revokes anonymous execution of the data-mutating `ensure_founding_250_member()` RPC while retaining signed-in access.
- [x] Share API returns generic client-facing database errors rather than raw database error messages.
- [x] OAuth callback and email confirmation routes use a shared same-origin redirect validator and generic client-facing errors.
- [x] Added regression tests for safe redirect destinations. Four redirect test groups pass in CI.
- [x] Added branded not-found and application-error pages using the existing Protlys Hub design styles.
- [x] Preview for commit `9e5a724587728c7e263e0b1ac6da441dd6ebebf3` reports READY. Basic HTTP checks confirmed the app shell and branded 404 content; this is not a full interactive/authenticated smoke test. The latest code commits are awaiting their own preview deployment results.
- [x] Reviewed Vercel environment-variable names and targets without decrypting values. The Supabase URL and anon key are public client configuration; `OPENAI_API_KEY` is marked sensitive and configured for production only. No service-role key appears in the current Vercel variable list.
- [x] GitHub Actions unit tests pass on commit `687a269ca6059b3686493cdef14ab93dd3af1636` (12 tests, 12 passed). Fixed CI setup for the repo's missing lockfile and corrected stale heatmap tests to match the app's 35-day display. A lockfile is still needed for reproducible dependency installs.
- [ ] Perform interactive preview smoke tests for sign-in, email confirmation, post sharing, and core movement/protein screens. These require a real test account/session.
- [ ] Apply the database migration only after confirming recovery arrangements and validating expected app behavior. The migration has **not** been applied to production; do not claim the live database is hardened by this branch yet.

## Critical: secrets and access control
- [ ] Scan current files and full Git history for credentials; report secret types and locations without printing secret values.
- [ ] Revoke/rotate every credential ever committed, then remove exposed values from repository history where appropriate. This requires completing the history scan first.
- [x] Reviewed Vercel environment-variable names and targets without decrypting values. The Supabase URL and anon key are public client configuration; `OPENAI_API_KEY` is marked sensitive and configured for production only. No service-role key appears in the current Vercel variable list.
- [ ] Confirm browser bundles contain only intentionally public configuration (Supabase URL and anon/publishable key only); server secrets must never use NEXT_PUBLIC_. Environment variable names/targets were reviewed, but bundle contents have not yet been exhaustively audited.
- [ ] Review every Route Handler and Server Action for authentication, authorization, method restrictions, body-size limits, schema validation, and safe errors.
- [ ] Audit RLS on every exposed table. User-owned rows must use auth.uid() ownership; public/community data needs narrowly scoped intentional policies.
- [ ] Review SECURITY DEFINER functions: fix search_path, revoke unnecessary anon/authenticated EXECUTE grants, and validate caller authorization inside each function.
- [ ] Add server-side rate limiting to expensive and mutation endpoints; use shared durable storage, not process memory alone. No shared rate-limit store is configured/verified yet.
- [ ] Configure AI provider hard limits if available, plus per-user quotas and a kill switch.

## Reliability and recovery
- [ ] Enable production error monitoring with private source maps. Branded error UI is present, but monitoring is not configured/verified. Vercel runtime logs could not be retrieved for a 24-hour window on the current plan, so this is not evidence that production has no errors.
- [ ] Configure automated database backups/PITR appropriate to plan and retention needs.
- [ ] Restore a backup into an isolated project and verify schema, row counts, auth-dependent flows, and app smoke tests.
- [x] Added branded 404 and application error boundary pages; basic preview response checked, interactive runtime testing remains open.
- [x] Confirmed `next.config.mjs` already sets `nosniff`, frame denial, strict referrer policy, a restrictive permissions policy, and HSTS headers. No CSP was added because the app's inline scripts/styles and external resource needs have not been audited.
- [ ] Measure Core Web Vitals and API timings on low-end Android/slow networks; optimize measured bottlenecks over 3 seconds.

## Launch experience
- [ ] Review metadata and generate a dedicated 1200x630 Open Graph image. Current metadata points to the logo, not a dedicated social preview image.
- [ ] Review Privacy Policy and Terms for accuracy, contact details, retention/deletion, analytics, and any payment features actually enabled.
- [ ] Add privacy-conscious analytics and key funnel events.
- [ ] Test signup, OAuth callback, sign-in, sign-out, password reset, and payment only if payment is implemented.
- [ ] Verify SPF, DKIM, DMARC, bounce handling, and password-reset delivery.
- [ ] Add a clear contact/support route.
- [ ] Document rollback triggers, previous known-good deployment, database migration compatibility, and a tested recovery procedure.

## Known findings from the initial Supabase advisor scan (2026-10-09)
- RLS is enabled with no policies on `public.leaderboard_settings` and `public.weekly_results`. This currently denies direct client access; do not add broad policies without proving they are needed.
- `public.challenge_member_counts` had a mutable search_path warning; the branch migration sets it to an empty search_path.
- `public.ensure_founding_250_member()` was executable by anon; the branch migration revokes anon execution.
- `public.get_hub_member_count()` is intentionally public because the app exposes a public founding-member count. The migration hardens its search_path; the returned value is aggregate-only.
- OAuth callback and email-confirmation redirects previously accepted destinations using a simple slash-prefix check. The branch now validates against a fixed origin and has regression tests for common redirect bypasses.
- Additional security-definer RPCs are executable by authenticated users; review grants and function-level authorization before changing them because leaderboard and group features intentionally expose some aggregate data.
- Leaked-password protection is disabled and requires a Supabase Auth configuration change.
- Performance advisor reported 14 unindexed foreign-key findings and 37 RLS initialization-plan findings. Validate query plans before applying indexes or policy rewrites.
- Targeted GitHub indexed searches for several common credential markers returned no matches. This is **not** a full repository-history scan and does not prove that credentials were never committed.
- Read-only inspection of live SECURITY DEFINER function grants confirmed the branch migration is not applied: `ensure_founding_250_member()` still lists `anon:EXECUTE` and the public functions still have `search_path=public` where applicable. No production SQL was changed.

## Safety rules
- Do not print, commit, or paste secret values into issues or logs.
- Do not blindly remove access from leaderboard/community functions; document intended visibility and regression-test it.
- Do not claim a backup is verified until a restore test succeeds.
- Keep work on this branch until checks pass; do not deploy database policy changes directly to production without a tested migration and rollback path.
