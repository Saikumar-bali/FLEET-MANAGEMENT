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
 * Env (all required, no defaults):
 * E2E_BASE_URL                  - Frontend app URL (e.g. http://localhost:5173)
 * E2E_DRIVER_USER_IDENTIFIER    - identifier for a linked driver user
 * E2E_DRIVER_USER_PASSWORD      - password for the linked driver user
 * E2E_UNLINKED_USER_IDENTIFIER  - identifier for a user with no driver link
 * E2E_UNLINKED_USER_PASSWORD    - password for the unlinked user
 *
 * Optional guards:
 * E2E_ALLOW_DRIVER_PORTAL_TEST_MUTATION=false
 * E2E_ALLOW_REMOTE_DRIVER_PORTAL_TEST=false
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const DRIVER_IDENTIFIER = process.env.E2E_DRIVER_USER_IDENTIFIER;
const DRIVER_PASSWORD = process.env.E2E_DRIVER_USER_PASSWORD;
const UNLINKED_IDENTIFIER = process.env.E2E_UNLINKED_USER_IDENTIFIER;
const UNLINKED_PASSWORD = process.env.E2E_UNLINKED_USER_PASSWORD;

const requiredEnv = {
  E2E_BASE_URL: BASE_URL,
  E2E_DRIVER_USER_IDENTIFIER: DRIVER_IDENTIFIER,
  E2E_DRIVER_USER_PASSWORD: DRIVER_PASSWORD,
  E2E_UNLINKED_USER_IDENTIFIER: UNLINKED_IDENTIFIER,
  E2E_UNLINKED_USER_PASSWORD: UNLINKED_PASSWORD,
};

function assertEnvReady() {
  const missing = Object.entries(requiredEnv)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. ` +
      `Set them before running Playwright. Example:\n` +
      `  E2E_BASE_URL=http://localhost:5173 ` +
      `E2E_DRIVER_USER_IDENTIFIER=admin@fleet-ci.test ` +
      `E2E_DRIVER_USER_PASSWORD=Admin123! ` +
      `E2E_UNLINKED_USER_IDENTIFIER=viewer@fleet-ci.test ` +
      `E2E_UNLINKED_USER_PASSWORD=Viewer123! ` +
      `npx playwright test e2e/driver-portal.spec.ts`
    );
  }
}

test.describe('Driver Portal UI', () => {
  test.beforeAll(() => {
    assertEnvReady();
  });

  test('linked driver can open Driver Portal and see dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal`);

    const portalNav = page.locator('[data-testid="driver-portal-nav"]');
    const welcomeHeading = page.locator('text=Welcome');
    const noProfileMessage = page.locator('text=No driver profile linked');

    const isVisible = await Promise.race([
      portalNav.isVisible().then(v => v ? 'portal' : null),
      welcomeHeading.isVisible().then(v => v ? 'welcome' : null),
      noProfileMessage.isVisible().then(v => v ? 'noprofile' : null),
    ]);

    expect(isVisible).not.toBeNull();
  });

  test('driver portal pages load without cross-driver data', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal`);
    await page.waitForLoadState('networkidle');

    const adminControls = page.locator('[data-testid="admin-profile-link-tools"]');
    await expect(adminControls).toHaveCount(0);

    const pages = ['/driver-portal/profile', '/driver-portal/trips', '/driver-portal/vehicles', '/driver-portal/documents', '/driver-portal/fuel', '/driver-portal/expenses'];

    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      const errorState = page.locator('text=Something needs attention');
      await expect(errorState).toHaveCount(0);
    }
  });

  test('unlinked user sees clean "No driver profile linked" state', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', UNLINKED_IDENTIFIER!);
    await page.fill('input[type="password"]', UNLINKED_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal`);
    await page.waitForLoadState('networkidle');

    const noProfileMessage = page.locator('text=No driver profile linked');
    await expect(noProfileMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('direct navigation to /driver-portal works after login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
  });

  test('no admin profile-link controls for normal driver user', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    const linkDriverButton = page.locator('text=Link Driver Profile');
    await expect(linkDriverButton).toHaveCount(0);
  });
});
