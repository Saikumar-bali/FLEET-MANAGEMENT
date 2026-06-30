import { expect, test } from '@playwright/test';
import { loginAsRole, getCredential, getApiBase } from './helpers/credentials';

const TEST_USER_NAME = 'PHASE_ACCESS_UI_TEST_USER';
const TEST_USER_EMAIL = 'phase_access_ui_test_user@test.local';
const TEST_USER_PASSWORD = 'PhaseAccessTest2026!';
const TEST_REASON_PREFIX = 'PHASE_ACCESS_UI_TEST';
const TEST_SCOPE_ID = 'phase2-vehicle-test';

async function getAuthToken(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('fleet-auth-session');
    if (!raw) return '';
    try { return JSON.parse(raw).accessToken || ''; } catch { return ''; }
  });
}

async function apiGet(request: import('@playwright/test').APIRequestContext, apiBase: string, token: string, path: string) {
  const res = await request.get(`${apiBase}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok()) throw new Error(`GET ${path} failed (${res.status()}): ${await res.text()}`);
  return (await res.json()).data;
}

async function apiPut(request: import('@playwright/test').APIRequestContext, apiBase: string, token: string, path: string, data: Record<string, unknown>) {
  const res = await request.put(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  if (!res.ok()) throw new Error(`PUT ${path} failed (${res.status()}): ${await res.text()}`);
  return (await res.json()).data;
}

async function apiDelete(request: import('@playwright/test').APIRequestContext, apiBase: string, token: string, path: string) {
  const res = await request.delete(`${apiBase}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok()) throw new Error(`DELETE ${path} failed (${res.status()}): ${await res.text()}`);
}

