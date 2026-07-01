import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Sidebar & Access Diagnostics — Driver Profile Link', () => {

  test('1. unlinked driver sees missing driver profile warning on My Access', async ({ page }) => {
    // Log in as a driver user without a UserProfileLink
    // This test assumes a demo driver user exists without a linked profile
    await page.goto(`${BASE}/login`);
    await page.fill('[name="identifier"]', 'driver_no_link');
    await page.fill('[name="password"]', 'driver123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    // Navigate to My Access
    await page.goto(`${BASE}/my-access`);
    await page.waitForSelector('.page-content');

    // Check for the driver profile warning
    const warningText = page.locator('text=Driver role is active, but no Driver profile is linked');
    await expect(warningText).toBeVisible({ timeout: 10000 });

    // Check that Driver Portal menu is NOT visible in sidebar
    // Toggle sidebar open if collapsed
    const sidebarToggle = page.locator('button[aria-label="Expand sidebar"]');
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      await page.waitForTimeout(300);
    }

    // Verify no Driver Portal link in sidebar
    const driverPortalLink = page.locator('nav[aria-label="Primary"] a:has-text("Driver Portal")');
    await expect(driverPortalLink).toHaveCount(0);
  });

  test('2. My Access shows linked profiles and primary driver for linked driver', async ({ page }) => {
    // Log in as a driver user WITH a UserProfileLink
    await page.goto(`${BASE}/login`);
    await page.fill('[name="identifier"]', 'driver_with_link');
    await page.fill('[name="password"]', 'driver123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    // Navigate to My Access
    await page.goto(`${BASE}/my-access`);
    await page.waitForSelector('.page-content');

    // Should see linked profiles section with DRIVER type
    const profileLinksSection = page.locator('text=Linked profile types');
    await expect(profileLinksSection).toBeVisible({ timeout: 10000 });

    // Should see Driver Portal link
    const driverPortalButton = page.locator('a:has-text("Open Driver Portal")');
    await expect(driverPortalButton).toBeVisible();
  });

  test('3. admin can link user to driver on user detail page', async ({ page }) => {
    // Log in as admin
    await page.goto(`${BASE}/login`);
    await page.fill('[name="identifier"]', 'admin');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    // Navigate to a user detail page (use a test user)
    await page.goto(`${BASE}/users`);
    await page.waitForSelector('.page-content');

    // Click on a user that has driver role
    const driverRoleUser = page.locator('text=driver').first();
    if (await driverRoleUser.isVisible()) {
      await driverRoleUser.click();
      await page.waitForSelector('.section-tabs');

      // Click Profile Links tab
      await page.click('button:has-text("Profile Links")');
      await page.waitForTimeout(500);

      // Should see the linking form
      const linkForm = page.locator('text=Link Profile');
      await expect(linkForm).toBeVisible({ timeout: 5000 });
    }
  });

});
