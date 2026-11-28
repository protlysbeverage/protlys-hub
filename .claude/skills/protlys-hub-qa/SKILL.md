---
name: protlys-hub-qa
description: Use when auditing, repairing, or verifying Protlys Hub features, navigation, data flows, and mobile experience.
---

# Protlys Hub quality assurance

## Product constraints
- Protlys Hub is a mobile-first Next.js app at hub.protlys.com, also loaded by the Android wrapper.
- Preserve the existing Protlys identity and design system. Do not redesign unrelated screens.
- The primary areas are Feed, Movement, Challenges, Protein, and Dashboard. The blog is intentionally marked coming soon unless explicitly re-enabled.
- Movement tracking uses the Android native step counter and ACTIVITY_RECOGNITION permission. Do not introduce Health Connect, a foreground service, or a persistent notification.
- Keep Africa/Nairobi as the date boundary for daily movement and protein records.
- Respect authenticated access, Supabase row-level security, user blocks, and privacy boundaries.

## Required audit method
1. Map each visible navigation item to its route and intended user outcome.
2. Trace each feature end-to-end: UI event -> client/server action or API route -> Supabase query/RPC/storage -> returned state -> visible confirmation/error.
3. Verify loading, empty, offline, permission-denied, expired-session, and server-error states.
4. Check that displayed values are sourced from real data, not placeholders or hardcoded zeros. Distinguish temporary initial state from final loaded state.
5. Verify every internal link and every primary action on a narrow Android viewport.
6. Add or update automated tests for regressions. Use Playwright for browser flows and existing Node tests for pure logic.
7. Run the production build and relevant test suites. Report commands, outcomes, and any checks that could not be run.

## Safety and implementation rules
- Inspect the current branch and working tree before editing.
- Work on a dedicated branch. Do not push directly to main.
- Make one coherent change at a time and explain its user-visible effect.
- Never claim a feature works merely because a component renders. Verify its full data path.
- Never fabricate seed data or mask failed requests with success states.
- Preserve existing Android WebView/TWA behavior and responsive safe-area handling.
- Do not change database schema or RLS policies without a migration and explicit review.
- Do not deploy to production until build, tests, and review pass.
