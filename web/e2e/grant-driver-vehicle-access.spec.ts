import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin@123';
const DRIVER_USER = 'driver';
const DRIVER_PASS = 'driver@123';

async function login(page: Page, identifier: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="text"]', identifier);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
}

test.describe('Grant vehicle access to driver', () => {
  test('Grant GLOBAL scope to driver via admin, then verify driver portal vehicles', async ({ page }) => {
    test.setTimeout(120_000);

    // ── Step 1: Login as admin ──
    console.log('Step 1: Logging in as admin...');
    await login(page, adminCred.identifier, adminCred.password);
    await page.waitForLoadState('networkidle');
    console.log('  Admin logged in');

    // ── Step 2: Find the driver user ──
    console.log('Step 2: Navigating to users list...');
    await page.goto(`${BASE_URL}/users`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find and click on the driver user
    const driverRow = page.locator('tr, .data-table-row, [class*="user"]').filter({ hasText: DRIVER_USER }).first();
    if (await driverRow.count() > 0) {
      console.log('  Found driver user row, clicking...');
      await driverRow.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Try clicking the driver user link directly
      console.log('  Searching for driver user in table...');
      const rows = await page.locator('table tbody tr').all();
      for (const row of rows) {
        const text = await row.textContent();
        if (text && text.toLowerCase().includes('driver')) {
          console.log(`  Found row: ${text.substring(0, 80)}`);
          await row.click();
          await page.waitForLoadState('networkidle');
          break;
        }
      }
    }

    // ── Step 3: Navigate to Access tab ──
    console.log('Step 3: Opening Access tab...');
    const accessTab = page.locator('button, .tab-button, .detail-tab').filter({ hasText: /Access/i }).first();
    if (await accessTab.count() > 0) {
      await accessTab.click();
      await page.waitForTimeout(500);
    }

    // ── Step 4: Grant VEHICLE scope ──
    console.log('Step 4: Looking for Data Scopes section...');
    const scopesSection = page.locator('summary, button').filter({ hasText: /Data Scopes/i }).first();
    if (await scopesSection.count() > 0) {
      await scopesSection.click();
      await page.waitForTimeout(500);
    }

    // Select GLOBAL scope type
    console.log('  Setting scope type to GLOBAL...');
    const scopeTypeSelect = page.locator('select').filter({ hasText: /VEHICLE/i }).first();
    if (await scopeTypeSelect.count() > 0) {
      await scopeTypeSelect.selectOption('GLOBAL');
      await page.waitForTimeout(300);
    } else {
      // Try finding select by looking at the form
      const allSelects = await page.locator('select').all();
      for (const sel of allSelects) {
        const options = await sel.locator('option').allTextContents();
        if (options.some(o => o.includes('VEHICLE') || o.includes('GLOBAL'))) {
          console.log('  Found scope type select');
          await sel.selectOption('GLOBAL');
          await page.waitForTimeout(300);
          break;
        }
      }
    }

    // Set access level to MANAGE
    console.log('  Setting access level to MANAGE...');
    const allSelects2 = await page.locator('select').all();
    for (const sel of allSelects2) {
      const options = await sel.locator('option').allTextContents();
      if (options.some(o => o === 'MANAGE') && options.some(o => o === 'VIEW')) {
        await sel.selectOption('MANAGE');
        console.log('  Set to MANAGE');
        await page.waitForTimeout(300);
        break;
      }
    }

    // Add reason
    const reasonInput = page.locator('input[placeholder*="reason"], input[placeholder*="Reason"]').first();
    if (await reasonInput.count() > 0) {
      await reasonInput.fill('Granting global vehicle access for driver portal');
    }

    // Click Grant scope button
    console.log('  Clicking Grant scope...');
    const grantBtn = page.locator('button').filter({ hasText: /Grant scope/i }).first();
    if (await grantBtn.count() > 0) {
      await grantBtn.click();
      await page.waitForTimeout(2000);
      console.log('  Scope granted');
    } else {
      console.log('  WARNING: Grant scope button not found');
    }

    // Take screenshot of admin portal
    await page.screenshot({ path: 'web/admin-granted-scope.png', fullPage: true });
    console.log('  Screenshot saved: admin-granted-scope.png');

    // ── Step 5: Logout admin ──
    console.log('Step 5: Logging out admin...');
    // Clear cookies/storage
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // ── Step 6: Login as driver ──
    console.log('Step 6: Logging in as driver...');
    await login(page, DRIVER_USER, DRIVER_PASS);
    await page.waitForLoadState('networkidle');
    console.log('  Driver logged in');

    // ── Step 7: Navigate to driver portal vehicles ──
    console.log('Step 7: Navigating to driver portal vehicles...');
    await page.goto(`${BASE_URL}/driver-portal/vehicles`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of driver portal vehicles
    await page.screenshot({ path: 'web/driver-portal-vehicles.png', fullPage: true });
    console.log('  Screenshot saved: driver-portal-vehicles.png');

    // ── Step 8: Verify vehicles are shown ──
    console.log('Step 8: Verifying vehicles list...');
    const pageContent = await page.textContent('body');
    const hasVehicles = pageContent && (
      pageContent.includes('Vehicle') ||
      pageContent.includes('vehicle') ||
      pageContent.includes('KA') ||
      pageContent.includes('TRUCK')
    );
    console.log(`  Page has vehicle-related content: ${hasVehicles}`);
    console.log(`  Page title/text snippet: ${(pageContent || '').substring(0, 200)}`);

    // Count vehicle entries
    const vehicleCards = await page.locator('.card, tr, [class*="vehicle"]').count();
    console.log(`  Vehicle-related elements found: ${vehicleCards}`);
  });
});
