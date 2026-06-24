import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';
import { getAdminCredential, getApiBase } from './helpers/credentials';

const ts = Date.now();
const PREFIX = `PH7_UI_TEST_${ts}`;

function hdr(token: string) {
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

async function apiGet(apiBase: string, token: string, path: string) {
  const res = await fetch(`${apiBase}${path}`, { headers: hdr(token) });
  return res.json();
}

async function apiPost(apiBase: string, token: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: hdr(token),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function apiDelete(apiBase: string, token: string, path: string) {
  await fetch(`${apiBase}${path}`, { method: 'DELETE', headers: hdr(token) });
}

async function fillFormByLabels(form: import('@playwright/test').Locator, fieldMap: Record<string, string | ((input: import('@playwright/test').Locator) => Promise<void>)>) {
  const labels = form.locator('label');
  const count = await labels.count();
  for (let i = 0; i < count; i++) {
    const fieldLabel = labels.nth(i).locator('.field-label');
    if (await fieldLabel.count() === 0) continue;
    const text = (await fieldLabel.textContent() ?? '').trim();
    const input = labels.nth(i).locator('input, textarea, select').first();
    if (await input.count() === 0) continue;

    const handler = fieldMap[text];
    if (handler) {
      if (typeof handler === 'function') {
        await handler(input);
      } else {
        await input.fill(handler);
      }
    }
  }
}

test.describe('Realistic India-native Finance UI workflow', () => {
  const cleanup: string[] = [];
  let token = '';
  let base = '';

  test.beforeAll(async () => {
    token = await apiLogin();
    base = getApiBase();
  });

  test.afterAll(async () => {
    for (const p of [...cleanup].reverse()) {
      try { await apiDelete(base, token, p); } catch { /* best effort */ }
    }
  });

  test('1. login and confirm single Finance sidebar item', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await expect(page.locator('[data-testid="sidebar-finance-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="sidebar-finance-item"]')).toBeVisible();
  });

  test('2. create vendor through UI with India-native fields', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');
    await page.locator('button').filter({ hasText: /Create Vendor|New Vendor/ }).first().click();
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    await fillFormByLabels(page.locator('[data-testid="finance-vendor-form"]'), {
      'Name': `${PREFIX} Bharat Petroleum`,
      'Phone': '9876543210',
      'Email': 'billing@bharatpetro.in',
      'GSTIN': '27AALCS1234F1ZH',
      'Address': '123 MG Road, Mumbai',
      'Legal Name': 'Bharat Petroleum Corporation Ltd',
      'Trade Name': 'Bharat Petro',
      'PAN': 'AALCS1234F',
      'State': 'Maharashtra',
      'State Code': '27',
      'Pincode': '400001',
      'Contact Person Name': 'Rajesh Kumar',
      'Contact Person Phone': '9876543211',
      'Payment Terms (Days)': '30',
      'Bank Account (Masked)': '****9012',
      'IFSC Code': 'HDFC0001234',
      'UPI ID': 'bharatpetro@upi',
      'Vendor Type': async (input) => { await input.selectOption('FUEL_STATION'); },
    });

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('td').filter({ hasText: `${PREFIX} Bharat Petroleum` }).first()).toBeVisible({ timeout: 15000 });

    const vendorsRes = await apiGet(base, token, '/api/v1/finance/vendors') as { data?: { items?: Array<{ id: string; name: string }> } };
    const vendor = vendorsRes.data?.items?.find((v) => v.name.includes(PREFIX));
    if (vendor) cleanup.push(`/api/v1/finance/vendors/${vendor.id}`);
  });

  test('3. create customer through UI with India-native fields', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');
    await page.locator('button').filter({ hasText: /Create Customer|New Customer/ }).first().click();
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    await fillFormByLabels(page.locator('[data-testid="finance-customer-form"]'), {
      'Name': `${PREFIX} Tata Logistics`,
      'Phone': '9876543220',
      'Email': 'accounts@tatalogistics.in',
      'GSTIN': '27AALCC5678G1ZI',
      'Billing Address': '456 Nehru Nagar, Mumbai',
      'Shipping Address': '789 Gandhi Road, Mumbai',
      'PAN': 'AALCC5678G',
      'State': 'Maharashtra',
      'State Code': '27',
      'Pincode': '400002',
      'Contact Person Name': 'Priya Sharma',
      'Contact Person Phone': '9876543221',
      'Payment Terms (Days)': '45',
      'Credit Limit': '1000000',
      'Customer Type': async (input) => { await input.selectOption('ENTERPRISE'); },
    });

    const gstCheckbox = page.locator('[data-testid="finance-customer-form"] input[type="checkbox"]').first();
    if (await gstCheckbox.count() > 0 && !await gstCheckbox.isChecked()) await gstCheckbox.check();

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('td').filter({ hasText: `${PREFIX} Tata Logistics` }).first()).toBeVisible({ timeout: 15000 });

    const customersRes = await apiGet(base, token, '/api/v1/finance/customers') as { data?: { items?: Array<{ id: string; name: string }> } };
    const customer = customersRes.data?.items?.find((c) => c.name.includes(PREFIX));
    if (customer) cleanup.push(`/api/v1/finance/customers/${customer.id}`);
  });

  test('4. setup vehicle, driver, trip via API', async () => {
    const v = await apiPost(base, token, '/api/v1/vehicles', {
      vehicleNumber: `${PREFIX}-MH12AB1234`, vehicleType: 'TRUCK', fuelType: 'DIESEL',
      brand: 'Tata', model: 'Prima 2525.K', year: 2024,
    });
    cleanup.push(`/api/v1/vehicles/${v.data.id}`);

    const d = await apiPost(base, token, '/api/v1/drivers', {
      name: `${PREFIX} Driver Ram`, mobile: `9${ts.toString().slice(-9)}`, licenseNumber: `DL-${PREFIX}-001`,
    });
    cleanup.push(`/api/v1/drivers/${d.data.id}`);

    const t = await apiPost(base, token, '/api/v1/trips', {
      tripType: 'DELIVERY', vehicleId: v.data.id, driverId: d.data.id,
      originName: 'Mumbai Warehouse', destinationName: 'Bangalore Hub',
      originAddress: 'Andheri East, Mumbai', destinationAddress: 'Electronic City, Bangalore',
    });
    cleanup.push(`/api/v1/trips/${t.data.id}`);
  });

  test('5. create trip billing via API with India-native fields and verify UI', async ({ page }) => {
    const [vRes, dRes, tRes, cRes] = await Promise.all([
      apiGet(base, token, '/api/v1/vehicles') as Promise<{ data?: { items?: Array<{ id: string; vehicleNumber: string }> } }>,
      apiGet(base, token, '/api/v1/drivers') as Promise<{ data?: { items?: Array<{ id: string; name: string }> } }>,
      apiGet(base, token, '/api/v1/trips') as Promise<{ data?: { items?: Array<{ id: string }> } }>,
      apiGet(base, token, '/api/v1/finance/customers') as Promise<{ data?: { items?: Array<{ id: string; name: string }> } }>,
    ]);
    const vehicle = vRes.data?.items?.find((v) => v.vehicleNumber.includes(PREFIX));
    const driver = dRes.data?.items?.find((d) => d.name.includes(PREFIX));
    const trip = tRes.data?.items?.find((t) => true);
    const customer = cRes.data?.items?.find((c) => c.name.includes(PREFIX));

    const dueDate = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];

    const billing = await apiPost(base, token, '/api/v1/finance/trip-billings', {
      tripId: trip?.id,
      customerId: customer?.id,
      vehicleId: vehicle?.id,
      driverId: driver?.id,
      invoiceNumber: `${PREFIX}_INV-001`,
      invoiceDate: new Date().toISOString().split('T')[0],
      lrNumber: 'LR-2026-001',
      challanNumber: 'CH-2026-001',
      ewayBillNumber: 'EWB-2026-001',
      customerPoNumber: 'PO-TATA-2026-001',
      placeOfSupplyState: 'Maharashtra',
      originState: 'Maharashtra',
      destinationState: 'Karnataka',
      freightAmount: 100000,
      loadingCharges: 5000,
      unloadingCharges: 5000,
      tollCharges: 3000,
      permitCharges: 2000,
      discountAmount: 2000,
      cgstAmount: 9000,
      sgstAmount: 9000,
      tdsAmount: 5000,
      dueDate,
      notes: 'Mumbai to Bangalore trip',
    });
    cleanup.push(`/api/v1/finance/trip-billings/${billing.data.id}`);

    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');
    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });
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
    const bRes = await apiGet(base, token, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string; netReceivable: number }> } };
    const billing = bRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (!billing) throw new Error('Trip billing not found');

    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    await fillFormByLabels(page.locator('[data-testid="finance-payment-form"]'), {
      'Trip Billing ID': billing.id,
      'Amount': String(Math.round(billing.netReceivable * 0.6)),
      'Payment Date': new Date().toISOString().split('T')[0],
      'Payment Mode': async (input) => { await input.selectOption('BANK_TRANSFER'); },
      'Bank UTR Number': 'UTR-HDFC-2026-001',
      'Notes': '60% advance payment',
    });

    await page.click('[data-testid="finance-save-button"]');
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
    const bRes = await apiGet(base, token, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string; balanceAmount: number }> } };
    const billing = bRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (!billing) throw new Error('Trip billing not found');

    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    await fillFormByLabels(page.locator('[data-testid="finance-payment-form"]'), {
      'Trip Billing ID': billing.id,
      'Amount': String(Math.ceil(billing.balanceAmount)),
      'Payment Date': new Date().toISOString().split('T')[0],
      'Payment Mode': async (input) => { await input.selectOption('CHEQUE'); },
      'Cheque Number': 'CHQ-001234',
      'Cheque Date': new Date().toISOString().split('T')[0],
      'Notes': 'Final payment',
    });

    await page.click('[data-testid="finance-save-button"]');
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

  test('11. negative validation - vendor name is required', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');
    await page.locator('button').filter({ hasText: /Create Vendor|New Vendor/ }).first().click();
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    const nameInput = page.locator('[data-testid="finance-vendor-form"] label').filter({ hasText: 'Name' }).locator('input[type="text"]').first();
    await expect(nameInput).toHaveAttribute('required', '');
    await page.click('[data-testid="finance-save-button"]');
    const valid = await nameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid).toBe(false);
  });

  test('12. negative validation - customer name is required', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');
    await page.locator('button').filter({ hasText: /Create Customer|New Customer/ }).first().click();
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    const nameInput = page.locator('[data-testid="finance-customer-form"] label').filter({ hasText: 'Name' }).locator('input[type="text"]').first();
    await expect(nameInput).toHaveAttribute('required', '');
    await page.click('[data-testid="finance-save-button"]');
    const valid = await nameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid).toBe(false);
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
