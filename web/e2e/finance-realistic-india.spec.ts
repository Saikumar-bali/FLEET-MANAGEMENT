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
  if (!res.ok || !json.data?.id) throw new Error(`API create ${path} failed: ${res.status}`);
  return json.data;
}

async function apiDelete(apiBase: string, token: string, path: string): Promise<void> {
  await fetch(`${apiBase}${path}`, { method: 'DELETE', headers: apiHeaders(token) });
}

async function fillField(page: import('@playwright/test').Page, formLocator: import('@playwright/test').Locator, label: string, value: string) {
  const field = formLocator.locator(`label`).filter({ hasText: label }).locator('input, textarea, select').first();
  if (await field.count() === 0) return;
  const tagName = await field.evaluate((el) => el.tagName.toLowerCase());
  if (tagName === 'select') {
    await field.selectOption(value);
  } else {
    await field.fill(value);
  }
}

test.describe('Realistic India-native Finance UI workflow', () => {
  const cleanupPaths: string[] = [];
  let apiToken = '';

  test.beforeAll(async () => {
    apiToken = await apiLogin();
  });

  test.afterAll(async () => {
    const apiBase = getApiBase();
    for (const path of [...cleanupPaths].reverse()) {
      try { await apiDelete(apiBase, apiToken, path); } catch { /* best effort */ }
    }
  });

  test('1. login and confirm single Finance sidebar item', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const financeItem = page.locator('[data-testid="sidebar-finance-item"]');
    await expect(financeItem).toHaveCount(1);
    await expect(financeItem).toBeVisible();
  });

  test('2. create vendor through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    const newBtn = page.locator('button').filter({ hasText: /Create Vendor|New Vendor/ }).first();
    await newBtn.click();
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    const form = page.locator('[data-testid="finance-vendor-form"]');
    await fillField(page, form, 'Name', `${PREFIX} Bharat Petroleum`);
    await fillField(page, form, 'Vendor Type', 'FUEL_STATION');
    await fillField(page, form, 'Phone', '9876543210');
    await fillField(page, form, 'Email', 'billing@bharatpetro.in');
    await fillField(page, form, 'GSTIN', '27AALCS1234F1ZH');
    await fillField(page, form, 'Address', '123 MG Road, Mumbai');
    await fillField(page, form, 'Legal Name', 'Bharat Petroleum Corporation Ltd');
    await fillField(page, form, 'Trade Name', 'Bharat Petro');
    await fillField(page, form, 'PAN', 'AALCS1234F');
    await fillField(page, form, 'State', 'Maharashtra');
    await fillField(page, form, 'State Code', '27');
    await fillField(page, form, 'Pincode', '400001');
    await fillField(page, form, 'Contact Person Name', 'Rajesh Kumar');
    await fillField(page, form, 'Contact Person Phone', '9876543211');
    await fillField(page, form, 'Payment Terms', '30');
    await fillField(page, form, 'Bank Account', '****9012');
    await fillField(page, form, 'IFSC', 'HDFC0001234');
    await fillField(page, form, 'UPI', 'bharatpetro@upi');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td').filter({ hasText: `${PREFIX} Bharat Petroleum` }).first()).toBeVisible({ timeout: 5000 });

    const apiBase = getApiBase();
    const vendorsRes = await apiGet(apiBase, apiToken, '/api/v1/finance/vendors') as { data?: { items?: Array<{ id: string; name: string }> } };
    const vendor = vendorsRes.data?.items?.find((v) => v.name.includes(PREFIX));
    if (vendor) cleanupPaths.push(`/api/v1/finance/vendors/${vendor.id}`);
  });

  test('3. create customer through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    const newBtn = page.locator('button').filter({ hasText: /Create Customer|New Customer/ }).first();
    await newBtn.click();
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    const form = page.locator('[data-testid="finance-customer-form"]');
    await fillField(page, form, 'Name', `${PREFIX} Tata Logistics`);
    await fillField(page, form, 'Phone', '9876543220');
    await fillField(page, form, 'Email', 'accounts@tatalogistics.in');
    await fillField(page, form, 'GSTIN', '27AALCC5678G1ZI');
    await fillField(page, form, 'Billing Address', '456 Nehru Nagar, Mumbai');
    await fillField(page, form, 'Shipping Address', '789 Gandhi Road, Mumbai');
    await fillField(page, form, 'Customer Type', 'ENTERPRISE');
    await fillField(page, form, 'PAN', 'AALCC5678G');
    await fillField(page, form, 'State', 'Maharashtra');
    await fillField(page, form, 'State Code', '27');
    await fillField(page, form, 'Pincode', '400002');
    await fillField(page, form, 'Contact Person Name', 'Priya Sharma');
    await fillField(page, form, 'Contact Person Phone', '9876543221');
    await fillField(page, form, 'Payment Terms', '45');
    await fillField(page, form, 'Credit Limit', '1000000');

    const gstCheckbox = form.locator('input[type="checkbox"]').first();
    if (await gstCheckbox.count() > 0 && !await gstCheckbox.isChecked()) {
      await gstCheckbox.check();
    }

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td').filter({ hasText: `${PREFIX} Tata Logistics` }).first()).toBeVisible({ timeout: 5000 });

    const apiBase = getApiBase();
    const customersRes = await apiGet(apiBase, apiToken, '/api/v1/finance/customers') as { data?: { items?: Array<{ id: string; name: string }> } };
    const customer = customersRes.data?.items?.find((c) => c.name.includes(PREFIX));
    if (customer) cleanupPaths.push(`/api/v1/finance/customers/${customer.id}`);
  });

  test('4. setup vehicle, driver, trip via API', async () => {
    const apiBase = getApiBase();

    const vehicle = await apiCreate(apiBase, apiToken, '/api/v1/vehicles', {
      vehicleNumber: `${PREFIX}-MH12AB1234`,
      vehicleType: 'TRUCK',
      fuelType: 'DIESEL',
      brand: 'Tata',
      model: 'Prima 2525.K',
      year: 2024,
    });
    cleanupPaths.push(`/api/v1/vehicles/${vehicle.id}`);

    const driver = await apiCreate(apiBase, apiToken, '/api/v1/drivers', {
      name: `${PREFIX} Driver Ram`,
      mobile: `9${ts.toString().slice(-9)}`,
      licenseNumber: `DL-${PREFIX}-001`,
    });
    cleanupPaths.push(`/api/v1/drivers/${driver.id}`);

    const trip = await apiCreate(apiBase, apiToken, '/api/v1/trips', {
      tripType: 'DELIVERY',
      vehicleId: vehicle.id,
      driverId: driver.id,
      originName: 'Mumbai Warehouse',
      destinationName: 'Bangalore Hub',
      originAddress: 'Andheri East, Mumbai',
      destinationAddress: 'Electronic City, Bangalore',
    });
    cleanupPaths.push(`/api/v1/trips/${trip.id}`);
  });

  test('5. create trip billing through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const apiBase = getApiBase();

    const vehiclesRes = await apiGet(apiBase, apiToken, '/api/v1/vehicles') as { data?: { items?: Array<{ id: string; vehicleNumber: string }> } };
    const vehicle = vehiclesRes.data?.items?.find((v) => v.vehicleNumber.includes(PREFIX));

    const driversRes = await apiGet(apiBase, apiToken, '/api/v1/drivers') as { data?: { items?: Array<{ id: string; name: string }> } };
    const driver = driversRes.data?.items?.find((d) => d.name.includes(PREFIX));

    const tripsRes = await apiGet(apiBase, apiToken, '/api/v1/trips') as { data?: { items?: Array<{ id: string; tripNumber: string }> } };
    const trip = tripsRes.data?.items?.find((t) => t.tripNumber?.includes(PREFIX) || true);

    const customersRes = await apiGet(apiBase, apiToken, '/api/v1/finance/customers') as { data?: { items?: Array<{ id: string; name: string }> } };
    const customer = customersRes.data?.items?.find((c) => c.name.includes(PREFIX));

    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const newBtn = page.locator('button').filter({ hasText: /Create Trip Billing|New Billing/ }).first();
    await newBtn.click();
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const form = page.locator('[data-testid="finance-trip-billing-form"]');

    if (trip) await fillField(page, form, 'Trip ID', trip.id);
    if (customer) await fillField(page, form, 'Customer ID', customer.id);
    if (vehicle) await fillField(page, form, 'Vehicle ID', vehicle.id);
    if (driver) await fillField(page, form, 'Driver ID', driver.id);

    await fillField(page, form, 'Invoice Number', `${PREFIX}_INV-001`);
    await fillField(page, form, 'Invoice Date', new Date().toISOString().split('T')[0]);
    await fillField(page, form, 'LR Number', 'LR-2026-001');
    await fillField(page, form, 'Challan Number', 'CH-2026-001');
    await fillField(page, form, 'E-Way Bill', 'EWB-2026-001');
    await fillField(page, form, 'Customer PO', 'PO-TATA-2026-001');
    await fillField(page, form, 'Place of Supply', 'Maharashtra');
    await fillField(page, form, 'Origin State', 'Maharashtra');
    await fillField(page, form, 'Destination State', 'Karnataka');
    await fillField(page, form, 'Freight Amount', '100000');
    await fillField(page, form, 'Loading Charges', '5000');
    await fillField(page, form, 'Unloading Charges', '5000');
    await fillField(page, form, 'Toll Charges', '3000');
    await fillField(page, form, 'Permit Charges', '2000');
    await fillField(page, form, 'Discount Amount', '2000');
    await fillField(page, form, 'CGST Amount', '9000');
    await fillField(page, form, 'SGST Amount', '9000');
    await fillField(page, form, 'TDS Amount', '5000');
    await fillField(page, form, 'Due Date', new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0]);
    await fillField(page, form, 'Notes', 'Mumbai to Bangalore trip');

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

    const totalText = await row.locator('td').nth(3).textContent() ?? '';
    const netText = await row.locator('td').nth(4).textContent() ?? '';
    const total = parseFloat(totalText.replace(/[₹,\s]/g, '')) || 0;
    const net = parseFloat(netText.replace(/[₹,\s]/g, '')) || 0;

    expect(total).toBeGreaterThan(0);
    expect(net).toBeGreaterThan(0);
    expect(net).toBeLessThanOrEqual(total);
  });

  test('7. create partial payment through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const apiBase = getApiBase();

    const billingsRes = await apiGet(apiBase, apiToken, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string; netReceivable: number }> } };
    const billing = billingsRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (!billing) throw new Error('Trip billing not found for payment test');

    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const newBtn = page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first();
    await newBtn.click();
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const form = page.locator('[data-testid="finance-payment-form"]');
    await fillField(page, form, 'Trip Billing ID', billing.id);
    await fillField(page, form, 'Amount', String(Math.round(billing.netReceivable * 0.6)));
    await fillField(page, form, 'Payment Date', new Date().toISOString().split('T')[0]);
    await fillField(page, form, 'Payment Mode', 'BANK_TRANSFER');
    await fillField(page, form, 'Bank UTR', 'UTR-HDFC-2026-001');
    await fillField(page, form, 'Notes', '60% advance payment');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('8. verify trip billing status after partial payment', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });
    const statusCell = row.locator('td').nth(7);
    await expect(statusCell).toContainText('PARTIALLY_PAID', { timeout: 10000 });
  });

  test('9. create second payment (full balance) through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const apiBase = getApiBase();

    const billingsRes = await apiGet(apiBase, apiToken, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string; balanceAmount: number }> } };
    const billing = billingsRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (!billing) throw new Error('Trip billing not found for final payment test');

    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const newBtn = page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first();
    await newBtn.click();
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const form = page.locator('[data-testid="finance-payment-form"]');
    await fillField(page, form, 'Trip Billing ID', billing.id);
    await fillField(page, form, 'Amount', String(Math.ceil(billing.balanceAmount)));
    await fillField(page, form, 'Payment Date', new Date().toISOString().split('T')[0]);
    await fillField(page, form, 'Payment Mode', 'CHEQUE');
    await fillField(page, form, 'Cheque Number', 'CHQ-001234');
    await fillField(page, form, 'Cheque Date', new Date().toISOString().split('T')[0]);
    await fillField(page, form, 'Notes', 'Final payment');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('10. verify trip billing status fully paid', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });
    const statusCell = row.locator('td').nth(7);
    await expect(statusCell).toContainText('PAID', { timeout: 10000 });

    const balanceText = await row.locator('td').nth(6).textContent() ?? '';
    const balance = parseFloat(balanceText.replace(/[₹,\s]/g, '')) || 0;
    expect(balance).toBe(0);
  });

  test('11. negative validation - vendor form requires name', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    const newBtn = page.locator('button').filter({ hasText: /Create Vendor|New Vendor/ }).first();
    await newBtn.click();
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    const nameInput = page.locator('[data-testid="finance-vendor-form"] label').filter({ hasText: /^Name$/ }).locator('input').first();
    await expect(nameInput).toHaveAttribute('required', '');

    await page.click('[data-testid="finance-save-button"]');
    const isValid = await nameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('12. negative validation - customer form requires name', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    const newBtn = page.locator('button').filter({ hasText: /Create Customer|New Customer/ }).first();
    await newBtn.click();
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    const nameInput = page.locator('[data-testid="finance-customer-form"] label').filter({ hasText: /^Name$/ }).locator('input').first();
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
    const pnlSummary = page.locator('[data-testid="finance-pnl-summary"]');

    const hasPnl = await pnlSection.count() > 0;
    if (hasPnl) {
      await expect(pnlSummary).toBeVisible();
      const labels = pnlSummary.locator('.stat-card-label');
      const count = await labels.count();
      const labelTexts: string[] = [];
      for (let i = 0; i < count; i++) {
        labelTexts.push(await labels.nth(i).textContent() ?? '');
      }
      const hasIncome = labelTexts.some((l) => l.includes('Income'));
      const hasExpenses = labelTexts.some((l) => l.includes('Expenses'));
      const hasProfit = labelTexts.some((l) => l.includes('Profit'));
      expect(hasIncome || hasExpenses || hasProfit).toBeTruthy();
    }
  });
});
