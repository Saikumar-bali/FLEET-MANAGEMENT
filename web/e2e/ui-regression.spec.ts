import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

test.describe('Phase 3.3 UI regression tests', () => {
  test('Login as admin', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await expect(page.locator('.page-header-title')).toContainText('Overview');
  });

  test('Open /vehicles/:id and confirm layout', async ({ page }) => {
    await loginAsRole(page, 'admin');

    await page.goto('/vehicles');
    await page.waitForSelector('.data-table');

    const firstRow = page.locator('.data-table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 5000 });
    await firstRow.click();
    await page.waitForURL(/\/vehicles\//);

    await expect(page.locator('section.page-content')).toBeVisible();
    await expect(page.locator('text=General Information').first()).toBeVisible();
    await expect(page.locator('text=Status').first()).toBeVisible();
    await expect(page.locator('#vehicle-form')).toBeVisible();
  });

  test('Open /roles and confirm permission UX', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await loginAsRole(page, 'admin');

    await page.goto('/roles');
    await page.waitForSelector('#permission-matrix');

    await expect(page.locator('#permission-matrix .data-table')).toBeVisible();
    await expect(page.locator('button:has-text("Save Permissions")').first()).toBeVisible();
    await expect(page.locator('.role-selector-input')).toBeVisible();
    await expect(page.getByText(/Editing permissions for:/)).toBeVisible();

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

    const horizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(horizontalOverflow).toBeLessThanOrEqual(4);
  });

  test('Open /users and confirm Create User button', async ({ page }) => {
    await loginAsRole(page, 'admin');

    await page.goto('/users');
    await page.waitForSelector('.data-table');

    await expect(page.locator('button:has-text("Create user")').first()).toBeVisible();
  });
});
