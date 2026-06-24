import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';
import { getAdminCredential, getApiBase } from './helpers/credentials';

const ts = Date.now();
const PREFIX = `PH7_UI_TEST_${ts}`;

function apiHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function apiLogin(): Promise<string> {
  const apiBase = getApiBase();
  const { identifier, password } = getAdminCredential();
  const res = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json() as { data?: { accessToken?: string } };
  const token = json.data?.accessToken;
  if (!token) throw new Error('API login failed');
  return token;
}

async function apiGet(apiBase: string, token: string, path: string): Promise<unknown> {
  const res = await fetch(`${apiBase}${path}`, { headers: apiHeaders(token) });
  return res.json();
}

async function apiCreate(apiBase: string, token: string, path: string, body: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  });
  const json = await res.json() as { data?: { id: string } };
  if (!res.ok || !json.data?.id) throw new Error(`API create ${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function apiDelete(apiBase: string, token: string, path: string): Promise<void> {
  await fetch(`${apiBase}${path}`, { method: 'DELETE', headers: apiHeaders(token) });
}

async function fillByLabel(page: import('@playwright/test').Page, form: import('@playwright/test').Locator, labelText: string, value: string) {
  const label = form.locator('label').filter({ has: page.locator(`.field-label:text("${labelText}")`) }).first();
  if (await label.count() === 0) return;
  const input = label.locator('input, textarea, select').first();
  if (await input.count() === 0) return;
  const tag = await input.evaluate((el) => el.tagName.toLowerCase());
  if (tag === 'select') await input.selectOption(value);
  else await input.fill(value);
}

test.describe('Realistic India-native Finance UI workflow', () => {
  const cleanupPaths: string[] = [];
  let apiToken = '';
  let apiBase = '';

  test.beforeAll(async () => {
    apiToken = await apiLogin();
    apiBase = getApiBase();
  });

  test.afterAll(async () => {
    for (const path of [...cleanupPaths].reverse()) {
      try { await apiDelete(apiBase, apiToken, path); } catch { /* best effort */ }
    }
  });

  test('1. login and confirm single Finance sidebar item', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await expect(page.locator('[data-testid="sidebar-finance-item"]')).toHaveCount(1);
  });

  test('2. create vendor through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');
    await page.locator('button').filter({ hasText: /Create Vendor|New Vendor/ }).first().click();
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    const form = page.locator('[data-testid="finance-vendor-form"]');
    await fillByLabel(page, form, 'Name', `${PREFIX} Bharat Petroleum`);
    await fillByLabel(page, form, 'Phone', '9876543210');
    await fillByLabel(page, form, 'Email', 'billing@bharatpetro.in');
    await fillByLabel(page, form, 'GSTIN', '27AALCS1234F1ZH');
    await fillByLabel(page, form, 'Address', '123 MG Road, Mumbai');
    await fillByLabel(page, form, 'Legal Name', 'Bharat Petroleum Corporation Ltd');
    await fillByLabel(page, form, 'Trade Name', 'Bharat Petro');
    await fillByLabel(page, form, 'PAN', 'AALCS1234F');
    await fillByLabel(page, form, 'State', 'Maharashtra');
    await fillByLabel(page, form, 'State Code', '27');
    await fillByLabel(page, form, 'Pincode', '400001');
    await fillByLabel(page, form, 'Contact Person Name', 'Rajesh Kumar');
    await fillByLabel(page, form, 'Contact Person Phone', '9876543211');
    await fillByLabel(page, form, 'Payment Terms (Days)', '30');
    await fillByLabel(page, form, 'Bank Account (Masked)', '****9012');
    await fillByLabel(page, form, 'IFSC Code', 'HDFC0001234');
    await fillByLabel(page, form, 'UPI ID', 'bharatpetro@upi');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td').filter({ hasText: `${PREFIX} Bharat Petroleum` }).first()).toBeVisible({ timeout: 5000 });

    const vendorsRes = await apiGet(apiBase, apiToken, '/api/v1/finance/vendors') as { data?: { items?: Array<{ id: string; name: string }> } };
    const vendor = vendorsRes.data?.items?.find((v) => v.name.includes(PREFIX));
    if (vendor) cleanupPaths.push(`/api/v1/finance/vendors/${vendor.id}`);
  });

  test('3. create customer through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');
    await page.locator('button').filter({ hasText: /Create Customer|New Customer/ }).first().click();
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    const form = page.locator('[data-testid="finance-customer-form"]');
    await fillByLabel(page, form, 'Name', `${PREFIX} Tata Logistics`);
    await fillByLabel(page, form, 'Phone', '9876543220');
    await fillByLabel(page, form, 'Email', 'accounts@tatalogistics.in');
    await fillByLabel(page, form, 'GSTIN', '27AALCC5678G1ZI');
    await fillByLabel(page, form, 'Billing Address', '456 Nehru Nagar, Mumbai');
    await fillByLabel(page, form, 'Shipping Address', '789 Gandhi Road, Mumbai');
    await fillByLabel(page, form, 'PAN', 'AALCC5678G');
    await fillByLabel(page, form, 'State', 'Maharashtra');
    await fillByLabel(page, form, 'State Code', '27');
    await fillByLabel(page, form, 'Pincode', '400002');
    await fillByLabel(page, form, 'Contact Person Name', 'Priya Sharma');
    await fillByLabel(page, form, 'Contact Person Phone', '9876543221');
    await fillByLabel(page, form, 'Payment Terms (Days)', '45');
    await fillByLabel(page, form, 'Credit Limit', '1000000');

    const typeSelect = form.locator('select').first();
    if (await typeSelect.count() > 0) await typeSelect.selectOption('ENTERPRISE');

    const gstCheckbox = form.locator('input[type="checkbox"]').first();
    if (await gstCheckbox.count() > 0 && !await gstCheckbox.isChecked()) await gstCheckbox.check();

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td').filter({ hasText: `${PREFIX} Tata Logistics` }).first()).toBeVisible({ timeout: 5000 });

    const customersRes = await apiGet(apiBase, apiToken, '/api/v1/finance/customers') as { data?: { items?: Array<{ id: string; name: string }> } };
    const customer = customersRes.data?.items?.find((c) => c.name.includes(PREFIX));
    if (customer) cleanupPaths.push(`/api/v1/finance/customers/${customer.id}`);
  });

  test('4. setup vehicle, driver, trip via API', async () => {
    const vehicle = await apiCreate(apiBase, apiToken, '/api/v1/vehicles', {
      vehicleNumber: `${PREFIX}-MH12AB1234`, vehicleType: 'TRUCK', fuelType: 'DIESEL',
      brand: 'Tata', model: 'Prima 2525.K', year: 2024,
    });
    cleanupPaths.push(`/api/v1/vehicles/${vehicle.id}`);

    const driver = await apiCreate(apiBase, apiToken, '/api/v1/drivers', {
      name: `${PREFIX} Driver Ram`, mobile: `9${ts.toString().slice(-9)}`, licenseNumber: `DL-${PREFIX}-001`,
    });
    cleanupPaths.push(`/api/v1/drivers/${driver.id}`);

    const trip = await apiCreate(apiBase, apiToken, '/api/v1/trips', {
      tripType: 'DELIVERY', vehicleId: vehicle.id, driverId: driver.id,
      originName: 'Mumbai Warehouse', destinationName: 'Bangalore Hub',
      originAddress: 'Andheri East, Mumbai', destinationAddress: 'Electronic City, Bangalore',
    });
    cleanupPaths.push(`/api/v1/trips/${trip.id}`);
  });

  test('5. create trip billing through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');

    const vehiclesRes = await apiGet(apiBase, apiToken, '/api/v1/vehicles') as { data?: { items?: Array<{ id: string; vehicleNumber: string }> } };
    const vehicle = vehiclesRes.data?.items?.find((v) => v.vehicleNumber.includes(PREFIX));
    const driversRes = await apiGet(apiBase, apiToken, '/api/v1/drivers') as { data?: { items?: Array<{ id: string; name: string }> } };
    const driver = driversRes.data?.items?.find((d) => d.name.includes(PREFIX));
    const tripsRes = await apiGet(apiBase, apiToken, '/api/v1/trips') as { data?: { items?: Array<{ id: string }> } };
    const trip = tripsRes.data?.items?.[0];
    const customersRes = await apiGet(apiBase, apiToken, '/api/v1/finance/customers') as { data?: { items?: Array<{ id: string; name: string }> } };
    const customer = customersRes.data?.items?.find((c) => c.name.includes(PREFIX));

    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');
    await page.locator('button').filter({ hasText: /Create Trip Billing|New Billing/ }).first().click();
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const form = page.locator('[data-testid="finance-trip-billing-form"]');

    if (trip) await fillByLabel(page, form, 'Trip ID', trip.id);
    if (customer) await fillByLabel(page, form, 'Customer ID', customer.id);
    if (vehicle) await fillByLabel(page, form, 'Vehicle ID', vehicle.id);
    if (driver) await fillByLabel(page, form, 'Driver ID', driver.id);

    await fillByLabel(page, form, 'Invoice Number', `${PREFIX}_INV-001`);
    await fillByLabel(page, form, 'Invoice Date', new Date().toISOString().split('T')[0]);
    await fillByLabel(page, form, 'LR Number', 'LR-2026-001');
    await fillByLabel(page, form, 'Challan Number', 'CH-2026-001');
    await fillByLabel(page, form, 'E-Way Bill Number', 'EWB-2026-001');
    await fillByLabel(page, form, 'Customer PO Number', 'PO-TATA-2026-001');
    await fillByLabel(page, form, 'Place of Supply State', 'Maharashtra');
    await fillByLabel(page, form, 'Origin State', 'Maharashtra');
    await fillByLabel(page, form, 'Destination State', 'Karnataka');
    await fillByLabel(page, form, 'Freight Amount', '100000');
    await fillByLabel(page, form, 'Loading Charges', '5000');
    await fillByLabel(page, form, 'Unloading Charges', '5000');
    await fillByLabel(page, form, 'Toll Charges', '3000');
    await fillByLabel(page, form, 'Permit Charges', '2000');
    await fillByLabel(page, form, 'Discount Amount', '2000');
    await fillByLabel(page, form, 'CGST Amount', '9000');
    await fillByLabel(page, form, 'SGST Amount', '9000');
    await fillByLabel(page, form, 'TDS Amount', '5000');
    await fillByLabel(page, form, 'Due Date', new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0]);
    await fillByLabel(page, form, 'Notes', 'Mumbai to Bangalore trip');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td').filter({ hasText: `${PREFIX}_INV-001` }).first()).toBeVisible({ timeout: 5000 });

    const billingsRes = await apiGet(apiBase, apiToken, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string }> } };
    const billing = billingsRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (billing) cleanupPaths.push(`/api/v1/finance/trip-billings/${billing.id}`);
  });

  test('6. verify trip billing calculated values', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });

    const total = parseFloat((await row.locator('td').nth(3).textContent() ?? '').replace(/[₹,\s]/g, '')) || 0;
    const net = parseFloat((await row.locator('td').nth(4).textContent() ?? '').replace(/[₹,\s]/g, '')) || 0;
    expect(total).toBeGreaterThan(0);
    expect(net).toBeGreaterThan(0);
    expect(net).toBeLessThanOrEqual(total);
  });

  test('7. create partial payment through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const billingsRes = await apiGet(apiBase, apiToken, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string; netReceivable: number }> } };
    const billing = billingsRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (!billing) throw new Error('Trip billing not found');

    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const form = page.locator('[data-testid="finance-payment-form"]');
    await fillByLabel(page, form, 'Trip Billing ID', billing.id);
    await fillByLabel(page, form, 'Amount', String(Math.round(billing.netReceivable * 0.6)));
    await fillByLabel(page, form, 'Payment Date', new Date().toISOString().split('T')[0]);
    await fillByLabel(page, form, 'Payment Mode', 'BANK_TRANSFER');
    await fillByLabel(page, form, 'Bank UTR Number', 'UTR-HDFC-2026-001');
    await fillByLabel(page, form, 'Notes', '60% advance payment');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('8. verify trip billing status after partial payment', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');
    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('td').nth(7)).toContainText('PARTIALLY_PAID', { timeout: 10000 });
  });

  test('9. create second payment (full balance) through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const billingsRes = await apiGet(apiBase, apiToken, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string; balanceAmount: number }> } };
    const billing = billingsRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (!billing) throw new Error('Trip billing not found');

    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const form = page.locator('[data-testid="finance-payment-form"]');
    await fillByLabel(page, form, 'Trip Billing ID', billing.id);
    await fillByLabel(page, form, 'Amount', String(Math.ceil(billing.balanceAmount)));
    await fillByLabel(page, form, 'Payment Date', new Date().toISOString().split('T')[0]);
    await fillByLabel(page, form, 'Payment Mode', 'CHEQUE');
    await fillByLabel(page, form, 'Cheque Number', 'CHQ-001234');
    await fillByLabel(page, form, 'Cheque Date', new Date().toISOString().split('T')[0]);
    await fillByLabel(page, form, 'Notes', 'Final payment');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('10. verify trip billing status fully paid', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');
    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('td').nth(7)).toContainText('PAID', { timeout: 10000 });
    const balance = parseFloat((await row.locator('td').nth(6).textContent() ?? '').replace(/[₹,\s]/g, '')) || 0;
    expect(balance).toBe(0);
  });

  test('11. negative validation - vendor form requires name', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');
    await page.locator('button').filter({ hasText: /Create Vendor|New Vendor/ }).first().click();
    await page.waitForSelector('[data-testid="finance-vendor-form"]');
    const nameInput = page.locator('[data-testid="finance-vendor-form"] label').filter({ has: page.locator('.field-label:text("Name")') }).locator('input').first();
    await expect(nameInput).toHaveAttribute('required', '');
    await page.click('[data-testid="finance-save-button"]');
    const isValid = await nameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('12. negative validation - customer form requires name', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');
    await page.locator('button').filter({ hasText: /Create Customer|New Customer/ }).first().click();
    await page.waitForSelector('[data-testid="finance-customer-form"]');
    const nameInput = page.locator('[data-testid="finance-customer-form"] label').filter({ has: page.locator('.field-label:text("Name")') }).locator('input').first();
    await expect(nameInput).toHaveAttribute('required', '');
    await page.click('[data-testid="finance-save-button"]');
    const isValid = await nameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('13. P&L dashboard loads and shows financial data', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="finance-tab-dashboard"]')).toHaveClass(/finance-tab-active/);

    const pnlSection = page.locator('[data-testid="finance-pnl-section"]');
    if (await pnlSection.count() > 0) {
      await expect(page.locator('[data-testid="finance-pnl-summary"]')).toBeVisible();
      const labels = page.locator('[data-testid="finance-pnl-summary"] .stat-card-label');
      const count = await labels.count();
      const texts: string[] = [];
      for (let i = 0; i < count; i++) texts.push(await labels.nth(i).textContent() ?? '');
      expect(texts.some((t) => t.includes('Income') || t.includes('Expenses') || t.includes('Profit'))).toBeTruthy();
    }
  });
});
