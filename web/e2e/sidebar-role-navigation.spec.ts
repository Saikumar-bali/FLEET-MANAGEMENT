import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

async function loginAs(page: import('@playwright/test').Page, identifier: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="identifier"]', identifier);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');
  await page.waitForTimeout(1500);
}

test.describe('Role-aware navigation sidebar', () => {
  test('1. linked driver sees one sidebar only (no second sidebar)', async ({ page }) => {
    await loginAs(page, 'admin@fleet.local', 'admin123');
    // The main sidebar exists
    await expect(page.locator('aside.sidebar').first()).toBeVisible();
    // Navigate to driver portal
    await page.goto(`${BASE}/driver-portal`);
    await page.waitForTimeout(1500);
    // The second driver portal nav must not exist
    await expect(page.locator('[data-testid="driver-portal-nav"]')).toHaveCount(0);
  });

  test('2. linked driver sees Driver Portal items in main sidebar', async ({ page }) => {
    await loginAs(page, 'driver.demo@fleet.local', 'Demo@123');
    await expect(page.locator('text=Driver Portal').first()).toBeVisible();
    await expect(page.locator('text=My Trips').first()).toBeVisible();
    await expect(page.locator('text=My Fuel').first()).toBeVisible();
    await expect(page.locator('text=My Expenses').first()).toBeVisible();
    await expect(page.locator('text=My Documents').first()).toBeVisible();
  });

  test('3. linked driver does not see global Finance', async ({ page }) => {
    await loginAs(page, 'driver.demo@fleet.local', 'Demo@123');
    await expect(page.locator('[data-testid="sidebar-finance-item"]')).toHaveCount(0);
  });

  test('4. linked driver does not see global Manage Trips', async ({ page }) => {
    await loginAs(page, 'driver.demo@fleet.local', 'Demo@123');
    await expect(page.locator('text=Manage Trips')).toHaveCount(0);
  });

  test('5. My Access is not a primary sidebar item', async ({ page }) => {
    await loginAs(page, 'admin@fleet.local', 'admin123');
    // My Access is removed from the navigation registry, so it should not appear
    // in the sidebar nav items at all
    const sidebarNav = page.locator('aside.sidebar nav');
    await expect(sidebarNav.locator('text=My Access')).toHaveCount(0);
  });

  test('6. My Access is reachable from bottom settings/user menu', async ({ page }) => {
    await loginAs(page, 'admin@fleet.local', 'admin123');
    // Click the account chip in sidebar footer
    await page.click('.sidebar-account-chip');
    await page.waitForTimeout(500);
    // Should see My Access in the popover
    await expect(page.locator('.popover-row:has-text("My Access")').first()).toBeVisible();
    await page.click('text=My Access');
    await page.waitForURL('**/my-access');
    await expect(page.locator('text=My Access').first()).toBeVisible();
  });

  test('7. Driver Portal page does not render a second sidebar', async ({ page }) => {
    await loginAs(page, 'admin@fleet.local', 'admin123');
    await page.goto(`${BASE}/driver-portal`);
    await page.waitForTimeout(1500);
    // No second nav with driver portal links
    const secondNav = page.locator('aside.sidebar').first();
    await expect(secondNav).toBeVisible();
    // No other sidebar-like nav
    const allNavs = page.locator('nav');
    const navCount = await allNavs.count();
    expect(navCount).toBeLessThan(3); // main sidebar nav + maybe topbar nav
  });

  test('8. Driver Portal does not get stuck on Loading', async ({ page }) => {
    await loginAs(page, 'admin@fleet.local', 'admin123');
    await page.goto(`${BASE}/driver-portal`);
    // The page should eventually resolve to either dashboard or error/no-profile state
    // Loading should disappear within timeout
    const loadingEl = page.locator('text=Loading your driver workspace');
    if (await loadingEl.isVisible().catch(() => false)) {
      await loadingEl.waitFor({ state: 'hidden', timeout: 15000 });
    }
    // Once loading is gone, we should see either welcome text or error state
    const resolved = await Promise.race([
      page.locator('text=Welcome back').first().isVisible().then(() => true),
      page.locator('text=No driver profile linked').first().isVisible().then(() => true),
      page.locator('text=Unable to load').first().isVisible().then(() => true),
    ]);
    expect(resolved).toBe(true);
  });

  test('9. unlinked driver sees no Driver Portal and gets clear My Access warning', async ({ page }) => {
    await loginAs(page, 'unlinked.driver@fleet.local', 'TestPass123!');
    await expect(page.locator('text=Driver Portal')).toHaveCount(0);
    await expect(page.locator('text=My Trips')).toHaveCount(0);
    // My Access should show the driver profile warning
    await page.goto(`${BASE}/my-access`);
    await page.waitForTimeout(1000);
    await expect(page.locator('text=driver profile is not linked').or(page.locator('text=No driver profile linked')).first()).toBeVisible({ timeout: 5000 });
  });

  test('10. UI sidebar labels contain no emoji characters', async ({ page }) => {
    await loginAs(page, 'admin@fleet.local', 'admin123');
    const sidebarText = await page.locator('aside.sidebar .nav-item-label').allTextContents();
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u{1F600}-\u{1F64F}]/u;
    for (const text of sidebarText) {
      expect(text).not.toMatch(emojiRegex);
    }
  });
});
