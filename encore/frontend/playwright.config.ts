import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config (scaffold). E2E scenarios (Phase 15) live in tests/e2e.
 * The dev server is started manually or by CI; webServer is wired here so
 * `npm run test:e2e` can boot it when a base URL isn't already running.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 2,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002',
    extraHTTPHeaders: {
      'x-mock-role': 'ADMIN',
    },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- -p 3002',
        url: 'http://localhost:3002',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
