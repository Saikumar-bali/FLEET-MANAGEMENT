import { test, expect } from '@playwright/test';
import { getCredential, loginAsRole, RoleKey, allRoleKeys, requireAllRoles } from './helpers/credentials';
import {
  loginAsAdmin,
  createE2EVehicle,
  createE2EDriver,
  createE2ETrip,
  cleanupE2ETestData,
  E2ETestData,
} from './helpers/api';
import { getTripPermissions, seededRoleKeys } from './helpers/rbac';

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

test.describe('Phase 4.6 Trip workflow tests', () => {
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

  test('Admin: create trip via API and navigate by ID', async ({ page }) => {
    await loginAsRole(page, 'admin');

    const trip = await createE2ETrip(
      testState.adminToken,
      testState.e2eData!.vehicleId,
      testState.e2eData!.driverId,
    );
    testState.e2eData!.tripId = trip.id;
    testState.e2eData!.tripNumber = trip.tripNumber;

    await page.goto(`/trips/${trip.id}`);
    await page.waitForSelector('.page-header-title');
    await expect(page.locator('.page-header-title')).toContainText(trip.tripNumber);
  });

  test('Admin: full lifecycle schedule → start → complete', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const tripId = testState.e2eData!.tripId;
    expect(tripId).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.waitForSelector('.page-header-title');

    const scheduleBtn = page.locator('button:has-text("Schedule")');
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();
      await page.click('button:has-text("Yes, Confirm")');
      await page.waitForTimeout(1000);
      await expect(page.locator('.action-panel .status-badge')).toContainText(/Scheduled/i);
    }

    const startBtn = page.locator('button:has-text("Start Trip")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.click('button:has-text("Yes, Confirm")');
      await page.waitForTimeout(1000);
      await expect(page.locator('.action-panel .status-badge')).toContainText(/Started|ON_TRIP/i);
    }

    const completeBtn = page.locator('button:has-text("Complete Trip")');
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await page.click('button:has-text("Yes, Confirm")');
      await page.waitForTimeout(1000);
      await expect(page.locator('.action-panel .status-badge')).toContainText(/Completed/i);
    }

    await page.click('button:has-text("History")');
    await page.waitForTimeout(1000);
    const historyTable = page.locator('.data-table');
    await expect(historyTable).toBeVisible();
    const rows = await page.locator('.data-table tbody tr').count();
    expect(rows).toBeGreaterThan(0);

    const historyText = await page.locator('.data-table').textContent();
    expect(historyText).toContain('CREATED');
    expect(historyText).toContain('SCHEDULED');
    expect(historyText).toContain('STARTED');
    expect(historyText).toContain('COMPLETED');
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

  // Role-based UI permission tests using exact RBAC from backend/src/constants/rbac.ts
  // Wrong credentials = FAIL; missing optional credentials = SKIP (unless E2E_REQUIRE_ALL_ROLES=true)

  for (const roleKey of allRoleKeys) {
    const perms = getTripPermissions(roleKey);
    const canViewTrips = perms.includes('trip_view');
    const canCreateTrip = perms.includes('trip_create');

    if (canViewTrips) {
      test(`${roleKey}: can view /trips page`, async ({ page }) => {
        const cred = getCredential(roleKey);
        if (!cred) {
          if (requireAllRoles()) {
            throw new Error(`No ${roleKey} credentials in .env (E2E_REQUIRE_ALL_ROLES=true)`);
          }
          test.skip(true, `No ${roleKey} credentials in .env`);
          return;
        }
        const loggedIn = await loginAsRole(page, roleKey);
        if (!loggedIn) {
          throw new Error(`Login failed for ${roleKey} with provided credentials`);
        }
        await page.goto('/trips');
        await page.waitForSelector('.page-header');
        await expect(page.locator('.page-header-title')).toContainText('Trips');
      });
    } else {
      test(`${roleKey}: cannot view /trips (no trip_view)`, async ({ page }) => {
        const cred = getCredential(roleKey);
        if (!cred) {
          if (requireAllRoles()) {
            throw new Error(`No ${roleKey} credentials in .env (E2E_REQUIRE_ALL_ROLES=true)`);
          }
          test.skip(true, `No ${roleKey} credentials in .env`);
          return;
        }
        const loggedIn = await loginAsRole(page, roleKey);
        if (!loggedIn) {
          throw new Error(`Login failed for ${roleKey} with provided credentials`);
        }
        await page.goto('/trips');
        await page.waitForTimeout(2000);
        const url = page.url();
        const isDenied = url.includes('/login') || url.includes('/access-denied')
          || (await page.locator('.error-state, .access-denied, [class*="denied"]').count()) > 0
          || (await page.locator('text=Access Denied').count()) > 0
          || (await page.locator('text=Unauthorized').count()) > 0;
        expect(isDenied).toBeTruthy();
      });
    }

    if (canCreateTrip) {
      test(`${roleKey}: Create Trip button visible`, async ({ page }) => {
        const cred = getCredential(roleKey);
        if (!cred) {
          if (requireAllRoles()) {
            throw new Error(`No ${roleKey} credentials in .env (E2E_REQUIRE_ALL_ROLES=true)`);
          }
          test.skip(true, `No ${roleKey} credentials in .env`);
          return;
        }
        const loggedIn = await loginAsRole(page, roleKey);
        if (!loggedIn) {
          throw new Error(`Login failed for ${roleKey} with provided credentials`);
        }
        await page.goto('/trips');
        await page.waitForSelector('.page-header');
        await expect(page.locator('button:has-text("Create Trip")').first()).toBeVisible();
      });
    } else {
      test(`${roleKey}: Create Trip button not visible`, async ({ page }) => {
        const cred = getCredential(roleKey);
        if (!cred) {
          if (requireAllRoles()) {
            throw new Error(`No ${roleKey} credentials in .env (E2E_REQUIRE_ALL_ROLES=true)`);
          }
          test.skip(true, `No ${roleKey} credentials in .env`);
          return;
        }
        const loggedIn = await loginAsRole(page, roleKey);
        if (!loggedIn) {
          throw new Error(`Login failed for ${roleKey} with provided credentials`);
        }
        await page.goto('/trips');
        if (canViewTrips) {
          await page.waitForSelector('.page-header');
          await expect(page.locator('button:has-text("Create Trip")')).toHaveCount(0);
        } else {
          await page.waitForTimeout(2000);
          const buttonCount = await page.locator('button:has-text("Create Trip")').count();
          expect(buttonCount).toBe(0);
        }
      });
    }
  }
});
