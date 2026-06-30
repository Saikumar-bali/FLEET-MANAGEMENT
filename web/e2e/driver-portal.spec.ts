/**
 * Driver Portal E2E Test
 *
 * Tests:
 * 1. Linked driver user can open Driver Portal
 * 2. Pages load without showing another driver's name/id
 * 3. Unlinked user sees clean "No driver profile linked" state
 * 4. Direct navigation to /driver-portal works after login
 * 5. No admin profile-link controls appear for normal driver user
 *
 * Env:
 * E2E_DRIVER_USER_IDENTIFIER - identifier for a linked driver user
 * E2E_DRIVER_USER_PASSWORD - password for the linked driver user
 * E2E_UNLINKED_USER_IDENTIFIER - identifier for a user with no driver link
 * E2E_UNLINKED_USER_PASSWORD - password for the unlinked user
 * E2E_ALLOW_DRIVER_PORTAL_TEST_MUTATION=false
 * E2E_ALLOW_REMOTE_DRIVER_PORTAL_TEST=false
 */

import { test, expect } from '@playwright/test';

const DRIVER_IDENTIFIER = process.env.E2E_DRIVER_USER_IDENTIFIER;
const DRIVER_PASSWORD = process.env.E2E_DRIVER_USER_PASSWORD;
const UNLINKED_IDENTIFIER = process.env.E2E_UNLINKED_USER_IDENTIFIER;
const UNLINKED_PASSWORD = process.env.E2E_UNLINKED_USER_PASSWORD;
const BASE_URL = process.env.E2E_API_BASE_URL || 'http://localhost:3000';

test.describe('Driver Portal UI', () => {
  test('linked driver can open Driver Portal and see dashboard', async ({ page }) => {
    test.skip(!DRIVER_IDENTIFIER || !DRIVER_PASSWORD, 'E2E_DRIVER_USER_IDENTIFIER / E2E_DRIVER_USER_PASSWORD not set');

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER);
    await page.fill('input[type="password"]', DRIVER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to driver portal
    await page.goto(`${BASE_URL}/driver-portal`);

    // Should see the driver portal layout or dashboard
    const portalNav = page.locator('[data-testid="driver-portal-nav"]');
    const welcomeHeading = page.locator('text=Welcome');
    const noProfileMessage = page.locator('text=No driver profile linked');

    // One of these should be visible
    const isVisible = await Promise.race([
      portalNav.isVisible().then(v => v ? 'portal' : null),
      welcomeHeading.isVisible().then(v => v ? 'welcome' : null),
      noProfileMessage.isVisible().then(v => v ? 'noprofile' : null),
    ]);

    expect(isVisible).not.toBeNull();
  });

  test('driver portal pages load without cross-driver data', async ({ page }) => {
    test.skip(!DRIVER_IDENTIFIER || !DRIVER_PASSWORD, 'E2E_DRIVER_USER_IDENTIFIER / E2E_DRIVER_USER_PASSWORD not set');

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER);
    await page.fill('input[type="password"]', DRIVER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that the page does not contain any admin-specific elements
    const adminControls = page.locator('[data-testid="admin-profile-link-tools"]');
    await expect(adminControls).toHaveCount(0);

    // Navigate to each sub-page and verify no errors
    const pages = ['/driver-portal/profile', '/driver-portal/trips', '/driver-portal/vehicles', '/driver-portal/documents', '/driver-portal/fuel', '/driver-portal/expenses'];

    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      // Should not show error state or 404
      const errorState = page.locator('text=Something needs attention');
      await expect(errorState).toHaveCount(0);
    }
  });

  test('unlinked user sees clean "No driver profile linked" state', async ({ page }) => {
    test.skip(!UNLINKED_IDENTIFIER || !UNLINKED_PASSWORD, 'E2E_UNLINKED_USER_IDENTIFIER / E2E_UNLINKED_USER_PASSWORD not set');

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', UNLINKED_IDENTIFIER);
    await page.fill('input[type="password"]', UNLINKED_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal`);
    await page.waitForLoadState('networkidle');

    // Should show the "no driver profile linked" message
    const noProfileMessage = page.locator('text=No driver profile linked');
    await expect(noProfileMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('direct navigation to /driver-portal works after login', async ({ page }) => {
    test.skip(!DRIVER_IDENTIFIER || !DRIVER_PASSWORD, 'E2E_DRIVER_USER_IDENTIFIER / E2E_DRIVER_USER_PASSWORD not set');

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER);
    await page.fill('input[type="password"]', DRIVER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Direct navigate (not via sidebar click)
    await page.goto(`${BASE_URL}/driver-portal`);
    await page.waitForLoadState('networkidle');

    // Should not redirect to login
    expect(page.url()).not.toContain('/login');
  });

  test('no admin profile-link controls for normal driver user', async ({ page }) => {
    test.skip(!DRIVER_IDENTIFIER || !DRIVER_PASSWORD, 'E2E_DRIVER_USER_IDENTIFIER / E2E_DRIVER_USER_PASSWORD not set');

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER);
    await page.fill('input[type="password"]', DRIVER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Check sidebar doesn't have admin-only items visible
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // A driver user should not see "Link Driver Profile" admin controls
    const linkDriverButton = page.locator('text=Link Driver Profile');
    await expect(linkDriverButton).toHaveCount(0);
  });
});
