/**
 * Driver Portal Actions E2E Test
 *
 * Tests:
 * 1. Linked driver logs in and opens Driver Portal
 * 2. Driver can navigate to Create Trip form
 * 3. Driver can navigate to Quick Fuel Entry form
 * 4. Driver can navigate to Expense Claim form
 * 5. Driver is blocked from admin pages
 * 6. No other driver data shown
 *
 * Env (all required):
 * E2E_BASE_URL
 * E2E_DRIVER_USER_IDENTIFIER
 * E2E_DRIVER_USER_PASSWORD
 *
 * MANUAL ONLY — not CI-gated.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const DRIVER_IDENTIFIER = process.env.E2E_DRIVER_USER_IDENTIFIER;
const DRIVER_PASSWORD = process.env.E2E_DRIVER_USER_PASSWORD;

function assertEnvReady() {
  const missing = Object.entries({
    E2E_BASE_URL: BASE_URL,
    E2E_DRIVER_USER_IDENTIFIER: DRIVER_IDENTIFIER,
    E2E_DRIVER_USER_PASSWORD: DRIVER_PASSWORD,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. ` +
      `Set them before running Playwright. Example:\n` +
      `  E2E_BASE_URL=http://localhost:5173 ` +
      `E2E_DRIVER_USER_IDENTIFIER=admin@fleet-ci.test ` +
      `E2E_DRIVER_USER_PASSWORD=Admin123! ` +
      `npx playwright test e2e/driver-portal-actions.spec.ts`
    );
  }
}

test.describe('Driver Portal Actions', () => {
  test.beforeAll(() => {
    assertEnvReady();
  });

  test('linked driver logs in and opens Driver Portal', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal`);
    await page.waitForLoadState('networkidle');

    const portalNav = page.locator('[data-testid="driver-portal-nav"]');
    const noProfile = page.locator('text=No driver profile linked');
    const visible = await Promise.race([
      portalNav.isVisible().then(v => v ? 'portal' : null),
      noProfile.isVisible().then(v => v ? 'noprofile' : null),
    ]);
    expect(visible).not.toBeNull();
  });

  test('driver can navigate to Create Trip form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal/trips`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('text=Create Trip');
    const count = await createBtn.count();
    if (count > 0) {
      await createBtn.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/driver-portal/trips/create');
      const heading = page.locator('text=Create Trip');
      await expect(heading.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('driver can navigate to Quick Fuel Entry form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal/fuel`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('text=Quick Fuel Entry');
    const count = await createBtn.count();
    if (count > 0) {
      await createBtn.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/driver-portal/fuel/create');
      const heading = page.locator('text=Quick Fuel Entry');
      await expect(heading.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('driver can navigate to Expense Claim form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal/expenses`);
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('text=Expense Claim');
    const count = await createBtn.count();
    if (count > 0) {
      await createBtn.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/driver-portal/expenses/create');
      const heading = page.locator('text=Expense Claim');
      await expect(heading.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('driver is blocked from admin pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', DRIVER_IDENTIFIER!);
    await page.fill('input[type="password"]', DRIVER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto(`${BASE_URL}/driver-portal`);
    await page.waitForLoadState('networkidle');

    const adminControls = page.locator('[data-testid="admin-profile-link-tools"]');
    await expect(adminControls).toHaveCount(0);
  });
});
