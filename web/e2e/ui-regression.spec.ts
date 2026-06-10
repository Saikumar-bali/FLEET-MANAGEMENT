import { test, expect } from '@playwright/test';

const ADMIN_ID = process.env.E2E_ADMIN_IDENTIFIER || 'admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD || 'admin@123';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="text"]', ADMIN_ID);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Phase 3.2 UI regression tests', () => {
  test('Login as admin', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('.page-header-title')).toContainText('Access dashboard');
  });

  test('Open /vehicles/:id and confirm layout', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/vehicles');
    await page.waitForSelector('.data-table');

    const firstRow = page.locator('.data-table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 5000 });
    await firstRow.click();
    await page.waitForURL(/\/vehicles\//);

    await expect(page.locator('section.form-page-full')).toBeVisible();
    await expect(page.locator('text=General Information').first()).toBeVisible();
    await expect(page.locator('text=Status').first()).toBeVisible();
    await expect(page.locator('#vehicle-form')).toBeVisible();
  });

  test('Open /roles and confirm permission UX', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/roles');
    await page.waitForSelector('#permission-matrix');

    await expect(page.locator('button:has-text("Save Permissions")').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();

    const checkbox = page.locator('#permission-matrix input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      const box = await checkbox.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(20);
        expect(box.height).toBeLessThanOrEqual(20);
      }
    }

    await expect(page.locator('.permission-module-card')).toHaveCount(0);
  });

  test('Open /users and confirm Create User button', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/users');
    await page.waitForSelector('.data-table');

    await expect(page.locator('button:has-text("Create user")').first()).toBeVisible();
  });
});
