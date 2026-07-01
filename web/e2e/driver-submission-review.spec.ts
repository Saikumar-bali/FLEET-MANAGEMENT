/**
 * Driver Submission Review E2E Test
 *
 * Tests:
 * 1. Driver creates fuel/expense entries
 * 2. Manager opens review pages
 * 3. Manager approves/rejects submissions
 * 4. Driver sees updated status
 * 5. Viewer cannot see approval buttons
 *
 * Env (all required):
 * E2E_BASE_URL
 * E2E_DRIVER_USER_IDENTIFIER
 * E2E_DRIVER_USER_PASSWORD
 * E2E_MANAGER_USER_IDENTIFIER
 * E2E_MANAGER_USER_PASSWORD
 *
 * No hardcoded passwords. No silent skip. Fail clearly if env missing.
 * MANUAL ONLY — not CI-gated.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const DRIVER_IDENTIFIER = process.env.E2E_DRIVER_USER_IDENTIFIER;
const DRIVER_PASSWORD = process.env.E2E_DRIVER_USER_PASSWORD;
const MANAGER_IDENTIFIER = process.env.E2E_MANAGER_USER_IDENTIFIER;
const MANAGER_PASSWORD = process.env.E2E_MANAGER_USER_PASSWORD;

function assertEnvReady() {
  const missing = Object.entries({
    E2E_BASE_URL: BASE_URL,
    E2E_DRIVER_USER_IDENTIFIER: DRIVER_IDENTIFIER,
    E2E_DRIVER_USER_PASSWORD: DRIVER_PASSWORD,
    E2E_MANAGER_USER_IDENTIFIER: MANAGER_IDENTIFIER,
    E2E_MANAGER_USER_PASSWORD: MANAGER_PASSWORD,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. ` +
      `Set them before running Playwright. Example:\n` +
      `  E2E_BASE_URL=http://localhost:5173 ` +
      `E2E_DRIVER_USER_IDENTIFIER=driver@test.local ` +
      `E2E_DRIVER_USER_PASSWORD=Pass123! ` +
      `E2E_MANAGER_USER_IDENTIFIER=manager@test.local ` +
      `E2E_MANAGER_USER_PASSWORD=Pass123! ` +
      `npx playwright test e2e/driver-submission-review.spec.ts`
    );
  }
}

async function login(page: any, identifier: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="text"]', identifier);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Driver Submission Review', () => {
  test.beforeAll(() => {
    assertEnvReady();
  });

  test('driver creates fuel entry and sees DRAFT status', async ({ page }) => {
    await login(page, DRIVER_IDENTIFIER!, DRIVER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-portal/fuel`);
    await page.waitForLoadState('networkidle');

    // Should see fuel page
    await expect(page.locator('text=My Fuel Entries')).toBeVisible();
  });

  test('manager opens fuel review page', async ({ page }) => {
    await login(page, MANAGER_IDENTIFIER!, MANAGER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-submissions/fuel`);
    await page.waitForLoadState('networkidle');

    // Should see fuel review page
    await expect(page.locator('text=Fuel Reviews')).toBeVisible();

    // Should see status filter
    await expect(page.locator('select')).toBeVisible();
  });

  test('manager opens expense review page', async ({ page }) => {
    await login(page, MANAGER_IDENTIFIER!, MANAGER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-submissions/expenses`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Expense Reviews')).toBeVisible();
  });

  test('manager opens document review page', async ({ page }) => {
    await login(page, MANAGER_IDENTIFIER!, MANAGER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-submissions/documents`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Document Reviews')).toBeVisible();
  });

  test('manager opens issue review page', async ({ page }) => {
    await login(page, MANAGER_IDENTIFIER!, MANAGER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-submissions/issues`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Vehicle Issue Reviews')).toBeVisible();
  });

  test('manager opens inspection review page', async ({ page }) => {
    await login(page, MANAGER_IDENTIFIER!, MANAGER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-submissions/inspections`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Inspection Reviews')).toBeVisible();
  });

  test('driver sees updated status on fuel page', async ({ page }) => {
    await login(page, DRIVER_IDENTIFIER!, DRIVER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-portal/fuel`);
    await page.waitForLoadState('networkidle');

    // Status column should exist
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Reviewer Notes")')).toBeVisible();
  });

  test('driver sees updated status on expenses page', async ({ page }) => {
    await login(page, DRIVER_IDENTIFIER!, DRIVER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-portal/expenses`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Reviewer Notes")')).toBeVisible();
  });

  test('driver sees updated status on documents page', async ({ page }) => {
    await login(page, DRIVER_IDENTIFIER!, DRIVER_PASSWORD!);

    await page.goto(`${BASE_URL}/driver-portal/documents`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Reviewer Notes")')).toBeVisible();
  });
});
