import { test, expect } from '@playwright/test';
import { getCredential, loginAsRole, requireAllRoles } from './helpers/credentials';
import {
  loginAsAdmin,
  createE2EVehicle,
  createE2EDriver,
  createE2ETrip,
  cleanupE2ETestData,
  E2ETestData,
} from './helpers/api';
import { getTripPermissions, seededRoleKeys } from './helpers/rbac';

test.describe('Phase 4.7 Trip workflow tests', () => {
  test('Admin: self-contained lifecycle — create, schedule, start, complete, history', async ({ page }) => {
    let e2eData: E2ETestData | null = null;

    try {
      const adminToken = await loginAsAdmin();

      const vehicle = await createE2EVehicle(adminToken);
      const driver = await createE2EDriver(adminToken);
      e2eData = {
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        driverId: driver.id,
        driverName: driver.name,
      };

      const trip = await createE2ETrip(adminToken, vehicle.id, driver.id);
      expect(trip.tripNumber).toBeTruthy();

      await loginAsRole(page, 'admin');
      await page.goto(`/trips/${trip.id}`);
      await page.waitForSelector('.page-header-title');
      await expect(page.locator('.page-header-title')).toContainText(trip.tripNumber);

      const scheduleBtn = page.locator('button:has-text("Schedule")');
      await expect(scheduleBtn).toBeVisible({ timeout: 5000 });
      await scheduleBtn.click();
      await page.click('button:has-text("Yes, Confirm")');
      await page.waitForTimeout(1000);
      await expect(page.locator('.action-panel .status-badge')).toContainText(/Scheduled/i);

      const startBtn = page.locator('button:has-text("Start Trip")');
      await expect(startBtn).toBeVisible({ timeout: 5000 });
      await startBtn.click();
      await page.click('button:has-text("Yes, Confirm")');
      await page.waitForTimeout(1000);
      await expect(page.locator('.action-panel .status-badge')).toContainText(/Started|ON_TRIP/i);

      const completeBtn = page.locator('button:has-text("Complete Trip")');
      await expect(completeBtn).toBeVisible({ timeout: 5000 });
      await completeBtn.click();
      await page.click('button:has-text("Yes, Confirm")');
      await page.waitForTimeout(1000);
      await expect(page.locator('.action-panel .status-badge')).toContainText(/Completed/i);

      await page.click('button:has-text("History")');
      await page.waitForTimeout(1000);
      await expect(page.locator('.data-table')).toBeVisible();
      const rows = await page.locator('.data-table tbody tr').count();
      expect(rows).toBeGreaterThan(0);

      const historyText = await page.locator('.data-table').textContent();
      expect(historyText).toContain('CREATED');
      expect(historyText).toContain('SCHEDULED');
      expect(historyText).toContain('STARTED');
      expect(historyText).toContain('COMPLETED');
    } finally {
      if (e2eData) {
        try {
          const adminToken = await loginAsAdmin();
          await cleanupE2ETestData(adminToken, e2eData);
        } catch { /* best effort */ }
      }
    }
  });

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

  for (const roleKey of seededRoleKeys) {
    const perms = getTripPermissions(roleKey);
    const canViewTrips = perms.includes('trip_view');
    const canCreateTrip = perms.includes('trip_create');

    if (canViewTrips) {
      test(`${roleKey}: can view /trips page`, async ({ page }) => {
        const cred = getCredential(roleKey as 'admin');
        if (!cred) {
          if (requireAllRoles()) {
            throw new Error(`No ${roleKey} credentials in .env (E2E_REQUIRE_ALL_ROLES=true)`);
          }
          test.skip(true, `No ${roleKey} credentials in .env`);
          return;
        }
        const loggedIn = await loginAsRole(page, roleKey as 'admin');
        if (!loggedIn) {
          throw new Error(`Login failed for ${roleKey} with provided credentials`);
        }
        await page.goto('/trips');
        await page.waitForSelector('.page-header');
        await expect(page.locator('.page-header-title')).toContainText('Trips');
      });
    } else {
      test(`${roleKey}: cannot view /trips (no trip_view)`, async ({ page }) => {
        const cred = getCredential(roleKey as 'admin');
        if (!cred) {
          if (requireAllRoles()) {
            throw new Error(`No ${roleKey} credentials in .env (E2E_REQUIRE_ALL_ROLES=true)`);
          }
          test.skip(true, `No ${roleKey} credentials in .env`);
          return;
        }
        const loggedIn = await loginAsRole(page, roleKey as 'admin');
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
        const cred = getCredential(roleKey as 'admin');
        if (!cred) {
          if (requireAllRoles()) {
            throw new Error(`No ${roleKey} credentials in .env (E2E_REQUIRE_ALL_ROLES=true)`);
          }
          test.skip(true, `No ${roleKey} credentials in .env`);
          return;
        }
        const loggedIn = await loginAsRole(page, roleKey as 'admin');
        if (!loggedIn) {
          throw new Error(`Login failed for ${roleKey} with provided credentials`);
        }
        await page.goto('/trips');
        await page.waitForSelector('.page-header');
        await expect(page.locator('button:has-text("Create Trip")').first()).toBeVisible();
      });
    } else {
      test(`${roleKey}: Create Trip button not visible`, async ({ page }) => {
        const cred = getCredential(roleKey as 'admin');
        if (!cred) {
          if (requireAllRoles()) {
            throw new Error(`No ${roleKey} credentials in .env (E2E_REQUIRE_ALL_ROLES=true)`);
          }
          test.skip(true, `No ${roleKey} credentials in .env`);
          return;
        }
        const loggedIn = await loginAsRole(page, roleKey as 'admin');
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
