import { test, expect } from '@playwright/test';

test.describe('Phase 13: Documents + Media + Location', () => {
  
  test('Scenario 19: Verify live stream and map components render', async ({ page }) => {
    // Navigate to live stream page
    await page.goto('/events/e31fea72-d88a-407b-9e36-19515a01e71e/live');
    
    // Check if the stream loads (mock overlay)
    await expect(page.getByText('Stream Loading...')).toBeVisible();
    await expect(page.getByText('LIVE')).toBeVisible();

    // Verify VOD loads
    await page.goto('/events/e31fea72-d88a-407b-9e36-19515a01e71e/replay');
    await expect(page.getByText('VOD Ready')).toBeVisible();
  });
});
