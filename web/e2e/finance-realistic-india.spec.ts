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

    const form = page.locator('[data-testid="finance-vendor-form"]');
    const inputs = form.locator('label');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const fieldLabel = inputs.nth(i).locator('.field-label');
      if (await fieldLabel.count() === 0) continue;
      const text = (await fieldLabel.textContent() ?? '').trim();
      const input = inputs.nth(i).locator('input, textarea, select').first();
      if (await input.count() === 0) continue;

      if (text === 'Name') await input.fill(`${PREFIX} Bharat Petroleum`);
      else if (text === 'Phone') await input.fill('9876543210');
      else if (text === 'Email') await input.fill('billing@bharatpetro.in');
      else if (text === 'GSTIN') await input.fill('27AALCS1234F1ZH');
      else if (text === 'Address') await input.fill('123 MG Road, Mumbai');
      else if (text === 'Legal Name') await input.fill('Bharat Petroleum Corporation Ltd');
      else if (text === 'Trade Name') await input.fill('Bharat Petro');
      else if (text === 'PAN') await input.fill('AALCS1234F');
      else if (text === 'State') await input.fill('Maharashtra');
      else if (text === 'State Code') await input.fill('27');
      else if (text === 'Pincode') await input.fill('400001');
      else if (text === 'Contact Person Name') await input.fill('Rajesh Kumar');
      else if (text === 'Contact Person Phone') await input.fill('9876543211');
      else if (text === 'Payment Terms (Days)') await input.fill('30');
      else if (text === 'Bank Account (Masked)') await input.fill('****9012');
      else if (text === 'IFSC Code') await input.fill('HDFC0001234');
      else if (text === 'UPI ID') await input.fill('bharatpetro@upi');
      else if (text === 'Vendor Type') await input.selectOption('FUEL_STATION');
    }

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td').filter({ hasText: `${PREFIX} Bharat Petroleum` }).first()).toBeVisible({ timeout: 5000 });

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

    const form = page.locator('[data-testid="finance-customer-form"]');
    const labels = form.locator('label');
    const count = await labels.count();
    for (let i = 0; i < count; i++) {
      const fieldLabel = labels.nth(i).locator('.field-label');
      if (await fieldLabel.count() === 0) continue;
      const text = (await fieldLabel.textContent() ?? '').trim();
      const input = labels.nth(i).locator('input, textarea, select').first();
      if (await input.count() === 0) continue;

      if (text === 'Name') await input.fill(`${PREFIX} Tata Logistics`);
      else if (text === 'Phone') await input.fill('9876543220');
      else if (text === 'Email') await input.fill('accounts@tatalogistics.in');
      else if (text === 'GSTIN') await input.fill('27AALCC5678G1ZI');
      else if (text === 'Billing Address') await input.fill('456 Nehru Nagar, Mumbai');
      else if (text === 'Shipping Address') await input.fill('789 Gandhi Road, Mumbai');
      else if (text === 'PAN') await input.fill('AALCC5678G');
      else if (text === 'State') await input.fill('Maharashtra');
      else if (text === 'State Code') await input.fill('27');
      else if (text === 'Pincode') await input.fill('400002');
      else if (text === 'Contact Person Name') await input.fill('Priya Sharma');
      else if (text === 'Contact Person Phone') await input.fill('9876543221');
      else if (text === 'Payment Terms (Days)') await input.fill('45');
      else if (text === 'Credit Limit') await input.fill('1000000');
      else if (text === 'Customer Type') await input.selectOption('ENTERPRISE');
    }

    const gstCheckbox = form.locator('input[type="checkbox"]').first();
    if (await gstCheckbox.count() > 0 && !await gstCheckbox.isChecked()) await gstCheckbox.check();

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td').filter({ hasText: `${PREFIX} Tata Logistics` }).first()).toBeVisible({ timeout: 5000 });

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

  test('5. create trip billing through UI with India-native fields', async ({ page }) => {
    await loginAsRole(page, 'admin');

    const [vRes, dRes, tRes, cRes] = await Promise.all([
      apiGet(base, token, '/api/v1/vehicles') as Promise<{ data?: { items?: Array<{ id: string; vehicleNumber: string }> } }>,
      apiGet(base, token, '/api/v1/drivers') as Promise<{ data?: { items?: Array<{ id: string; name: string }> } }>,
      apiGet(base, token, '/api/v1/trips') as Promise<{ data?: { items?: Array<{ id: string }> } }>,
      apiGet(base, token, '/api/v1/finance/customers') as Promise<{ data?: { items?: Array<{ id: string; name: string }> } }>,
    ]);
    const vehicle = vRes.data?.items?.find((v) => v.vehicleNumber.includes(PREFIX));
    const driver = dRes.data?.items?.find((d) => d.name.includes(PREFIX));
    const trip = tRes.data?.items?.[0];
    const customer = cRes.data?.items?.find((c) => c.name.includes(PREFIX));

    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');
    await page.locator('button').filter({ hasText: /Create Trip Billing|New Billing/ }).first().click();
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const form = page.locator('[data-testid="finance-trip-billing-form"]');
    const labels = form.locator('label');
    const count = await labels.count();
    for (let i = 0; i < count; i++) {
      const fieldLabel = labels.nth(i).locator('.field-label');
      if (await fieldLabel.count() === 0) continue;
      const text = (await fieldLabel.textContent() ?? '').trim();
      const input = labels.nth(i).locator('input, textarea, select').first();
      if (await input.count() === 0) continue;

      if (text === 'Trip ID' && trip) await input.fill(trip.id);
      else if (text === 'Customer ID' && customer) await input.fill(customer.id);
      else if (text === 'Vehicle ID' && vehicle) await input.fill(vehicle.id);
      else if (text === 'Driver ID' && driver) await input.fill(driver.id);
      else if (text === 'Invoice Number') await input.fill(`${PREFIX}_INV-001`);
      else if (text === 'Invoice Date') await input.fill(new Date().toISOString().split('T')[0]);
      else if (text === 'LR Number') await input.fill('LR-2026-001');
      else if (text === 'Challan Number') await input.fill('CH-2026-001');
      else if (text === 'E-Way Bill Number') await input.fill('EWB-2026-001');
      else if (text === 'Customer PO Number') await input.fill('PO-TATA-2026-001');
      else if (text === 'Place of Supply State') await input.fill('Maharashtra');
      else if (text === 'Origin State') await input.fill('Maharashtra');
      else if (text === 'Destination State') await input.fill('Karnataka');
      else if (text === 'Freight Amount') await input.fill('100000');
      else if (text === 'Loading Charges') await input.fill('5000');
      else if (text === 'Unloading Charges') await input.fill('5000');
      else if (text === 'Toll Charges') await input.fill('3000');
      else if (text === 'Permit Charges') await input.fill('2000');
      else if (text === 'Discount Amount') await input.fill('2000');
      else if (text === 'CGST Amount') await input.fill('9000');
      else if (text === 'SGST Amount') await input.fill('9000');
      else if (text === 'TDS Amount') await input.fill('5000');
      else if (text === 'Due Date') await input.fill(new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0]);
      else if (text === 'Notes') await input.fill('Mumbai to Bangalore trip');
    }

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td').filter({ hasText: `${PREFIX}_INV-001` }).first()).toBeVisible({ timeout: 5000 });

    const bRes = await apiGet(base, token, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string }> } };
    const billing = bRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (billing) cleanup.push(`/api/v1/finance/trip-billings/${billing.id}`);
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

    const form = page.locator('[data-testid="finance-payment-form"]');
    const labels = form.locator('label');
    const count = await labels.count();
    for (let i = 0; i < count; i++) {
      const fieldLabel = labels.nth(i).locator('.field-label');
      if (await fieldLabel.count() === 0) continue;
      const text = (await fieldLabel.textContent() ?? '').trim();
      const input = labels.nth(i).locator('input, textarea, select').first();
      if (await input.count() === 0) continue;

      if (text === 'Trip Billing ID') await input.fill(billing.id);
      else if (text === 'Amount') await input.fill(String(Math.round(billing.netReceivable * 0.6)));
      else if (text === 'Payment Date') await input.fill(new Date().toISOString().split('T')[0]);
      else if (text === 'Payment Mode') await input.selectOption('BANK_TRANSFER');
      else if (text === 'Bank UTR Number') await input.fill('UTR-HDFC-2026-001');
      else if (text === 'Notes') await input.fill('60% advance payment');
    }

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
    const bRes = await apiGet(base, token, '/api/v1/finance/trip-billings') as { data?: { items?: Array<{ id: string; invoiceNumber?: string; balanceAmount: number }> } };
    const billing = bRes.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));
    if (!billing) throw new Error('Trip billing not found');

    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const form = page.locator('[data-testid="finance-payment-form"]');
    const labels = form.locator('label');
    const count = await labels.count();
    for (let i = 0; i < count; i++) {
      const fieldLabel = labels.nth(i).locator('.field-label');
      if (await fieldLabel.count() === 0) continue;
      const text = (await fieldLabel.textContent() ?? '').trim();
      const input = labels.nth(i).locator('input, textarea, select').first();
      if (await input.count() === 0) continue;

      if (text === 'Trip Billing ID') await input.fill(billing.id);
      else if (text === 'Amount') await input.fill(String(Math.ceil(billing.balanceAmount)));
      else if (text === 'Payment Date') await input.fill(new Date().toISOString().split('T')[0]);
      else if (text === 'Payment Mode') await input.selectOption('CHEQUE');
      else if (text === 'Cheque Number') await input.fill('CHQ-001234');
      else if (text === 'Cheque Date') await input.fill(new Date().toISOString().split('T')[0]);
      else if (text === 'Notes') await input.fill('Final payment');
    }

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
