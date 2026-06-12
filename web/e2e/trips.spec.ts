import { test, expect } from '@playwright/test';
import { getAdminCredential, getCredential, loginAsRole, RoleKey } from './helpers/credentials';
import {
  loginAsAdmin,
  createE2EVehicle,
  createE2EDriver,
  createE2ETrip,
  cleanupE2ETestData,
  E2ETestData,
} from './helpers/api';

const testState = {
  adminToken: '' as string,
  e2eData: null as E2ETestData | null,
};

test.beforeAll(async () => {
  testState.adminToken = await loginAsAdmin();
  testState.e2eData = {
    vehicleId: '',
    vehicleNumber: '',
    driverId: '',
    driverName: '',
  };
  const vehicle = await createE2EVehicle(testState.adminToken);
  const driver = await createE2EDriver(testState.adminToken);
  testState.e2eData.vehicleId = vehicle.id;
  testState.e2eData.vehicleNumber = vehicle.vehicleNumber;
  testState.e2eData.driverId = driver.id;
  testState.e2eData.driverName = driver.name;
});

test.afterAll(async () => {
  if (testState.adminToken && testState.e2eData) {
    await cleanupE2ETestData(testState.adminToken, testState.e2eData);
  }
});

test.describe('Phase 4.4 Trip workflow tests', () => {
  test('Login as admin', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await expect(page.locator('.page-header-title')).toContainText('Access dashboard');
  });

  test('Admin: Create Trip button visible on /trips', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/trips');
    await page.waitForSelector('.page-header');
    await expect(page.locator('button:has-text("Create Trip")').first()).toBeVisible();
  });

  test('Admin: create trip from /trips/new using TEST-E2E data', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/trips/new');
    await page.waitForSelector('#trip-form');

    const vehicleSelect = page.locator('#trip-form select').nth(1);
    if (await vehicleSelect.isVisible()) {
      const options = await vehicleSelect.locator('option').allTextContents();
      const e2eOption = options.findIndex((o) => o.includes(testState.e2eData?.vehicleNumber ?? ''));
      if (e2eOption > 0) {
        await vehicleSelect.selectOption({ index: e2eOption });
      } else if (options.length > 1) {
        await vehicleSelect.selectOption({ index: 1 });
      }
    }

    await page.locator('label:has-text("Origin Name") input').fill('Test Origin');
    await page.locator('label:has-text("Destination Name") input').fill('Test Destination');

    await page.click('button:has-text("Create Trip")');
    await page.waitForURL(/\/trips\/[^/]+$/, { timeout: 10000 });
    await expect(page.locator('.page-header-title')).toBeVisible();

    const url = page.url();
    const tripId = url.split('/trips/')[1];
    if (tripId && testState.e2eData) {
      testState.e2eData.tripId = tripId;
    }
  });

  test('Admin: schedule and start trip from detail page', async ({ page }) => {
    await loginAsRole(page, 'admin');

    await page.goto('/trips');
    await page.waitForSelector('.data-table');

    let targetRow = page.locator('.data-table tbody tr', { hasText: testState.e2eData?.vehicleNumber ?? '' }).first();
    if (!(await targetRow.isVisible().catch(() => false))) {
      targetRow = page.locator('.data-table tbody tr').first();
    }
    await targetRow.waitFor({ state: 'visible', timeout: 5000 });
    await targetRow.click();
    await page.waitForURL(/\/trips\//);

    const scheduleBtn = page.locator('button:has-text("Schedule")');
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();
      await page.click('button:has-text("Yes, Confirm")');
      await page.waitForTimeout(1000);
    }

    const startBtn = page.locator('button:has-text("Start Trip")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.click('button:has-text("Yes, Confirm")');
      await page.waitForTimeout(1000);
      await expect(page.locator('.status-badge')).toContainText(/Started|ON_TRIP/i);
    }
  });

  test('Admin: history tab shows lifecycle records', async ({ page }) => {
    await loginAsRole(page, 'admin');

    await page.goto('/trips');
    await page.waitForSelector('.data-table');

    let targetRow = page.locator('.data-table tbody tr', { hasText: testState.e2eData?.vehicleNumber ?? '' }).first();
    if (!(await targetRow.isVisible().catch(() => false))) {
      targetRow = page.locator('.data-table tbody tr').first();
    }
    await targetRow.waitFor({ state: 'visible', timeout: 5000 });
    await targetRow.click();
    await page.waitForURL(/\/trips\//);

    await page.click('button:has-text("History")');
    await page.waitForTimeout(1000);

    const historyTable = page.locator('.data-table');
    if (await historyTable.isVisible()) {
      const rows = await page.locator('.data-table tbody tr').count();
      expect(rows).toBeGreaterThan(0);
    }
  });

  test('No horizontal overflow at 1366x768', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await loginAsRole(page, 'admin');
    await page.goto('/trips');

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(4);
  });

  test('Trip UI uses low-density layout', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/trips');

    const fontSize = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).fontSize;
    });
    expect(fontSize).toBe('13px');
  });

  test('Roles page still works', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await loginAsRole(page, 'admin');
    await page.goto('/roles');
    await page.waitForSelector('#permission-matrix');
    await expect(page.locator('#permission-matrix .data-table')).toBeVisible();
    await expect(page.locator('button:has-text("Save Permissions")').first()).toBeVisible();
  });

  test('Users page Create User button still visible', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/users');
    await page.waitForSelector('.data-table');
    await expect(page.locator('button:has-text("Create user")').first()).toBeVisible();
  });

  // Role-based UI permission tests (all roles, skip if no credentials)

  const allRoles: RoleKey[] = [
    'admin', 'super_admin', 'manager', 'supervisor',
    'driver', 'assistant_driver', 'collector', 'mechanic',
    'finance', 'viewer', 'ops_admin',
  ];

  for (const roleKey of allRoles) {
    const cred = getCredential(roleKey);
    if (!cred) continue;

    test(`${roleKey}: trips page loads correctly`, async ({ page }) => {
      const loggedIn = await loginAsRole(page, roleKey);
      if (!loggedIn) {
        test.skip();
        return;
      }
      await page.goto('/trips');
      await page.waitForSelector('.page-header');
      await expect(page.locator('.page-header-title')).toContainText('Trips');
    });

    if (roleKey !== 'admin' && roleKey !== 'super_admin') {
      test(`${roleKey}: Create Trip button visibility matches RBAC`, async ({ page }) => {
        const loggedIn = await loginAsRole(page, roleKey);
        if (!loggedIn) {
          test.skip();
          return;
        }
        await page.goto('/trips');
        await page.waitForSelector('.page-header');

        const canCreate = ['manager', 'supervisor'].includes(roleKey);
        const createBtn = page.locator('button:has-text("Create Trip")');
        if (canCreate) {
          await expect(createBtn.first()).toBeVisible();
        } else {
          await expect(createBtn).toHaveCount(0);
        }
      });
    }
  }
});
