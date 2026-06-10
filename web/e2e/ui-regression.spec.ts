import { test, expect } from '@playwright/test';

test.describe('Phase 3.1 UI regression tests', () => {
  test('Login as admin', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="identifier"]', 'admin');
    await page.fill('input[name="password"]', 'admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page.locator('.page-header-title')).toContainText('Access dashboard');
  });

  test('Open /vehicles/:id and confirm layout', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="identifier"]', 'admin');
    await page.fill('input[name="password"]', 'admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to vehicles
    await page.goto('/vehicles');
    await page.waitForSelector('.data-table');

    // Click the first vehicle row
    const firstRow = page.locator('.data-table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 5000 });
    await firstRow.click();
    await page.waitForURL(/\/vehicles\//);

    // Confirm the form-page-full layout is used
    await expect(page.locator('section.form-page-full')).toBeVisible();

    // Confirm General Information is visible
    await expect(page.locator('text=General Information').first()).toBeVisible();

    // Confirm status section exists in tabs
    await expect(page.locator('text=Status').first()).toBeVisible();

    // Confirm form is not squeezed - verify the form-main has visible fields
    await expect(page.locator('#vehicle-form')).toBeVisible();
  });

  test('Open /roles and confirm permission UX', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="identifier"]', 'admin');
    await page.fill('input[name="password"]', 'admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/roles');
    await page.waitForSelector('#permission-matrix');

    // Confirm Save Permissions button is visible
    await expect(page.locator('button:has-text("Save Permissions")').first()).toBeVisible();

    // Confirm role selector is visible
    await expect(page.locator('select').first()).toBeVisible();

    // Confirm permission checkboxes are 16px (check bounding box)
    const checkbox = page.locator('#permission-matrix input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      const box = await checkbox.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Width should be <= 20px (16px + border/padding tolerance)
        expect(box.width).toBeLessThanOrEqual(20);
        expect(box.height).toBeLessThanOrEqual(20);
      }
    }

    // Confirm no permission-card or permission-module-card classes (old card grid)
    await expect(page.locator('.permission-module-card')).toHaveCount(0);
  });

  test('Open /users and confirm Create User button', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="identifier"]', 'admin');
    await page.fill('input[name="password"]', 'admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/users');
    await page.waitForSelector('.data-table');

    // Confirm Create User button is visible
    await expect(page.locator('button:has-text("Create user")').first()).toBeVisible();
  });
});
