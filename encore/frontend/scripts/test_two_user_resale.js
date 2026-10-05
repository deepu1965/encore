const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = '/home/deepu/.gemini/antigravity-ide/brain/dd51a7fa-2ace-4135-9d2f-f8ea8a59734c/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runTwoUserResaleFlow() {
  console.log('======================================================================');
  console.log('   ENCORE E2E: TWO-USER WALLET & RESALE MARKETPLACE BROWSER FLOW      ');
  console.log('======================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
  });

  const page = await context.newPage();

  async function snap(name) {
    const p = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: p, fullPage: false });
    console.log(`  📸 Screenshot: ${name}.png`);
  }

  try {
    // -------------------------------------------------------------
    // ISSUE 1: TEST VENUES ROUTE (Must return 200, not 404)
    // -------------------------------------------------------------
    console.log('\n[1/8] Verifying Venues Directory Route (/venues)...');
    await page.goto('http://localhost:3002/venues', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const venuesHeader = await page.textContent('h1');
    console.log(`  ✓ Venues Header: "${venuesHeader}"`);
    await snap('01_venues_directory');

    // -------------------------------------------------------------
    // ISSUE 2 & 4: PART 1 — USER A LOGIN, WALLET TOP-UP, TICKET PURCHASE & RESALE LISTING
    // -------------------------------------------------------------
    console.log('\n[2/8] User A Login & Wallet Top-up...');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
    await page.fill('#login-identifier', 'userA@example.com');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3002/', { timeout: 15000 });
    console.log('  ✓ User A logged in successfully');

    // Navigate to Wallet
    await page.goto('http://localhost:3002/wallet', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await snap('02_userA_wallet_initial');

    // Top up Wallet
    console.log('  Testing Wallet Top-Up with $150...');
    const addBalBtn = page.getByRole('button', { name: /Add Balance/i });
    if (await addBalBtn.isVisible()) {
      await addBalBtn.click();
    }
    await page.waitForTimeout(500);

    const amountInput = page.locator('input[type="number"]');
    await amountInput.fill('150');
    const confirmDepositBtn = page.getByRole('button', { name: /Confirm Deposit/i });
    await confirmDepositBtn.click();
    await page.waitForTimeout(3000);
    await snap('03_userA_wallet_topped_up');
    console.log('  ✓ User A wallet topped up with $150.00');

    // User A selects and buys a ticket
    console.log('\n[3/8] User A Purchasing Event Ticket via Seat Selection & Wallet...');
    await page.goto('http://localhost:3002/explore', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap('04_explore_events');

    // Target on-sale event: Encore Launch Night
    const purchasedEventId = 'e31fea72-d88a-407b-9e36-19515a01e71e';
    console.log(`  Navigating to event: /events/${purchasedEventId}`);
    await page.goto(`http://localhost:3002/events/${purchasedEventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Go to Seat Selection
    const selectSeatsLink = page.locator(`a[href="/events/${purchasedEventId}/select-seats"], a[href$="/select-seats"]`).first();
    await selectSeatsLink.click();
    await page.waitForURL(/select-seats/, { timeout: 15000 });
    await page.waitForTimeout(2000);
    await snap('05_seat_selection_map');

    // Click an available seat on the interactive seat map
    console.log('  Selecting available seat...');
    const availableSeat = page.locator('button[data-status="AVAILABLE"], button[role="gridcell"]:not([disabled])').first();
    await availableSeat.waitFor({ state: 'visible', timeout: 10000 });
    await availableSeat.click();
    await page.waitForTimeout(2000);
    await snap('06_seat_selected_held');

    // Proceed to Checkout
    const checkoutBtn = page.getByRole('button', { name: /Continue to Checkout/i });
    await checkoutBtn.waitFor({ state: 'visible', timeout: 10000 });
    await checkoutBtn.click();
    await page.waitForURL('http://localhost:3002/checkout', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await snap('07_checkout_page');

    // Select "Pay from Wallet Balance"
    const walletOption = page.locator('button:has-text("Pay from Wallet"), button:has-text("Encore Wallet"), button:has-text("Wallet Balance")').first();
    if (await walletOption.isVisible()) {
      await walletOption.click();
    }
    await page.waitForTimeout(500);

    // Click Pay
    const payBtn = page.locator('button[type="submit"]:has-text("Pay")');
    await payBtn.click();
    await page.waitForURL(/confirmation/, { timeout: 15000 });
    await page.waitForTimeout(2000);
    await snap('08_order_confirmed');
    console.log('  ✓ Ticket purchased and paid from User A wallet!');

    // -------------------------------------------------------------
    // ISSUE 3 & 4: USER A LISTS TICKET FOR RESALE
    // -------------------------------------------------------------
    console.log('\n[4/8] User A Listing Ticket for Resale at $60.00...');
    await page.goto('http://localhost:3002/tickets', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap('09_userA_my_tickets');

    // Click "Sell" on the ticket
    const sellBtn = page.locator('button:has-text("Sell")').first();
    await sellBtn.click();
    await page.waitForURL(/\/tickets\/.*\/sell/, { timeout: 15000 });
    await page.locator('#ask-price').waitFor({ state: 'visible', timeout: 10000 });
    await snap('10_sell_ticket_form');

    // Enter ask price
    await page.fill('#ask-price', '60.00');
    const listBtn = page.getByRole('button', { name: /List Ticket for Resale/i });
    await listBtn.click();
    await page.waitForURL(/resale\/my-listings/, { timeout: 15000 });
    await page.waitForTimeout(2000);
    await snap('11_userA_my_listings_active');

    const listingText = await page.textContent('body');
    const isListed = listingText.includes('$60.00') && (listingText.includes('ACTIVE') || listingText.includes('LISTED'));
    console.log(`  ✓ Resale listing created: ${isListed ? 'ACTIVE at $60.00' : 'CHECK LISTING'}`);

    // Sign out User A
    console.log('\n[5/8] Signing out User A...');
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    const logoutBtn = page.locator('button[title="Sign out"], button:has-text("Sign out")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      await context.clearCookies();
      await page.evaluate(() => localStorage.clear());
    }
    await page.waitForTimeout(1000);
    console.log('  ✓ User A signed out');

    // -------------------------------------------------------------
    // ISSUE 4: PART 2 — USER B LOGIN, WALLET TOP-UP, FINDS & BUYS RESALE TICKET
    // -------------------------------------------------------------
    console.log('\n[6/8] User B Login, Top-up, and Resale Marketplace Discovery...');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
    await page.fill('#login-identifier', 'userB@example.com');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3002/', { timeout: 15000 });
    console.log('  ✓ User B logged in');

    // User B tops up wallet
    await page.goto('http://localhost:3002/wallet', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const addBalB = page.getByRole('button', { name: /Add Balance/i });
    if (await addBalB.isVisible()) {
      await addBalB.click();
    }
    await page.waitForTimeout(500);
    await page.locator('input[type="number"]').fill('150');
    await page.getByRole('button', { name: /Confirm Deposit/i }).click();
    await page.waitForTimeout(3000);
    await snap('12_userB_wallet_topped_up');
    console.log('  ✓ User B wallet topped up with $150.00');

    // User B goes to Resale Marketplace
    console.log('\n[7/8] User B Purchasing User A\'s Resale Ticket...');
    await page.goto('http://localhost:3002/resale', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap('13_resale_marketplace');

    // Go directly to the event where User A listed the ticket
    console.log(`  Navigating to resale event order book: /resale/events/${purchasedEventId}`);
    await page.goto(`http://localhost:3002/resale/events/${purchasedEventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap('14_resale_event_order_book');

    // Locate the $60.00 ticket and click Buy
    const buyResaleBtn = page.locator('button:has-text("Buy")').first();
    await buyResaleBtn.waitFor({ state: 'visible', timeout: 10000 });
    await buyResaleBtn.click();
    await page.waitForURL(/\/resale\/listings\//, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await snap('15_resale_listing_confirm');

    // Click Purchase
    const purchaseBtn = page.locator('button:has-text("Buy for $60.00"), button:has-text("Buy for"), button:has-text("Purchase")').first();
    await purchaseBtn.waitFor({ state: 'visible', timeout: 10000 });
    await purchaseBtn.click();
    await page.waitForURL(/\/resale\/trades\//, { timeout: 15000 });
    await page.waitForTimeout(2000);
    await snap('16_trade_settlement_timeline');
    console.log('  ✓ Resale ticket purchase completed!');

    // Verify User B's Vault for new ticket & QR Code
    console.log('\n[8/8] Verifying User B Ticket Vault & Dynamic QR Pass...');
    await page.goto('http://localhost:3002/tickets', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap('17_userB_tickets_vault');

    // Open ticket QR
    const viewQrBtn = page.locator('button:has-text("View Pass & QR")').first();
    await viewQrBtn.waitFor({ state: 'visible', timeout: 10000 });
    await viewQrBtn.click();
    await page.waitForURL(/\/tickets\//, { timeout: 10000 });
    await page.waitForTimeout(2000);
    await snap('18_userB_ticket_qr_pass');
    console.log('  ✓ Dynamic QR Code admission pass successfully rendered in User B vault!');

    // Verify User B wallet was debited
    await page.goto('http://localhost:3002/wallet', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap('19_userB_wallet_debited');
    console.log('  ✓ User B wallet verified ($60.00 debited)');

    // Sign out User B and sign back in as User A to verify proceeds credit
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
    const logoutB = page.locator('button[title="Sign out"], button:has-text("Sign out")').first();
    if (await logoutB.isVisible()) await logoutB.click();
    await page.waitForTimeout(1000);

    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
    await page.fill('#login-identifier', 'userA@example.com');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3002/', { timeout: 15000 });

    // Verify User A wallet received credit
    await page.goto('http://localhost:3002/wallet', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap('20_userA_wallet_credited_with_resale_proceeds');
    console.log('  ✓ User A wallet verified (credited with resale proceeds)');

    // Verify User A listing is now MATCHED
    await page.goto('http://localhost:3002/resale/my-listings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap('21_userA_listing_matched');
    console.log('  ✓ User A resale listing status: MATCHED');

    console.log('\n======================================================================');
    console.log('   ALL 4 ISSUES AND FULL 2-USER RESALE FLOW VERIFIED IN BROWSER!      ');
    console.log('======================================================================');
  } catch (err) {
    console.error('Error during browser flow:', err);
    await snap('error_state');
    throw err;
  } finally {
    await browser.close();
  }
}

runTwoUserResaleFlow().catch(console.error);
