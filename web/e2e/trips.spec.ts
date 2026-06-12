import { test, expect } from '@playwright/test';
import { getAdminCredential, getCredential, loginAsRole } from './helpers/credentials';

test.describe('Phase 4.3 Trip workflow tests', () => {
  test('Login as admin', async ({ page }) => {
    const cred = getAdminCredential();
    await loginAsRole(page, 'admin');
    await expect(page.locator('.page-header-title')).toContainText('Access dashboard');
  });

  test('Admin: Create Trip button visible on /trips', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/trips');
    await page.waitForSelector('.page-header');
    await expect(page.locator('button:has-text("Create Trip")').first()).toBeVisible();
  });

  test('Admin: create trip from /trips/new', async ({ page }) => {
    await loginAsRole(page, 'admin');

    await page.goto('/trips/new');
    await page.waitForSelector('#trip-form');

    const vehicleSelect = page.locator('#trip-form select').nth(1);
    if (await vehicleSelect.isVisible()) {
      const options = await vehicleSelect.locator('option').all();
      if (options.length > 1) {
        await vehicleSelect.selectOption({ index: 1 });
      }
    }

    await page.locator('label:has-text("Origin Name") input').fill('Test Origin');
    await page.locator('label:has-text("Destination Name") input').fill('Test Destination');

    await page.click('button:has-text("Create Trip")');
    await page.waitForURL(/\/trips\/[^/]+$/, { timeout: 10000 });
    await expect(page.locator('.page-header-title')).toBeVisible();
  });

  test('Admin: schedule and start trip from detail page', async ({ page }) => {
    await loginAsRole(page, 'admin');

    await page.goto('/trips');
    await page.waitForSelector('.data-table');
    const firstRow = page.locator('.data-table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 5000 });
    await firstRow.click();
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
    const firstRow = page.locator('.data-table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 5000 });
    await firstRow.click();
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

  // Role-based permission tests (only run if credentials exist)

  const viewerCred = getCredential('viewer');
  const driverCred = getCredential('driver');

  if (viewerCred) {
    test('Viewer: can see /trips but not Create Trip button', async ({ page }) => {
      await loginAsRole(page, 'viewer');
      await page.goto('/trips');
      await page.waitForSelector('.page-header');
      await expect(page.locator('.page-header-title')).toContainText('Trips');
      await expect(page.locator('button:has-text("Create Trip")')).toHaveCount(0);
    });
  }

  if (driverCred) {
    test('Driver: cannot see Create Trip button', async ({ page }) => {
      await loginAsRole(page, 'driver');
      await page.goto('/trips');
      await page.waitForSelector('.page-header');
      await expect(page.locator('button:has-text("Create Trip")')).toHaveCount(0);
    });
  }
});
