import { expect, test } from '@playwright/test';
import { loginAsRole, getCredential, getApiBase } from './helpers/credentials';

const TEST_USER_NAME = 'PHASE_ACCESS_UI_TEST_USER';

test.describe('User Access Management', () => {
  test('super_admin can manage user access end-to-end', async ({ page, request }) => {
    test.setTimeout(90_000);
    const cred = getCredential('super_admin');
    if (!cred) {
      throw new Error('Missing SUPER_ADMIN credentials in env. Set CI_SUPER_ADMIN_IDENTIFIER and CI_SUPER_ADMIN_PASSWORD.');
    }

    await loginAsRole(page, 'super_admin');
    const apiBase = getApiBase();

    const token = await page.evaluate(() => {
      const raw = localStorage.getItem('fleet-auth-session');
      if (!raw) return '';
      try { return JSON.parse(raw).accessToken || ''; } catch { return ''; }
    });

    // Get users list and find a non-admin target
    const usersRes = await request.get(`${apiBase}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usersBody = await usersRes.json();
    const usersList = (usersBody.data || usersBody) as Array<{ id: string; name: string; role: { key: string } }>;
    const testUser = usersList.find(u => u.name === TEST_USER_NAME) ||
      usersList.find(u => u.role.key === 'driver') ||
      usersList[1];
    if (!testUser) throw new Error('No test user found');
    const userId = testUser.id;

    // Clean up any existing test overrides/scopes
    const existingOvrRes = await request.get(`${apiBase}/api/v1/access/users/${userId}/permission-overrides`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const existingOvr = (await existingOvrRes.json()).data as Array<{ permissionId: string }>;
    for (const ov of existingOvr) {
      await request.delete(`${apiBase}/api/v1/access/users/${userId}/permission-overrides/${ov.permissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const existingScopesRes = await request.get(`${apiBase}/api/v1/access/users/${userId}/data-scopes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const existingScopes = (await existingScopesRes.json()).data as Array<{ id: string; scopeId: string }>;
    for (const s of existingScopes) {
      if (s.scopeId === 'phase2-vehicle-test') {
        await request.delete(`${apiBase}/api/v1/access/users/${userId}/data-scopes/${s.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }

    // Navigate to user detail page
    await page.goto(`/users/${userId}`);
    await page.waitForSelector('text=Effective Permissions');

    // Verify Effective Permissions tab
    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=Role permissions');
    await page.waitForSelector('text=Final effective list');

    // Add ALLOW override via API
    const allowRes = await request.put(`${apiBase}/api/v1/access/users/${userId}/permission-overrides`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { permissionKey: 'fuel_view', effect: 'ALLOW', reason: 'E2E test - allow fuel_view' },
    });
    if (!allowRes.ok()) throw new Error(`Allow override failed: ${await allowRes.text()}`);

    // Reload and verify in UI
    await page.reload();
    await page.click('button:has-text("Permission Overrides")');
    await page.waitForSelector('text=Current Overrides');
    await expect(page.locator('strong:has-text("fuel_view")')).toBeVisible();

    // Verify ALLOW in Effective Permissions
    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=ALLOW overrides');

    // Add DENY override via API
    const denyRes = await request.put(`${apiBase}/api/v1/access/users/${userId}/permission-overrides`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { permissionKey: 'fuel_view', effect: 'DENY', reason: 'E2E test - deny fuel_view' },
    });
    if (!denyRes.ok()) throw new Error(`Deny override failed: ${await denyRes.text()}`);

    // Reload and verify DENY
    await page.reload();
    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=DENY overrides');

    // Grant VEHICLE VIEW scope via API
    const scopeRes = await request.put(`${apiBase}/api/v1/access/users/${userId}/data-scopes`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { scopeType: 'VEHICLE', scopeId: 'phase2-vehicle-test', accessLevel: 'VIEW', reason: 'E2E scope test' },
    });
    if (!scopeRes.ok()) throw new Error(`Grant scope failed: ${await scopeRes.text()}`);
    const scopeData = await scopeRes.json();

    // Reload and verify scope in UI
    await page.reload();
    await page.click('button:has-text("Data Scopes")');
    await page.waitForSelector('text=Grant Scope');
    await expect(page.locator('text=phase2-vehicle-test')).toBeVisible();

    // Remove scope via API
    await request.delete(`${apiBase}/api/v1/access/users/${userId}/data-scopes/${scopeData.data.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Reload and verify scope removed
    await page.reload();
    await page.click('button:has-text("Data Scopes")');
    await page.waitForSelector('text=Grant Scope');
    await expect(page.locator('text=phase2-vehicle-test')).toHaveCount(0);

    // Verify Activity tab loads
    await page.click('button:has-text("Activity")');
    await page.waitForSelector('text=Activity Timeline');
    // The activity should contain entries (at least auth entries)
    await page.waitForSelector('text=entityType');

    // Cleanup
    const finalOvrRes = await request.get(`${apiBase}/api/v1/access/users/${userId}/permission-overrides`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const finalOvr = (await finalOvrRes.json()).data as Array<{ permissionId: string }>;
    for (const ov of finalOvr) {
      await request.delete(`${apiBase}/api/v1/access/users/${userId}/permission-overrides/${ov.permissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });

  test('normal user can view My Access page without user_view', async ({ page }) => {
    const driverCred = getCredential('driver');
    if (!driverCred) {
      throw new Error('Missing DRIVER credentials in env. Set CI_DRIVER_IDENTIFIER and CI_DRIVER_PASSWORD.');
    }

    const loggedIn = await loginAsRole(page, 'driver');
    expect(loggedIn).toBe(true);

    await page.goto('/my-access');
    await page.waitForSelector('text=My Access');
    await page.waitForSelector('text=My Account');
    await page.waitForSelector('text=My Role');
    await page.waitForSelector('text=My Effective Permissions');
    await page.waitForSelector('text=My Data Scopes');
    await page.waitForSelector('text=Recent Activity');
    await page.waitForSelector('text=My Visible Menus');
    await expect(page.locator('text=My Visible Menus')).toBeVisible();
  });
});
