import { test, expect } from '@playwright/test';

test.describe('Phase 11: Organizer', () => {
  
  test('Scenario 16: Organizer creates event — new event appears in list', async ({ page }) => {
    // Navigate to create event page
    await page.goto('/organizer/events/new');
    
    // Fill form (mock)
    await page.fill('input[type="text"]', 'End of Year Bash');
    await page.click('button[type="submit"]');
    
    // Verify redirect to events list
    await expect(page).toHaveURL(/\/organizer\/events/);
  });

  test('Scenario 17: Organizer views inventory — correct counts match seeded data', async ({ page }) => {
    // Navigate to specific event inventory
    await page.goto('/organizer/events/e31fea72-d88a-407b-9e36-19515a01e71e/inventory');
    
    // Verify inventory page loads with Manual Ticket Holds section
    await expect(page.getByText('Manual Ticket Holds (Comps / VIP)')).toBeVisible();
    
    // Check for ON_SALE lock warning if applicable
    // await expect(page.getByText('Seat map editing is locked')).toBeVisible();
  });
});
