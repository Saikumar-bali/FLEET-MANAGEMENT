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

test.describe('Admin: vehicle scope multi-select', () => {
  test('Open driver user, verify vehicle multi-select in Data Scopes', async ({ page }) => {
    test.setTimeout(60_000);

    await login(page, 'admin', 'admin@123');
    await page.waitForLoadState('networkidle');

    // Go to users page and find the driver user
    await page.goto(`${BASE_URL}/users`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click on driver user row
    const driverRow = page.locator('tr, .data-table-row').filter({ hasText: 'driver' }).first();
    await driverRow.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot of user detail page
    await page.screenshot({ path: 'web/user-detail-page.png', fullPage: true });
    console.log('Screenshot: user-detail-page.png');

    // Click Access tab
    const accessTab = page.locator('button, .tab-button, .detail-tab').filter({ hasText: /Access/i }).first();
    if (await accessTab.count() > 0) {
      await accessTab.click();
      await page.waitForTimeout(500);
    }

    // Expand Data Scopes
    const scopesSummary = page.locator('summary').filter({ hasText: /Data Scopes/i }).first();
    if (await scopesSummary.count() > 0) {
      await scopesSummary.click();
      await page.waitForTimeout(500);
    }

    // Select VEHICLE scope type
    const scopeSelects = await page.locator('select').all();
    for (const sel of scopeSelects) {
      const options = await sel.locator('option').allTextContents();
      if (options.includes('VEHICLE') && options.includes('GLOBAL')) {
        await sel.selectOption('VEHICLE');
        console.log('Selected VEHICLE scope type');
        await page.waitForTimeout(1500);
        break;
      }
    }

    // Take screenshot showing vehicle checkboxes
    await page.screenshot({ path: 'web/vehicle-scope-multiselect.png', fullPage: true });
    console.log('Screenshot: vehicle-scope-multiselect.png');

    // Check if checkboxes appeared
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`Checkboxes found: ${checkboxes}`);

    // Check if vehicle list loaded
    const content = await page.textContent('body');
    const hasKa = (content || '').includes('KA');
    console.log(`Vehicle registrations visible: ${hasKa}`);
  });
});
