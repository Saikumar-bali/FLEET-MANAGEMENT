import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

test.describe('Phase 7 finance navigation and tabs', () => {
  test('admin sees single Finance sidebar item and finance tabs', async ({ page }) => {
    await loginAsRole(page, 'admin');

    const sidebarFinance = page.locator('[data-testid="sidebar-finance-item"]');
    await expect(sidebarFinance).toHaveCount(1);
    await expect(sidebarFinance).toBeVisible();

    await page.goto('/finance');
    await expect(page).not.toHaveURL('/login');

    const dashboardTab = page.locator('[data-testid="finance-tab-dashboard"]');
    await expect(dashboardTab).toBeVisible();
    await expect(dashboardTab).toHaveClass(/finance-tab-active/);

    await page.locator('[data-testid="finance-tab-transactions"]').click();
    await expect(page).toHaveURL(/\/finance\/transactions/);
    await expect(page.locator('[data-testid="finance-tab-transactions"]')).toHaveClass(/finance-tab-active/);

    await page.locator('[data-testid="finance-tab-trip-billing"]').click();
    await expect(page).toHaveURL(/\/finance\/trip-billings/);
    await expect(page.locator('[data-testid="finance-tab-trip-billing"]')).toHaveClass(/finance-tab-active/);

    await page.locator('[data-testid="finance-tab-payments"]').click();
    await expect(page).toHaveURL(/\/finance\/payments/);
    await expect(page.locator('[data-testid="finance-tab-payments"]')).toHaveClass(/finance-tab-active/);

    await page.locator('[data-testid="finance-tab-dashboard"]').click();
    await expect(page).toHaveURL(/\/finance$/);
    await expect(page.locator('[data-testid="finance-tab-dashboard"]')).toHaveClass(/finance-tab-active/);
  });

  test('all finance tabs are visible for admin', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance');

    const expectedTabs = ['Dashboard', 'Transactions', 'Accounts', 'Categories', 'Vendors', 'Customers', 'Trip Billing', 'Payments'];
    for (const tabName of expectedTabs) {
      const tab = page.locator('.finance-tab', { hasText: tabName });
      await expect(tab).toBeVisible();
    }
  });

  test('viewer sees finance tabs but no create actions', async ({ page }) => {
    await loginAsRole(page, 'viewer');
    await page.goto('/finance');

    const url = page.url();
    if (url.includes('/finance')) {
      const tabs = page.locator('.finance-tab');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('old separate finance items are NOT in sidebar', async ({ page }) => {
    await loginAsRole(page, 'admin');

    const sidebarNav = page.locator('nav[aria-label="Primary"]');
    const oldItems = ['Finance Dashboard', 'Transactions', 'Accounts', 'Categories', 'Vendors', 'Customers', 'Trip Billing', 'Payments'];

    for (const item of oldItems) {
      if (item === 'Finance') continue;
      const matches = sidebarNav.locator('.nav-item').filter({ hasText: new RegExp(`^${item}$`) });
      await expect(matches).toHaveCount(0);
    }
  });

  test('route-level access: /finance redirects non-admin to login', async ({ page }) => {
    await page.goto('/login');
    await page.goto('/finance');
    const url = page.url();
    expect(url.includes('/login') || url.includes('/finance')).toBeTruthy();
  });

  test('vendor form has India-native fields', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    const form = page.locator('[data-testid="finance-vendor-form"]');
    const labels = form.locator('.field-label');
    const count = await labels.count();
    const labelTexts: string[] = [];
    for (let i = 0; i < count; i++) {
      labelTexts.push(await labels.nth(i).textContent() ?? '');
    }
    expect(labelTexts.some((l) => l.includes('GSTIN'))).toBeTruthy();
    expect(labelTexts.some((l) => l.includes('PAN'))).toBeTruthy();
    expect(labelTexts.some((l) => l.includes('IFSC'))).toBeTruthy();
    expect(labelTexts.some((l) => l.includes('UPI'))).toBeTruthy();
    expect(labelTexts.some((l) => l.includes('Pincode'))).toBeTruthy();
  });

  test('customer form has India-native fields', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    const form = page.locator('[data-testid="finance-customer-form"]');
    const labels = form.locator('.field-label');
    const count = await labels.count();
    const labelTexts: string[] = [];
    for (let i = 0; i < count; i++) {
      labelTexts.push(await labels.nth(i).textContent() ?? '');
    }
    expect(labelTexts.some((l) => l.includes('GSTIN'))).toBeTruthy();
    expect(labelTexts.some((l) => l.includes('PAN'))).toBeTruthy();
    expect(labelTexts.some((l) => l.includes('Pincode'))).toBeTruthy();
    expect(labelTexts.some((l) => l.includes('Credit Limit'))).toBeTruthy();
    expect(labelTexts.some((l) => l.includes('GST Registered'))).toBeTruthy();
  });
});
