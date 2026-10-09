# Protlys Hub Production Hardening

Status: in progress. A checklist item is not complete until there is implementation evidence and a test result.

## Changes committed to `security/launch-hardening`
- [x] Added a database migration that fixes mutable search paths on `challenge_member_counts`, `ensure_founding_250_member`, and `get_hub_member_count`.
- [x] Migration revokes anonymous execution of the data-mutating `ensure_founding_250_member()` RPC while retaining signed-in access.
- [x] Share API returns generic client-facing database errors rather than raw database error messages.
- [x] OAuth callback and email confirmation routes use a shared same-origin redirect validator and generic client-facing errors.
- [x] Added regression tests for safe redirect destinations. The four Node test cases passed in an isolated run; the full repository CI result still needs verification.
- [x] Added branded not-found and application-error pages using the existing Protlys Hub design styles.
- [x] Vercel production build completed successfully for code commit `5d627dbbd5db18c70702340ff13e57576001e8a7`; subsequent UI changes are waiting on the latest preview build. All are preview deployments; production has not been changed.
- [ ] Confirm the GitHub Actions full test-suite result.
- [ ] Perform interactive smoke tests against the preview for sign-in, email confirmation, post sharing, and core movement/protein screens.
- [ ] Review and apply the database migration only after validating the preview and a recovery path. The migration has **not** been applied to production.

## Critical: secrets and access control
- [ ] Scan current files and full Git history for credentials; report secret types and locations without printing secret values.
- [ ] Revoke/rotate every credential ever committed, then remove exposed values from repository history where appropriate.
- [x] Reviewed Vercel environment-variable names and targets without decrypting values. The Supabase URL and anon key are public client configuration; `OPENAI_API_KEY` is marked sensitive and is configured for production only. No service-role key appears in the current Vercel variable list.
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
- [x] Added branded 404 and application error boundary pages; runtime smoke testing remains open.
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
- RLS is enabled with no policies on `public.leaderboard_settings` and `public.weekly_results`. This currently denies direct client access; do not add broad policies without proving they are needed.
- `public.challenge_member_counts` had a mutable search_path warning; the branch migration now sets it to an empty search_path.
- `public.ensure_founding_250_member()` was executable by anon; the branch migration revokes anon execution.
- `public.get_hub_member_count()` is intentionally public because the app exposes a public founding-member count. The migration hardens its search_path; the returned value is aggregate-only.
- OAuth callback and email-confirmation redirects previously accepted destinations using a simple slash-prefix check. The branch now validates against a fixed origin and has regression tests for common redirect bypasses.
- Additional security-definer RPCs are executable by authenticated users; review grants and function-level authorization before changing them because leaderboard and group features intentionally expose some aggregate data.
- Leaked-password protection is disabled and requires a Supabase Auth configuration change.
- Performance advisor reported 14 unindexed foreign-key findings and 37 RLS initialization-plan findings. Validate query plans before applying indexes or policy rewrites.
- Targeted GitHub indexed searches for several common credential markers returned no matches. This is **not** a full repository-history scan and does not prove that credentials were never committed.

## Safety rules
- Do not print, commit, or paste secret values into issues or logs.
- Do not blindly remove access from leaderboard/community functions; document intended visibility and regression-test it.
- Do not claim a backup is verified until a restore test succeeds.
- Keep work on this branch until checks pass; do not deploy database policy changes directly to production without a tested migration and rollback path.
