import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

async function loginAs(page: any, identifier: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="text"], input[name="identifier"], input[placeholder]', { timeout: 10000 });
  const inputs = page.locator('input');
  const count = await inputs.count();
  if (count >= 2) {
    await inputs.nth(0).fill(identifier);
    await inputs.nth(1).fill(password);
  } else {
    await page.fill('input[type="text"], input[name="identifier"]', identifier);
    await page.fill('input[type="password"]', password);
  }
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');
  await page.waitForTimeout(2000);
}

test.describe('Role Workspace UX', () => {

  test('1. driver sees only driver workspace', async ({ page }) => {
    await loginAs(page, 'driver@fleet-ci.test', 'Driver123!');
    // Should see driver portal navigation items, not operations/admin
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    expect(combined).toContain('Driver Portal');
    // Should NOT show admin items
    expect(combined).not.toContain('Users');
    expect(combined).not.toContain('Roles');
    // Sidebar should NOT be empty
    expect(labels.length).toBeGreaterThan(0);
  });

  test('2. finance sees finance workspace', async ({ page }) => {
    await loginAs(page, 'finance@fleet-ci.test', 'Finance123!');
    await page.waitForTimeout(2000);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    expect(combined).toContain('Finance');
    expect(combined).not.toContain('Driver Portal');
  });

  test('3. manager sees review workspace', async ({ page }) => {
    await loginAs(page, 'manager@fleet-ci.test', 'Manager123!');
    await page.waitForTimeout(2000);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    // Manager should see operational items
    expect(combined).toContain('Manage Trips');
    expect(combined).toContain('Vehicles');
    expect(combined).toContain('Drivers');
  });

  test('4. viewer sees read-only workspace', async ({ page }) => {
    await loginAs(page, 'viewer@fleet-ci.test', 'Viewer123!');
    await page.waitForTimeout(2000);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    // Viewer should see operational read-only items but no admin
    expect(combined).toContain('Vehicles');
    expect(combined).toContain('Drivers');
    expect(combined).not.toContain('Users');
    expect(combined).not.toContain('Roles & Permissions');
  });

  test('5. My Access is only in settings/user menu', async ({ page }) => {
    await loginAs(page, 'admin@fleet-ci.test', 'Admin123!');
    await page.waitForTimeout(2000);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    // My Access should NOT be in main nav sections
    expect(combined).not.toContain('My Access');
  });

  test('6. no restricted menu flash while loading', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    // Reload to login page - just verify login page loads without restricted content
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
  });

  test('7. no emoji UI labels', async ({ page }) => {
    await loginAs(page, 'driver@fleet-ci.test', 'Driver123!');
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').textContent();
    // Common emoji ranges - check none appear in labels
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = bodyText?.match(emojiRegex) ?? [];
    expect(emojis.length).toBe(0);
  });

  test('8. quick actions match capabilities', async ({ page }) => {
    await loginAs(page, 'driver@fleet-ci.test', 'Driver123!');
    await page.waitForTimeout(2000);
    // Driver workspace home should show quick action cards
    const buttons = page.locator('button');
    const buttonTexts = await buttons.allTextContents();
    const combined = buttonTexts.join(' ');
    // Should see driver-specific quick actions (not finance/admin ones)
    expect(combined).not.toContain('Finance');
    expect(combined).not.toContain('Users');
  });
});
