import { test, expect } from '@playwright/test';

test.describe('Phase 12: Operations', () => {
  test('Scenario 18: Operations dashboard — health strip and all 17 console routes render', async ({ page }) => {
    // 1. Overview
    await page.goto('/ops');
    await expect(page.getByText(/SYSTEM STATUS:/i)).toBeVisible();

    // 2. Kafka
    await page.goto('/ops/kafka');
    await expect(page.getByText('Kafka Clusters')).toBeVisible();
    await expect(page.getByText('Topic Name')).toBeVisible();
    await expect(page.getByText('Consumer Lag')).toBeVisible();

    // 3. Database
    await page.goto('/ops/database');
    await expect(page.getByText('Database Telemetry')).toBeVisible();
    await expect(page.getByText('Active Pool Conns')).toBeVisible();

    // 4. Redis
    await page.goto('/ops/redis');
    await expect(page.getByText('Redis Cluster Telemetry')).toBeVisible();
    await expect(page.getByText('Memory Used')).toBeVisible();

    // 5. Shards
    await page.goto('/ops/shards');
    await expect(page.getByText('Database Shards & Partitioning')).toBeVisible();
    await expect(page.getByText('Shard 0 (Port 5433)')).toBeVisible();

    // 6. Scheduler
    await page.goto('/ops/scheduler');
    await expect(page.getByText('Scheduler & Cron Jobs')).toBeVisible();
    await expect(page.getByText('hold_expiry_reaper').first()).toBeVisible();

    // 7. Waiting Room
    await page.goto('/ops/waiting-room');
    await expect(page.getByText('Waiting Room & Queue Control')).toBeVisible();

    // 8. Fraud Engine
    await page.goto('/ops/fraud');
    await expect(page.getByText('Fraud Detection & Risk Engine')).toBeVisible();

    // 9. Resale Engine
    await page.goto('/ops/resale');
    await expect(page.getByText('Resale Marketplace Operations')).toBeVisible();

    // 10. Wallets Ledger
    await page.goto('/ops/wallets');
    await expect(page.getByText('Wallet Ledger & System Audit')).toBeVisible();

    // 11. Payments
    await page.goto('/ops/payments');
    await expect(page.getByText('Payment Gateway Operations')).toBeVisible();

    // 12. Users
    await page.goto('/ops/users');
    await expect(page.getByText('User Directory & RBAC Control')).toBeVisible();

    // 13. Venues
    await page.goto('/ops/venues');
    await expect(page.getByText('Venue Configurations & Layouts')).toBeVisible();

    // 14. Events
    await page.goto('/ops/events');
    await expect(page.getByText('Event Lifecycle & Overrides')).toBeVisible();

    // 15. Audit Log
    await page.goto('/ops/audit-log');
    await expect(page.getByText('Compliance & Security Audit Log')).toBeVisible();

    // 16. Feature Flags
    await page.goto('/ops/feature-flags');
    await expect(page.getByText('Runtime Feature Flags')).toBeVisible();
  });
});
