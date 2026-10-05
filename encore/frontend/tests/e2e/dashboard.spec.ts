import { test, expect } from '@playwright/test';

test.describe('Phase 8: Tickets + Orders + Wallet', () => {
  
  test('Scenario 13: View ticket — QR + plain-text code + correct seat/event info', async ({ page }) => {
    // Navigate to ticket detail directly (assuming mock state/API)
    await page.goto('/tickets/tix_123');
    
    // Check if the ticket QR is visible
    const ticketQR = page.getByRole('img', { name: 'Ticket QR code' });
    await expect(ticketQR).toBeVisible({ timeout: 10000 });
    
    // Check if plain text code is visible (e.g. TIX_123)
    await expect(page.getByText('TIX_123', { exact: true })).toBeVisible();
    
    // Check if section/row/seat is visible
    await expect(page.getByText('Sec')).toBeVisible();
    await expect(page.getByText('Row')).toBeVisible();
    await expect(page.getByText('Seat')).toBeVisible();
  });
});
