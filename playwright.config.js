import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  projects: [
    { name: 'setup', testMatch: /auth\\.setup\\.js/ },
    {
      name: 'chromium-mobile-360',
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 5'],
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://hub.protlys.com',
        storageState: 'playwright/.auth/qa.json',
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 1,
        isMobile: true,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
      },
    },
  ],
});
