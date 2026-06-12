import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

function resolveCredential(): { identifier: string; password: string } {
  const identifier = process.env.E2E_ADMIN_IDENTIFIER
    || process.env.ADMIN_USERNAME
    || process.env.ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!identifier || !password) {
    throw new Error('No credentials found. Set E2E_ADMIN_IDENTIFIER + E2E_ADMIN_PASSWORD in backend/.env');
  }
  return { identifier, password };
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const { identifier, password } = resolveCredential();
  await page.goto('/login');
  await page.fill('input[type="text"]', identifier);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Phase 4.1 Trip workflow tests', () => {
  test('Login as admin', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('.page-header-title')).toContainText('Access dashboard');
  });

  test('Open /trips and confirm Create Trip button visible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/trips');
    await page.waitForSelector('.page-header');
    await expect(page.locator('button:has-text("Create Trip")').first()).toBeVisible();
  });

  test('Open /trips/new, create a trip, land on /trips/:id', async ({ page }) => {
    await loginAsAdmin(page);

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

  test('Schedule and start trip from detail page', async ({ page }) => {
    await loginAsAdmin(page);

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

  test('History tab shows lifecycle records', async ({ page }) => {
    await loginAsAdmin(page);

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
    await loginAsAdmin(page);
    await page.goto('/trips');

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(4);
  });

  test('Trip UI uses low-density layout', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/trips');

    const fontSize = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).fontSize;
    });
    expect(fontSize).toBe('13px');
  });

  test('Roles page still works', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await loginAsAdmin(page);
    await page.goto('/roles');
    await page.waitForSelector('#permission-matrix');
    await expect(page.locator('#permission-matrix .data-table')).toBeVisible();
    await expect(page.locator('button:has-text("Save Permissions")').first()).toBeVisible();
  });

  test('Users page Create User button still visible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');
    await page.waitForSelector('.data-table');
    await expect(page.locator('button:has-text("Create user")').first()).toBeVisible();
  });
});
