import { expect, test } from '@playwright/test';
import { loginAsRole, getCredential, getApiBase } from './helpers/credentials';

test.describe('Documents RBAC', () => {
  const RESTRICTED_ROLES = ['driver', 'assistant_driver'] as const;

  for (const role of RESTRICTED_ROLES) {
    test.describe(`restricted role: ${role}`, () => {
      test(`sidebar does NOT show Documents for ${role}`, async ({ page }) => {
        const loggedIn = await loginAsRole(page, role);
        if (!loggedIn) {
          test.skip();
          return;
        }
        const sidebarDocs = page.locator('.nav-item', { hasText: 'Documents' });
        await expect(sidebarDocs).toHaveCount(0);
      });

      test(`direct /documents returns Access Denied for ${role}`, async ({ page }) => {
        const loggedIn = await loginAsRole(page, role);
        if (!loggedIn) {
          test.skip();
          return;
        }
        await page.goto('/documents');
        await expect(page.locator('text=Access Denied').or(page.locator('text=403'))).toBeVisible({ timeout: 10000 });
      });

      test(`API /documents returns 403 for ${role}`, async ({ page }) => {
        const cred = getCredential(role);
        if (!cred) {
          test.skip();
          return;
        }
        await loginAsRole(page, role);
        const baseUrl = getApiBase();
        const res = await page.request.post(`${baseUrl}/api/v1/auth/login`, {
          data: { identifier: cred.identifier, password: cred.password },
        });
        const json = await res.json();
        const token = json.data?.accessToken;
        if (!token) {
          test.skip();
          return;
        }
        const docsRes = await page.request.get(`${baseUrl}/api/v1/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(docsRes.status()).toBe(403);
      });
    });
  }

  test.describe('allowed role: admin', () => {
    test('sidebar shows Documents for admin', async ({ page }) => {
      const loggedIn = await loginAsRole(page, 'admin');
      if (!loggedIn) {
        test.skip();
        return;
      }
      const sidebarDocs = page.locator('.nav-item', { hasText: 'Documents' });
      await expect(sidebarDocs).toBeVisible();
    });

    test('/documents loads for admin', async ({ page }) => {
      const loggedIn = await loginAsRole(page, 'admin');
      if (!loggedIn) {
        test.skip();
        return;
      }
      await page.goto('/documents');
      await expect(page).not.toHaveURL('/login');
      await expect(page.locator('text=Documents Vault')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('allowed role: manager', () => {
    test('sidebar shows Documents for manager', async ({ page }) => {
      const loggedIn = await loginAsRole(page, 'manager');
      if (!loggedIn) {
        test.skip();
        return;
      }
      const sidebarDocs = page.locator('.nav-item', { hasText: 'Documents' });
      await expect(sidebarDocs).toBeVisible();
    });
  });

  test.describe('allowed role: viewer', () => {
    test('sidebar shows Documents for viewer', async ({ page }) => {
      const loggedIn = await loginAsRole(page, 'viewer');
      if (!loggedIn) {
        test.skip();
        return;
      }
      const sidebarDocs = page.locator('.nav-item', { hasText: 'Documents' });
      await expect(sidebarDocs).toBeVisible();
    });

    test('viewer can see documents page but no upload button', async ({ page }) => {
      const loggedIn = await loginAsRole(page, 'viewer');
      if (!loggedIn) {
        test.skip();
        return;
      }
      await page.goto('/documents');
      await expect(page.locator('text=Documents Vault')).toBeVisible({ timeout: 10000 });
      const uploadBtn = page.locator('[data-testid="upload-document-button"]');
      await expect(uploadBtn).toHaveCount(0);
    });
  });
});
