import { expect, test } from '@playwright/test';

/**
 * Scaffold smoke test — confirms the app boots and the home route renders.
 * Real E2E scenarios (1–20) are added per Phase 15.
 */
test('home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Encore', exact: true })).toBeVisible();
});
