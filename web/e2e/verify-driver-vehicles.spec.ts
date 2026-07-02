import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function login(page: Page, identifier: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="text"]', identifier);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
}

test.describe('Driver portal vehicles verification', () => {
  test('Login as driver and verify vehicles page shows all available vehicles', async ({ page }) => {
    test.setTimeout(60_000);

    console.log('Logging in as driver...');
    await login(page, 'driver', 'driver@123');
    await page.waitForLoadState('networkidle');
    console.log('Driver logged in');

    console.log('Navigating to driver portal vehicles...');
    await page.goto(`${BASE_URL}/driver-portal/vehicles`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'web/driver-portal-vehicles.png', fullPage: true });
    console.log('Screenshot saved: driver-portal-vehicles.png');

    // Check page content
    const content = await page.textContent('body');
    console.log(`Page text (first 500 chars): ${(content || '').substring(0, 500)}`);

    // Check for vehicle-related elements
    const kaMatch = (content || '').match(/KA\d+[A-Z]+\d+/g);
    if (kaMatch) {
      console.log(`Found ${kaMatch.length} vehicle registration numbers: ${kaMatch.slice(0, 5).join(', ')}`);
    }

    // Check for any vehicle cards or table rows
    const vehicleElements = await page.locator('tr, .card, [class*="vehicle"]').count();
    console.log(`Vehicle-related DOM elements: ${vehicleElements}`);
  });
});
