import { test as setup, expect } from '@playwright/test';

setup('create QA auth state from one-time magic link', async ({ page }) => {
  const magicLink = process.env.SUPABASE_TEST_MAGIC_LINK;
  if (!magicLink) throw new Error('SUPABASE_TEST_MAGIC_LINK is required. Never commit it.');
  await page.goto(magicLink, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/hub\.protlys\.com\/(login|movement)/);
  await page.context().storageState({ path: 'playwright/.auth/qa.json' });
});