async function apiPatch(request: import('@playwright/test').APIRequestContext, apiBase: string, token: string, path: string, data: Record<string, unknown>) {
  const res = await request.fetch(`${apiBase}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  if (!res.ok()) throw new Error(`PATCH ${path} failed (${res.status()}): ${await res.text()}`);
  return (await res.json()).data;
}

async function apiPost(request: import('@playwright/test').APIRequestContext, apiBase: string, token: string, path: string, data: Record<string, unknown>) {
  const res = await request.post(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  if (!res.ok()) throw new Error(`POST ${path} failed (${res.status()}): ${await res.text()}`);
  return (await res.json()).data;
}

test.describe('User Access Management', () => {
  test('super_admin can manage user access end-to-end', async ({ page, request }) => {
    test.setTimeout(120_000);
    const cred = getCredential('super_admin');
    if (!cred) {
      throw new Error('Missing SUPER_ADMIN credentials in env. Set CI_SUPER_ADMIN_IDENTIFIER and CI_SUPER_ADMIN_PASSWORD.');
    }

    await loginAsRole(page, 'super_admin');
    const apiBase = getApiBase();
    const token = await getAuthToken(page);

    // ── Step 1: Find or create deterministic test user ──
    const usersList = await apiGet(request, apiBase, token, '/api/v1/users');
    let testUser = (usersList as Array<{ id: string; name: string; role: { id: string; key: string } }>)
      .find(u => u.name === TEST_USER_NAME);

    if (!testUser) {
      const rolesList = await apiGet(request, apiBase, token, '/api/v1/roles');
      const driverRole = (rolesList as Array<{ id: string; key: string }>).find(r => r.key === 'driver');
      if (!driverRole) throw new Error('Driver role not found');

      testUser = await apiPost(request, apiBase, token, '/api/v1/users', {
        name: TEST_USER_NAME,
        username: 'phase_access_ui_test',
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        roleId: driverRole.id,
        status: 'ACTIVE',
      });
    } else {
      await apiPatch(request, apiBase, token, `/api/v1/users/${testUser.id}/password`, {
        password: TEST_USER_PASSWORD,
      });
    }

    const userId = testUser.id;

    // ── Step 2: Clean up only test-prefixed overrides ──
    const existingOvr = await apiGet(request, apiBase, token, `/api/v1/access/users/${userId}/permission-overrides`);
    for (const ov of (existingOvr as Array<{ permissionId: string; reason: string | null }>)) {
      if (ov.reason?.startsWith(TEST_REASON_PREFIX)) {
        await apiDelete(request, apiBase, token, `/api/v1/access/users/${userId}/permission-overrides/${ov.permissionId}`);
      }
    }

    const existingScopes = await apiGet(request, apiBase, token, `/api/v1/access/users/${userId}/data-scopes`);
    for (const s of (existingScopes as Array<{ id: string; scopeId: string | null; reason: string | null }>)) {
      if (s.reason?.startsWith(TEST_REASON_PREFIX) || s.scopeId === TEST_SCOPE_ID) {
        await apiDelete(request, apiBase, token, `/api/v1/access/users/${userId}/data-scopes/${s.id}`);
      }
    }

    // ── Step 3: Navigate to user detail page ──
    await page.goto(`/users/${userId}`);
    await page.waitForSelector('text=Effective Permissions');

    // ── Step 4: Verify Effective Permissions tab loads ──
    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=Role permissions');
    await page.waitForSelector('text=Final effective list');

    // ── Step 5: Add ALLOW override for fuel_view ──
    await apiPut(request, apiBase, token, `/api/v1/access/users/${userId}/permission-overrides`, {
      permissionKey: 'fuel_view', effect: 'ALLOW', reason: `${TEST_REASON_PREFIX} allow fuel_view`,
    });

    await page.reload();
    await page.click('button:has-text("Permission Overrides")');
    await page.waitForSelector('text=Current Overrides');
    await expect(page.locator('strong:has-text("fuel_view")')).toBeVisible();

    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=ALLOW overrides');
    const allowSection = page.locator('div').filter({ hasText: /^ALLOW overrides/ }).first();
    await expect(allowSection).toContainText('fuel_view');

    // ── Step 6: Add DENY override for fuel_view ──
    await apiPut(request, apiBase, token, `/api/v1/access/users/${userId}/permission-overrides`, {
      permissionKey: 'fuel_view', effect: 'DENY', reason: `${TEST_REASON_PREFIX} deny fuel_view`,
    });

    await page.reload();

    // Verify DENY in Permission Overrides tab
    await page.click('button:has-text("Permission Overrides")');
    await page.waitForSelector('text=Current Overrides');
    await expect(page.locator('strong:has-text("fuel_view")')).toBeVisible();

    // Verify DENY in Effective Permissions tab
    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=DENY overrides');
    const denySection = page.locator('div').filter({ hasText: /^DENY overrides/ }).first();
    await expect(denySection).toContainText('fuel_view');

    // Verify fuel_view is NOT in the Final effective list (DENY wins)
    // Each permission is in its own <div>, so check no child div has exact text "fuel_view"
    await expect(page.locator('h4:has-text("Final effective list")')).toBeVisible();
    const finalListBlock = page.locator('h4:has-text("Final effective list")').locator('~ div').first();
    const exactFuelView = finalListBlock.locator('div', { hasText: /^fuel_view$/ });
    await expect(exactFuelView).toHaveCount(0);

    // ── Step 7: Grant VEHICLE VIEW scope ──
    await apiPut(request, apiBase, token, `/api/v1/access/users/${userId}/data-scopes`, {
      scopeType: 'VEHICLE', scopeId: TEST_SCOPE_ID, accessLevel: 'VIEW', reason: `${TEST_REASON_PREFIX} scope test`,
    });

    await page.reload();
    await page.click('button:has-text("Data Scopes")');
    await page.waitForSelector('text=Grant Scope');
    await page.waitForSelector('text=Current Scopes');
    // Verify scopeId visible in the table
    await expect(page.locator('td', { hasText: TEST_SCOPE_ID })).toBeVisible();
    // Verify scopeType VEHICLE visible in the table
    await expect(page.locator('td strong:has-text("VEHICLE")')).toBeVisible();
    // Verify accessLevel VIEW visible in the table
    await expect(page.locator('td', { hasText: 'VIEW' })).toBeVisible();

    // ── Step 8: Remove scope ──
    const scopesAfterGrant = await apiGet(request, apiBase, token, `/api/v1/access/users/${userId}/data-scopes`);
    const testScope = (scopesAfterGrant as Array<{ id: string; scopeId: string | null }>)
      .find(s => s.scopeId === TEST_SCOPE_ID);
    if (testScope) {
      await apiDelete(request, apiBase, token, `/api/v1/access/users/${userId}/data-scopes/${testScope.id}`);
    }

    await page.reload();
    await page.click('button:has-text("Data Scopes")');
    await page.waitForSelector('text=Grant Scope');
    await expect(page.locator('td', { hasText: TEST_SCOPE_ID })).toHaveCount(0);

    // ── Step 9: Verify Activity tab shows exact admin.user.* actions ──
    await page.click('button:has-text("Activity")');
    await page.waitForSelector('text=Activity Timeline');
    await page.waitForSelector('text=entityType');

    const activitySection = page.locator('article').filter({ hasText: 'Activity Timeline' });
    await expect(activitySection).toContainText('admin.user.permission.allow');
    await expect(activitySection).toContainText('admin.user.permission.deny');
    await expect(activitySection).toContainText('admin.user.scope.grant');
    await expect(activitySection).toContainText('admin.user.scope.remove');

    // ── Step 10: Cleanup only test-prefixed overrides ──
    const finalOvr = await apiGet(request, apiBase, token, `/api/v1/access/users/${userId}/permission-overrides`);
    for (const ov of (finalOvr as Array<{ permissionId: string; reason: string | null }>)) {
      if (ov.reason?.startsWith(TEST_REASON_PREFIX)) {
        await apiDelete(request, apiBase, token, `/api/v1/access/users/${userId}/permission-overrides/${ov.permissionId}`);
      }
    }

    const finalScopes = await apiGet(request, apiBase, token, `/api/v1/access/users/${userId}/data-scopes`);
    for (const s of (finalScopes as Array<{ id: string; scopeId: string | null; reason: string | null }>)) {
      if (s.reason?.startsWith(TEST_REASON_PREFIX) || s.scopeId === TEST_SCOPE_ID) {
        await apiDelete(request, apiBase, token, `/api/v1/access/users/${userId}/data-scopes/${s.id}`);
      }
    }
  });

  test('test user can view My Access page without user_view', async ({ page, request }) => {
    test.setTimeout(90_000);
    const cred = getCredential('super_admin');
    if (!cred) {
      throw new Error('Missing SUPER_ADMIN credentials in env. Set CI_SUPER_ADMIN_IDENTIFIER and CI_SUPER_ADMIN_PASSWORD.');
    }

    await loginAsRole(page, 'super_admin');
    const apiBase = getApiBase();
    const token = await getAuthToken(page);

    const usersList = await apiGet(request, apiBase, token, '/api/v1/users');
    let testUser = (usersList as Array<{ id: string; name: string }>)
      .find(u => u.name === TEST_USER_NAME);

    if (!testUser) {
      const rolesList = await apiGet(request, apiBase, token, '/api/v1/roles');
      const driverRole = (rolesList as Array<{ id: string; key: string }>).find(r => r.key === 'driver');
      if (!driverRole) throw new Error('Driver role not found');
      testUser = await apiPost(request, apiBase, token, '/api/v1/users', {
        name: TEST_USER_NAME,
        username: 'phase_access_ui_test',
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        roleId: driverRole.id,
        status: 'ACTIVE',
      });
    } else {
      await apiPatch(request, apiBase, token, `/api/v1/users/${testUser.id}/password`, {
        password: TEST_USER_PASSWORD,
      });
    }

    // Clear session, then log in as test user
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.fill('input[type="text"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Open My Access page
    await page.goto('/my-access');
    await page.waitForSelector('text=My Access');

    // Verify all required sections
    await page.waitForSelector('text=My Account');
    await page.waitForSelector('text=My Role');
    await page.waitForSelector('text=My Effective Permissions');
    await page.waitForSelector('text=My Data Scopes');
    await page.waitForSelector('text=Recent Activity');
    await page.waitForSelector('text=My Visible Menus');
    await page.waitForSelector('text=Hidden Menus');

    // Verify Phase 3 disclaimer
    await expect(page.locator('text=Scope-based menu checks are pending Phase 3.')).toBeVisible();
  });
});
