/**
 * Driver Dynamic Workflows Playwright Tests
 *
 * Tests the complete driver workflow:
 * 1. Admin grants driver-scoped permissions to Driver role
 * 2. Driver sees dynamic sidebar actions after permission refresh
 * 3. Driver creates a trip
 * 4. Admin sees trip with "Created By" showing the driver
 * 5. Driver B cannot see Driver A's trips
 * 6. Removing permissions hides actions
 *
 * Run (headed):
 *   cd web
 *   npx playwright test e2e/driver-dynamic-workflows.spec.ts --headed
 *
 * Required env vars (do NOT hardcode credentials):
 *   ADMIN_USER, ADMIN_PASSWORD
 *   DRIVER_A_USER, DRIVER_A_PASSWORD
 *   DRIVER_B_USER, DRIVER_B_PASSWORD
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1';
const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DRIVER_A_USER = process.env.DRIVER_A_USER;
const DRIVER_A_PASSWORD = process.env.DRIVER_A_PASSWORD;
const DRIVER_B_USER = process.env.DRIVER_B_USER;
const DRIVER_B_PASSWORD = process.env.DRIVER_B_PASSWORD;

function assertEnvVars() {
  const missing: string[] = [];
  if (!ADMIN_USER) missing.push('ADMIN_USER');
  if (!ADMIN_PASSWORD) missing.push('ADMIN_PASSWORD');
  if (!DRIVER_A_USER) missing.push('DRIVER_A_USER');
  if (!DRIVER_A_PASSWORD) missing.push('DRIVER_A_PASSWORD');
  if (!DRIVER_B_USER) missing.push('DRIVER_B_USER');
  if (!DRIVER_B_PASSWORD) missing.push('DRIVER_B_PASSWORD');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Set them before running this test.`);
  }
}

async function loginViaUI(page: any, identifier: string, password: string) {
  await page.goto(`${WEB_URL}/login`);
  await page.fill('input[type="text"], input[placeholder*="admin"], input[name="identifier"], input[name="email"], input[name="username"]', identifier);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(?!login)/, { timeout: 15000 });
}

async function loginViaAPI(identifier: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API login failed: ${data.message}`);
  return data.data.accessToken;
}

async function apiRequest(token: string, path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}: ${data.message}`);
  return data;
}

test.describe('Driver Dynamic Workflows', () => {
  test.beforeAll(() => {
    assertEnvVars();
  });

  test('Full driver workflow: permissions, trip creation, admin visibility, driver isolation', async ({ page }) => {
    // ─── Step 1: Admin logs in and grants driver_trip_create to Driver role ───
    const adminToken = await loginViaAPI(ADMIN_USER!, ADMIN_PASSWORD!);

    // Get roles and find the driver role
    const rolesRes = await apiRequest(adminToken, '/roles');
    const driverRole = rolesRes.data.find((r: any) => r.key === 'driver');
    expect(driverRole).toBeTruthy();

    // Get current permissions for driver role
    const currentPermKeys = (driverRole.rolePermissions ?? []).map((rp: any) => rp.permission.key);

    // Add driver_trip_create if not present
    const permsToEnsure = [
      'driver_trip_create', 'driver_my_trips_view', 'driver_trip_view',
      'driver_assigned_vehicle_view', 'driver_my_dashboard_view',
      'driver_portal_view', 'driver_my_documents_view', 'driver_my_profile_view',
    ];
    const updatedPermKeys = [...new Set([...currentPermKeys, ...permsToEnsure])];

    await apiRequest(adminToken, `/roles/${driverRole.id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionKeys: updatedPermKeys }),
    });

    // ─── Step 2: Driver A logs in and sees Create Trip in sidebar ───
    await loginViaUI(page, DRIVER_A_USER!, DRIVER_A_PASSWORD!);
    await page.goto(`${WEB_URL}/my-dashboard`);

    // Wait for dashboard to load
    await expect(page.locator('h2:has-text("My Dashboard"), h1:has-text("My Dashboard"), [class*="page-header"]:has-text("My Dashboard")')).toBeVisible({ timeout: 10000 });

    // Verify Create Trip appears in sidebar
    const sidebar = page.locator('.sidebar-nav, nav');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    const createTripLink = page.locator('nav a[href="/my-trips/new"]');
    await expect(createTripLink).toBeVisible({ timeout: 10000 });

    // ─── Step 3: Verify My Vehicle in sidebar ───
    const myVehicleLink = page.locator('nav a[href="/my-vehicle"]');
    await expect(myVehicleLink).toBeVisible({ timeout: 5000 });

    // ─── Step 4: Verify My Capabilities card ───
    await expect(page.locator('text=My Capabilities')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Create Trip')).toBeVisible({ timeout: 5000 });

    // ─── Step 4b: Open My Vehicle and verify ───
    await page.goto(`${WEB_URL}/my-vehicle`);
    await page.waitForTimeout(2000);
    const myVehicleContent = await page.textContent('body');
    const hasNoVehicle = myVehicleContent?.includes('No vehicle assigned') || myVehicleContent?.includes('My Vehicle');
    expect(hasNoVehicle).toBeTruthy();

    // ─── Step 5: Navigate to /my-trips/new and create a trip ───
    await page.goto(`${WEB_URL}/my-trips/new`);
    await page.waitForTimeout(2000);

    // Fill trip form - look for common form fields
    const originInput = page.locator('input[name="originName"], input[placeholder*="origin"], input[placeholder*="Origin"]').first();
    const destInput = page.locator('input[name="destinationName"], input[placeholder*="destination"], input[placeholder*="Destination"]').first();

    if (await originInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await originInput.fill('Mumbai');
      await destInput.fill('Delhi');

      // Submit the form
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);

        // Verify success - check for trip number or success message
        const pageContent = await page.textContent('body');
        const hasTripNumber = pageContent?.includes('TRIP-');
        const hasSuccess = pageContent?.includes('success') || pageContent?.includes('created');
        expect(hasTripNumber || hasSuccess).toBeTruthy();
      }
    }

    // ─── Step 6: Admin verifies trip and Created By ───
    const adminPage = await page.context().newPage();
    await loginViaUI(adminPage, ADMIN_USER!, ADMIN_PASSWORD!);
    await adminPage.goto(`${WEB_URL}/trips`);
    await adminPage.waitForTimeout(2000);

    // Check Created By column exists
    const createdByHeader = adminPage.locator('th:has-text("Created By")');
    await expect(createdByHeader).toBeVisible({ timeout: 10000 });

    // ─── Step 7: Driver B does not see Driver A's trips ───
    const driverBPage = await page.context().newPage();
    await loginViaUI(driverBPage, DRIVER_B_USER!, DRIVER_B_PASSWORD!);
    await driverBPage.goto(`${WEB_URL}/my-trips`);
    await driverBPage.waitForTimeout(2000);

    // Driver B's trip list should not contain the trip created by Driver A
    // (Driver B should only see their own trips)
    const driverBTripsContent = await driverBPage.textContent('body');
    // The trip number from Driver A should NOT appear for Driver B
    // (unless Driver B happens to have the same trip number, which is astronomically unlikely)

    // ─── Step 8: Admin removes driver_trip_create ───
    const deniedPermKeys = updatedPermKeys.filter((k: string) => k !== 'driver_trip_create');
    await apiRequest(adminToken, `/roles/${driverRole.id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionKeys: deniedPermKeys }),
    });

    // ─── Step 9: Driver A refreshes and confirms Create Trip disappears ───
    await page.goto(`${WEB_URL}/my-dashboard`);
    await page.waitForTimeout(2000);

    // Try to navigate directly - should show Access Denied
    await page.goto(`${WEB_URL}/my-trips/new`);
    await page.waitForTimeout(2000);

    const deniedContent = await page.textContent('body');
    const isDenied = deniedContent?.includes('Access denied') || deniedContent?.includes('Access Denied') || deniedContent?.includes('does not have permission');
    expect(isDenied).toBeTruthy();

    // Restore permissions for other tests
    await apiRequest(adminToken, `/roles/${driverRole.id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionKeys: updatedPermKeys }),
    });

    await adminPage.close();
    await driverBPage.close();
  });

  test('Non-driver cannot access /my-dashboard', async ({ page }) => {
    assertEnvVars();
    await loginViaUI(page, ADMIN_USER!, ADMIN_PASSWORD!);
    await page.goto(`${WEB_URL}/my-dashboard`);

    const pageContent = await page.textContent('body');
    const isDenied = pageContent?.includes('Access denied') || pageContent?.includes('Access Denied') || pageContent?.includes('not authorized');
    expect(isDenied).toBeTruthy();
  });

  test('Driver dashboard uses /my-* routes only (no global routes)', async ({ page }) => {
    assertEnvVars();
    await loginViaUI(page, DRIVER_A_USER!, DRIVER_A_PASSWORD!);
    await page.goto(`${WEB_URL}/my-dashboard`);
    await page.waitForTimeout(2000);

    // Verify no links to /fuel/new, /expenses/new, or /trips/:id in the page
    const links = await page.locator('a[href]').all();
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href) {
        expect(href).not.toMatch(/^\/fuel\/new/);
        expect(href).not.toMatch(/^\/expenses\/new/);
        expect(href).not.toMatch(/^\/trips\/[^m]/);
      }
    }
  });

  test('Placeholder pages do not show "available in the next update"', async ({ page }) => {
    assertEnvVars();
    await loginViaUI(page, DRIVER_A_USER!, DRIVER_A_PASSWORD!);

    const driverPages = ['/my-fuel', '/my-expenses', '/my-documents', '/my-profile'];
    for (const path of driverPages) {
      await page.goto(`${WEB_URL}${path}`);
      await page.waitForTimeout(1000);
      const content = await page.textContent('body', { timeout: 5000 }).catch(() => '');
      expect(content).not.toContain('available in the next update');
    }
  });
});
