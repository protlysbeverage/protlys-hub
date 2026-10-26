# Protlys Hub live mobile E2E QA

Runs against https://hub.protlys.com at 360x800 Chromium mobile viewport.

## Auth
The committed suite contains no credentials. Supply a one-time Supabase magic link through `SUPABASE_TEST_MAGIC_LINK`; Playwright stores the resulting auth state in the gitignored `playwright/.auth/qa.json`.

Example:

```bash
SUPABASE_TEST_MAGIC_LINK='...' npm run test:e2e -- --project=chromium-mobile-360
```

Never commit the magic link, passwords, access tokens, or auth state.

## Coverage
Verifies Movement > Leaderboard, exactly two period tabs (`This week`, `Last week`), the Hall of Fame trophy, absence of `Most improved`, and that the status pill switches between `Ends in …` and `Final`. Three 360x800 screenshots are captured.
