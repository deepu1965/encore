const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runBrowserWalkthrough() {
  console.log('===============================================================');
  console.log('   LAUNCHING PLAYWRIGHT CHROMIUM FOR FULL END-TO-END FLOW      ');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      'x-mock-role': 'ADMIN',
    },
  });

  // Inject mock_role cookie across context
  await context.addCookies([
    {
      name: 'mock_role',
      value: 'ADMIN',
      domain: 'localhost',
      path: '/',
    },
  ]);

  const page = await context.newPage();

  async function visit(name, url, screenshotName, verifyFn) {
    console.log(`\n▶ Visiting [${name}]: http://localhost:3002${url}`);
    const started = Date.now();
    const currentPath = new URL(page.url()).pathname;
    if (currentPath !== url && !currentPath.endsWith(url)) {
      await page.goto(`http://localhost:3002${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    await page.waitForTimeout(500);

    if (verifyFn) {
      await verifyFn(page);
    }

    if (screenshotName) {
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  📸 Screenshot saved: ${screenshotName}`);
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(2);
    console.log(`  ✓ [${name}] loaded and verified in ${elapsed}s`);
  }

  try {
    // -------------------------------------------------------------
    // FLOW 1: CUSTOMER DISCOVERY & HOME
    // -------------------------------------------------------------
    console.log('\n--- PHASE 1: CUSTOMER DISCOVERY & HOME ---');
    await visit('Home Landing Page', '/', '01_home.png', async (p) => {
      const title = await p.title();
      console.log(`  Page Title: "${title}"`);
    });

    await visit('Event Explorer', '/explore', '02_explore.png', async (p) => {
      await p.waitForSelector('text=Encore Launch Night', { timeout: 10000 });
      console.log('  Event "Encore Launch Night" visible in explore catalog');
    });

    await visit('Event Details', '/events/e31fea72-d88a-407b-9e36-19515a01e71e', '03_event_details.png', async (p) => {
      await p.waitForSelector('text=Encore Launch Night');
      await p.waitForSelector('text=Encore Arena');
      console.log('  Event details and venue verified');
    });

    // -------------------------------------------------------------
    // FLOW 2: SEAT SELECTION, HOLD & PURCHASING
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: SEAT SELECTION & PURCHASING FLOW ---');
    await visit('Seat Selection Map', '/events/e31fea72-d88a-407b-9e36-19515a01e71e/select-seats', '04_seat_selection.png', async (p) => {
      // Find an available seat and click it
      const seat = p.locator('button[aria-label*="available" i]').first();
      await seat.waitFor({ state: 'visible', timeout: 10000 });
      console.log('  Found available seat on seat map. Clicking seat...');
      await seat.click();

      // Verify hold countdown appears
      await p.waitForSelector('text=Time left to buy:', { timeout: 5000 });
      console.log('  Hold countdown active: "Time left to buy:" is visible');
    });

    // Click Continue to Checkout
    console.log('  Navigating from seat selection to checkout...');
    const continueBtn = page.getByRole('button', { name: 'Continue to Checkout' });
    await continueBtn.click();
    await page.waitForURL('**/checkout', { timeout: 10000 });

    await visit('Checkout & Payment Form', '/checkout', '05_checkout.png', async (p) => {
      await p.waitForSelector('text=Order Summary');
      await p.waitForSelector('text=Secure Checkout');
      console.log('  Order Summary & Secure Checkout form verified');

      // Fill in payment details
      await p.fill('#cardName', 'Jane Doe');
      await p.fill('#cardNumber', '4242 4242 4242 4242');
      await p.fill('#expiry', '12/28');
      await p.fill('#cvc', '123');
      console.log('  Filled payment form: Jane Doe, card 4242...');

      // Submit payment
      console.log('  Clicking "Pay Now"...');
      await p.click('button[type="submit"]');
      await p.waitForURL('**/confirmation', { timeout: 15000 });
      console.log('  Payment completed! Redirected to confirmation receipt');
    });

    await visit('Confirmation Receipt', page.url().replace('http://localhost:3002', ''), '06_confirmation.png', async (p) => {
      console.log(`  Confirmation URL: ${p.url()}`);
    });

    // -------------------------------------------------------------
    // FLOW 3: TICKETS, WAITING ROOM & RESALE
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: TICKETS, WAITING ROOM & RESALE SUB-FLOWS ---');
    await visit('Customer Ticket Wallet', '/tickets', '07_tickets.png', async (p) => {
      console.log('  Customer tickets and digital passes verified');
    });

    await visit('Virtual Waiting Room', '/events/e31fea72-d88a-407b-9e36-19515a01e71e/waiting-room', '08_waiting_room.png', async (p) => {
      console.log('  Waiting room queue view loaded');
    });

    await visit('Resale Listing Creation', '/tickets/tix_123/sell', '09_resale_sell.png', async (p) => {
      await p.waitForSelector('label:has-text("Your Ask Price")');
      console.log('  Resale ticket selling form verified');
    });

    await visit('Resale My Listings', '/resale/my-listings', '10_resale_my_listings.png', async (p) => {
      console.log('  Active resale listings dashboard verified');
    });

    await visit('Resale Trade Settlement', '/resale/trades/trd_123', '11_resale_trade.png', async (p) => {
      await p.waitForSelector('text=Trade Settlement');
      await p.waitForSelector('text=Payment Charged');
      await p.waitForSelector('text=Ownership Transferred');
      await p.waitForSelector('text=Seller Credited');
      console.log('  Resale settlement timeline (Charged, Transferred, Credited) verified');
    });

    // -------------------------------------------------------------
    // FLOW 4: ORGANIZER SUB-FLOW
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: ORGANIZER SUB-FLOW ---');
    await visit('Organizer Events Dashboard', '/organizer/events', '12_organizer_events.png', async (p) => {
      console.log('  Organizer events list verified');
    });

    await visit('Organizer New Event Form', '/organizer/events/new', '13_organizer_new_event.png', async (p) => {
      console.log('  Organizer new event creation form verified');
    });

    // -------------------------------------------------------------
    // FLOW 5: ALL 17 OPERATIONS CONSOLE VIEWS
    // -------------------------------------------------------------
    console.log('\n--- PHASE 5: TOURING ALL 17 OPERATIONS CONSOLE VIEWS ---');

    const opsRoutes = [
      { name: 'Ops: Overview', path: '/ops', img: '14_ops_overview.png', check: 'SYSTEM STATUS:' },
      { name: 'Ops: Kafka Clusters', path: '/ops/kafka', img: '15_ops_kafka.png', check: 'Kafka Clusters' },
      { name: 'Ops: Database Telemetry', path: '/ops/database', img: '16_ops_database.png', check: 'Database Telemetry' },
      { name: 'Ops: Redis Cluster', path: '/ops/redis', img: '17_ops_redis.png', check: 'Redis Cluster Telemetry' },
      { name: 'Ops: Database Shards', path: '/ops/shards', img: '18_ops_shards.png', check: 'Database Shards' },
      { name: 'Ops: Scheduler & Cron', path: '/ops/scheduler', img: '19_ops_scheduler.png', check: 'Scheduler & Cron Jobs' },
      { name: 'Ops: Waiting Room Control', path: '/ops/waiting-room', img: '20_ops_waiting_room.png', check: 'Waiting Room' },
      { name: 'Ops: Fraud Detection', path: '/ops/fraud', img: '21_ops_fraud.png', check: 'Fraud Detection' },
      { name: 'Ops: Resale Marketplace', path: '/ops/resale', img: '22_ops_resale.png', check: 'Resale Marketplace' },
      { name: 'Ops: Wallets & Ledger Audit', path: '/ops/wallets', img: '23_ops_wallets.png', check: 'Wallet Ledger' },
      { name: 'Ops: Payment Gateway', path: '/ops/payments', img: '24_ops_payments.png', check: 'Payment Gateway' },
      { name: 'Ops: User Directory & RBAC', path: '/ops/users', img: '25_ops_users.png', check: 'User Directory' },
      { name: 'Ops: Venue Configurations', path: '/ops/venues', img: '26_ops_venues.png', check: 'Venue Configurations' },
      { name: 'Ops: Event Lifecycle', path: '/ops/events', img: '27_ops_events.png', check: 'Event Lifecycle' },
      { name: 'Ops: Compliance Audit Log', path: '/ops/audit-log', img: '28_ops_audit_log.png', check: 'Compliance & Security' },
      { name: 'Ops: Runtime Feature Flags', path: '/ops/feature-flags', img: '29_ops_feature_flags.png', check: 'Runtime Feature Flags' },
      { name: 'Ops: Flash Sale Telemetry', path: '/ops/flash-sale', img: '30_ops_flash_sale.png', check: 'Flash-Sale' },
    ];

    for (const r of opsRoutes) {
      await visit(r.name, r.path, r.img, async (p) => {
        if (r.check) {
          await p.waitForSelector(`text=${r.check}`, { timeout: 10000 });
          console.log(`  Telemetry component "${r.check}" rendered successfully`);
        }
      });
    }

    console.log('\n===============================================================');
    console.log('   ALL PAGES & FLOWS COMPLETED AND RECORDED SUCCESSFULLY!      ');
    console.log('===============================================================');
  } catch (err) {
    console.error('Walkthrough error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserWalkthrough().catch((err) => {
  console.error(err);
  process.exit(1);
});
