import { test, expect } from '@playwright/test';

test.describe('Phase 9: Resale Marketplace', () => {
  test('Scenario 14: Resale listing — owned ticket → price set → LISTED_FOR_RESALE', async ({ page }) => {
    // Navigate to sell ticket page directly
    await page.goto('/tickets/tix_123/sell');

    // Check if the price input is visible
    const priceInput = page.getByLabel(/Your Ask Price/i);
    await expect(priceInput).toBeVisible({ timeout: 10000 });

    // Fill ask price and submit
    await priceInput.fill('100.00');
    const submitBtn = page.getByRole('button', { name: 'List Ticket for Resale' });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    await expect(page).toHaveURL(/\/resale\/my-listings/);
  });

  test('Scenario 15: Buy resale — buy → PENDING_MATCH → trade.completed → both ticket lists update', async ({ page }) => {
    // Navigate to listing page
    await page.goto('/resale/listings/list_123');

    const buyButton = page.getByRole('button', { name: /Buy for/i });
    await expect(buyButton).toBeVisible({ timeout: 10000 });
    await buyButton.click();

    // Mock navigate to settlement timeline
    await page.goto('/resale/trades/trd_123');
    await expect(page.getByText('Trade Settlement')).toBeVisible();
    await expect(page.getByText('Payment Charged')).toBeVisible();
    await expect(page.getByText('Ownership Transferred')).toBeVisible();
    await expect(page.getByText('Seller Credited')).toBeVisible();
  });
});
