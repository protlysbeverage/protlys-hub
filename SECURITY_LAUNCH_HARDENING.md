# Protlys Hub Production Hardening

Status: in progress. This document tracks verification; a checklist item is not complete until there is implementation evidence and a test result.

## Critical: secrets and access control
- [ ] Scan current files and full Git history for credentials; report secret types and locations without printing secret values.
- [ ] Revoke/rotate every credential ever committed, then remove exposed values from repository history where appropriate.
- [ ] Confirm browser bundles contain only intentionally public configuration (Supabase URL and anon/publishable key only); server secrets must never use NEXT_PUBLIC_.
- [ ] Review every Route Handler and Server Action for authentication, authorization, method restrictions, body-size limits, schema validation, and safe errors.
- [ ] Audit RLS on every exposed table. User-owned rows must use auth.uid() ownership; public/community data needs narrowly scoped intentional policies.
- [ ] Review SECURITY DEFINER functions: fix search_path, revoke unnecessary anon/authenticated EXECUTE grants, and validate caller authorization inside the function.
- [ ] Add server-side rate limiting to expensive and mutation endpoints; use shared durable storage, not process memory alone.
- [ ] Configure AI provider hard limits if available, plus per-user quotas and a kill switch.

## Reliability and recovery
- [ ] Enable safe production error handling and error monitoring with source maps configured privately.
- [ ] Configure automated database backups/PITR appropriate to plan and retention needs.
- [ ] Restore a backup into an isolated project and verify schema, row counts, auth-dependent flows, and app smoke tests.
- [ ] Add branded not-found and error pages.
- [ ] Measure Core Web Vitals and API timings on low-end Android/slow networks; optimize measured bottlenecks over 3 seconds.

## Launch experience
- [ ] Review metadata and generate a dedicated 1200x630 Open Graph image.
- [ ] Review Privacy Policy and Terms for accuracy, contact details, retention/deletion, analytics, and any payment features actually enabled.
- [ ] Add privacy-conscious analytics and key funnel events.
- [ ] Test signup, OAuth callback, sign-in, sign-out, password reset, and payment only if payment is implemented.
- [ ] Verify SPF, DKIM, DMARC, bounce handling, and password-reset delivery.
- [ ] Add a clear contact/support route.
- [ ] Document rollback triggers, previous known-good deployment, database migration compatibility, and a tested recovery procedure.

## Known findings from the initial Supabase advisor scan (2026-10-09)
- RLS enabled but no policies: public.leaderboard_settings and public.weekly_results.
- Mutable search_path warning: public.challenge_member_counts.
- Security-definer functions callable by anon: public.ensure_founding_250_member(), public.get_hub_member_count().
- Additional security-definer RPCs are executable by authenticated users; review grants and function-level authorization before changing them because leaderboard and group features intentionally expose some aggregate data.
- Leaked-password protection is disabled.
- Performance advisor reported 14 unindexed foreign-key findings and 37 RLS initialization-plan findings. Validate query plans before applying indexes or policy rewrites.

## Safety rules
- Do not print, commit, or paste secret values into issues or logs.
- Do not blindly remove access from leaderboard/community functions; document intended visibility and regression-test it.
- Do not claim a backup is verified until a restore test succeeds.
- Keep work on this branch until checks pass; do not deploy database policy changes directly to production without a tested migration and rollback path.
