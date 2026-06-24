import { expect, test } from '@playwright/test';
import { loginAsRole, getCredential, getApiBase } from './helpers/credentials';

test.describe('Finance RBAC', () => {
  const RESTRICTED_ROLES = ['driver', 'assistant_driver', 'mechanic', 'viewer'] as const;
  const ALLOWED_ROLES = ['finance', 'collector'] as const;

  for (const role of RESTRICTED_ROLES) {
    test.describe(`restricted role: ${role}`, () => {
      test(`sidebar does NOT show Finance for ${role}`, async ({ page }) => {
        const loggedIn = await loginAsRole(page, role);
        if (!loggedIn) {
          test.skip();
          return;
        }
        await expect(page.locator('[data-testid="sidebar-finance-item"]')).toHaveCount(0);
      });

      test(`direct /finance returns Access Denied for ${role}`, async ({ page }) => {
        const loggedIn = await loginAsRole(page, role);
        if (!loggedIn) {
          test.skip();
          return;
        }
        await page.goto('/finance');
        await expect(page.locator('text=Access Denied').or(page.locator('text=403'))).toBeVisible({ timeout: 10000 });
      });

      for (const path of ['/finance/payments', '/finance/trip-billings', '/finance/vendors', '/finance/customers', '/finance/transactions']) {
        test(`direct ${path} returns Access Denied for ${role}`, async ({ page }) => {
          const loggedIn = await loginAsRole(page, role);
          if (!loggedIn) {
            test.skip();
            return;
          }
          await page.goto(path);
          await expect(page.locator('text=Access Denied').or(page.locator('text=403'))).toBeVisible({ timeout: 10000 });
        });
      }

      test(`API /finance/dashboard-summary returns 403 for ${role}`, async ({ page }) => {
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
        const dashRes = await page.request.get(`${baseUrl}/api/v1/finance/dashboard-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(dashRes.status()).toBe(403);
      });
    });
  }

  test.describe('allowed role: finance', () => {
    test('sidebar shows Finance for finance role', async ({ page }) => {
      const loggedIn = await loginAsRole(page, 'finance');
      if (!loggedIn) {
        test.skip();
        return;
      }
      await expect(page.locator('[data-testid="sidebar-finance-item"]')).toBeVisible();
    });

    test('/finance loads for finance role', async ({ page }) => {
      const loggedIn = await loginAsRole(page, 'finance');
      if (!loggedIn) {
        test.skip();
        return;
      }
      await page.goto('/finance');
      await expect(page.locator('[data-testid="finance-pnl-section"]')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('allowed role: collector', () => {
    test('sidebar shows Finance for collector', async ({ page }) => {
      const loggedIn = await loginAsRole(page, 'collector');
      if (!loggedIn) {
        test.skip();
        return;
      }
      // Collector should have finance_view, so Finance item should be visible
      const item = page.locator('[data-testid="sidebar-finance-item"]');
      await expect(item).toBeVisible();
    });
  });
});
