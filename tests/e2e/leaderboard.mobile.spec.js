import { test, expect } from '@playwright/test';

test.describe('Movement leaderboard — mobile 360x800', () => {
  test('has exactly two period options and switches the status pill', async ({ page }) => {
    await page.goto('/movement?tab=leaderboard', { waitUntil: 'networkidle' });
    const periodTabs = page.locator('[role="tablist"][aria-label="Leaderboard period"] [role="tab"]');
    await expect(periodTabs).toHaveCount(2);
    await expect(periodTabs.nth(0)).toHaveText('This week');
    await expect(periodTabs.nth(1)).toHaveText('Last week');
    await expect(page.getByRole('button', { name: 'Hall of Fame', exact: true })).toHaveCount(1);
    await expect(page.getByText('Most improved', { exact: true })).toHaveCount(0);
    const ending = page.locator('.lb-ending');
    await expect(ending).toHaveText(/^Ends in \\d+d \\d+h$/);
    await page.screenshot({ path: 'test-results/leaderboard-this-week.png', fullPage: true });
    await page.getByRole('tab', { name: 'Last week', exact: true }).click();
    await expect(ending).toHaveText('Final');
    await page.getByRole('tab', { name: 'Last week', exact: true }).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: 'test-results/leaderboard-last-week.png', fullPage: true });
    await page.getByRole('tab', { name: 'This week', exact: true }).click();
    await expect(ending).toHaveText(/^Ends in \\d+d \\d+h$/);
    await page.getByRole('tab', { name: 'This week', exact: true }).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: 'test-results/leaderboard-this-week-restored.png', fullPage: true });
  });
});
