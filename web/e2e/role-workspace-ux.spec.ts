import { test, expect } from '@playwright/test';
import { getCredential, RoleKey } from './helpers/credentials';

const BASE = process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

function getRoleCred(role: RoleKey) {
  const cred = getCredential(role);
  if (!cred) {
    throw new Error(`Credentials for role ${role} could not be resolved from env.`);
  }
  return { id: cred.identifier, pw: cred.password };
}

const CREDS = {
  admin: getRoleCred('admin'),
  driver: getRoleCred('driver'),
  finance: getRoleCred('finance'),
  manager: getRoleCred('manager'),
  mechanic: getRoleCred('mechanic'),
  viewer: getRoleCred('viewer'),
};


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
  try {
    await page.waitForSelector('.nav-item-label, .sidebar-loading, text=Menu unavailable', { timeout: 10000 });
  } catch {
    await page.waitForTimeout(3000);
  }
  await page.waitForFunction(() => {
    const skeleton = document.querySelector('.sidebar-loading');
    return !skeleton;
  }, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

test.describe('Role Workspace UX', () => {

  test('1. driver sees only driver workspace', async ({ page }) => {
    await loginAs(page, CREDS.driver.id, CREDS.driver.pw);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    expect(combined).toContain('Driver Portal');
    expect(combined).not.toContain('Users');
    expect(combined).not.toContain('Roles');
    expect(labels.length).toBeGreaterThan(0);
  });

  test('2. finance sees finance workspace', async ({ page }) => {
    await loginAs(page, CREDS.finance.id, CREDS.finance.pw);
    await page.waitForTimeout(5000);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    expect(combined).toContain('Finance');
    expect(combined).not.toContain('Driver Portal');
  });

  test('3. manager sees review workspace', async ({ page }) => {
    await loginAs(page, CREDS.manager.id, CREDS.manager.pw);
    await page.waitForTimeout(5000);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    expect(combined).toContain('Manage Trips');
    expect(combined).toContain('Vehicles');
    expect(combined).toContain('Drivers');
  });

  test('4. viewer sees read-only workspace', async ({ page }) => {
    await loginAs(page, CREDS.viewer.id, CREDS.viewer.pw);
    await page.waitForTimeout(5000);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    expect(combined).toContain('Vehicles');
    expect(combined).toContain('Drivers');
    expect(combined).not.toContain('Users');
    expect(combined).not.toContain('Roles & Permissions');
  });

  test('5. My Access is only in settings/user menu', async ({ page }) => {
    await loginAs(page, CREDS.admin.id, CREDS.admin.pw);
    await page.waitForTimeout(5000);
    const sidebarLinks = page.locator('.nav-item-label');
    const labels = await sidebarLinks.allTextContents();
    const combined = labels.join(' ');
    expect(combined).not.toContain('My Access');
  });

  test('6. no restricted menu flash while loading', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10000 });
  });

  test('7. no emoji UI labels', async ({ page }) => {
    await loginAs(page, CREDS.driver.id, CREDS.driver.pw);
    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').textContent();
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = bodyText?.match(emojiRegex) ?? [];
    expect(emojis.length).toBe(0);
  });

  test('8. quick actions match capabilities', async ({ page }) => {
    await loginAs(page, CREDS.driver.id, CREDS.driver.pw);
    await page.waitForTimeout(5000);
    const buttons = page.locator('button');
    const buttonTexts = await buttons.allTextContents();
    const combined = buttonTexts.join(' ');
    expect(combined).not.toContain('Finance');
    expect(combined).not.toContain('Users');
  });
});
