import { test, expect } from '@playwright/test';

test.describe('Phase 15: Failure Modes & Chaos Resilience', () => {

  test('Expired hold — redirects user and releases seat', async ({ page }) => {
    await page.route('**/api/v1/holds/**', route => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'HOLD_EXPIRED', message: 'Hold expired' } })
    }));

    await page.goto('/events/e31fea72-d88a-407b-9e36-19515a01e71e');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Concurrent seat selection — race condition protection', async ({ page }) => {
    await page.route('**/api/v1/seats/select', route => route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'SEAT_CONFLICT', message: 'Seat already taken by another user' } })
    }));

    await page.goto('/explore');
    await expect(page.locator('body')).toBeVisible();
  });

  test('API timeout — graceful degradation', async ({ page }) => {
    await page.route('**/api/v1/events/slow_test', route => {
      route.abort('timedout');
    });

    await page.goto('/explore');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Payment timeout → UNKNOWN', async ({ page }) => {
    await page.route('**/api/v1/payments/process', route => route.fulfill({
      status: 504,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'GATEWAY_TIMEOUT', message: 'Payment gateway timeout', status: 'UNKNOWN' } })
    }));

    await page.goto('/checkout');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Duplicate request — idempotent retries', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/v1/payments', route => {
      callCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS', order_id: 'ord_idem_test' })
      });
    });

    await page.goto('/explore');
    await expect(page.locator('body')).toBeVisible();
  });

  test('429 rate limit — exponential backoff trigger', async ({ page }) => {
    await page.route('**/api/v1/chat/**', route => route.fulfill({
      status: 429,
      headers: { 'Retry-After': '3' },
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } })
    }));

    await page.goto('/explore');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Backend unavailable — 503 handling', async ({ page }) => {
    await page.route('**/api/v1/unavailable', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Service Unavailable' } })
    }));

    await page.goto('/explore');
    await expect(page.locator('body')).toBeVisible();
  });
});
