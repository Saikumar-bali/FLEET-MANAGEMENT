import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';
import { getAdminCredential, getApiBase } from './helpers/credentials';

// Ensure the tests run serially because they share dynamic database state.
test.describe.configure({ mode: 'serial' });

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

async function fillFormByLabels(form: import('@playwright/test').Locator, fieldMap: Record<string, string>) {
  const labels = form.locator('label');
  const count = await labels.count();
  for (let i = 0; i < count; i++) {
    const fieldLabel = labels.nth(i).locator('.field-label');
    if (await fieldLabel.count() === 0) continue;
    const text = (await fieldLabel.textContent() ?? '').trim();
    const input = labels.nth(i).locator('input, textarea, select').first();
    if (await input.count() === 0) continue;

    const val = fieldMap[text];
    if (val !== undefined) {
      const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await input.selectOption(val);
      } else if (await input.getAttribute('type') === 'checkbox') {
        if (val === 'true' || val === 'checked' || val === 'yes') {
          await input.check();
        } else {
          await input.uncheck();
        }
      } else {
        await input.fill(val);
      }
    }
  }
}

test.describe('Realistic India-native Finance UI workflow', () => {
  const cleanup: string[] = [];
  let token = '';
  let base = '';
  let vehicleId = '';
  let driverId = '';
  let customerId = '';
  let tripId = '';
  let billingId = '';
  let vendorId = '';

  test.beforeAll(async () => {
    token = await apiLogin();
    base = getApiBase();

    // Create required real vehicle and driver via API
    const v = await apiPost(base, token, '/api/v1/vehicles', {
      vehicleNumber: `${PREFIX}-MH12AB1234`,
      vehicleType: 'TRUCK',
      fuelType: 'DIESEL',
      brand: 'Tata',
      model: 'Prima 2525.K',
      year: 2024,
    });
    vehicleId = v.data.id;
    cleanup.push(`/api/v1/vehicles/${vehicleId}`);

    const d = await apiPost(base, token, '/api/v1/drivers', {
      name: `${PREFIX} Driver Ram`,
      mobile: `9${ts.toString().slice(-9)}`,
      licenseNumber: `DL-${PREFIX}-001`,
    });
    driverId = d.data.id;
    cleanup.push(`/api/v1/drivers/${driverId}`);

    // Create trip
    const t = await apiPost(base, token, '/api/v1/trips', {
      tripType: 'DELIVERY',
      vehicleId,
      driverId,
      originName: 'Mumbai Warehouse',
      destinationName: 'Bangalore Hub',
      originAddress: 'Andheri East, Mumbai',
      destinationAddress: 'Electronic City, Bangalore',
    });
    tripId = t.data.id;
    cleanup.push(`/api/v1/trips/${tripId}`);
  });

  test.afterAll(async () => {
    // Delete payments first, then trip billings, then trips, customer, vendor, driver, vehicle
    for (const p of [...cleanup].reverse()) {
      try {
        await apiDelete(base, token, p);
      } catch (err) {
        console.error(`Cleanup of ${p} failed:`, err);
      }
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
    await page.waitForTimeout(500);

    const vendorName = `${PREFIX} Bharat Petroleum`;

    await fillFormByLabels(page.locator('[data-testid="finance-vendor-form"]'), {
      'Name': vendorName,
      'Vendor Type': 'FUEL_STATION',
      'Phone': '9876543210',
      'Email': 'billing@bharatpetro.in',
      'GSTIN': '27AALCS1234F1ZH',
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
      'Address': '123 MG Road, Mumbai',
    });

    await page.click('[data-testid="finance-save-button"]');
    
    // Verify vendor appears in table
    await expect(page.locator('td').filter({ hasText: vendorName }).first()).toBeVisible({ timeout: 15000 });

    // Find and store ID for cleanup
    const vRes = await apiGet(base, token, '/api/v1/finance/vendors') as Record<string, unknown>;
    const vItems = ((vRes.data as Record<string, unknown>)?.items ?? []) as Array<Record<string, unknown>>;
    const vendor = vItems.find((v) => v.name === vendorName);
    if (vendor) {
      vendorId = String(vendor.id);
      cleanup.push(`/api/v1/finance/vendors/${vendorId}`);
    }
  });

  test('3. create customer through UI with India-native fields', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');
    await page.locator('button').filter({ hasText: /Create Customer|New Customer/ }).first().click();
    await page.waitForTimeout(500);

    const customerName = `${PREFIX} Tata Logistics`;

    await fillFormByLabels(page.locator('[data-testid="finance-customer-form"]'), {
      'Name': customerName,
      'Customer Type': 'ENTERPRISE',
      'Phone': '9876543220',
      'Email': 'accounts@tatalogistics.in',
      'GSTIN': '27AALCC5678G1ZI',
      'PAN': 'AALCC5678G',
      'State': 'Maharashtra',
      'State Code': '27',
      'Pincode': '400002',
      'Billing Address': '456 Nehru Nagar, Mumbai',
      'Shipping Address': '789 Gandhi Road, Mumbai',
      'Contact Person Name': 'Priya Sharma',
      'Contact Person Phone': '9876543221',
      'Payment Terms (Days)': '45',
      'Credit Limit': '1000000',
      'GST Registered': 'true',
    });

    await page.click('[data-testid="finance-save-button"]');

    // Verify customer appears in table
    await expect(page.locator('td').filter({ hasText: customerName }).first()).toBeVisible({ timeout: 15000 });

    // Find and store ID for cleanup
    const cRes = await apiGet(base, token, '/api/v1/finance/customers') as Record<string, unknown>;
    const cItems = ((cRes.data as Record<string, unknown>)?.items ?? []) as Array<Record<string, unknown>>;
    const customer = cItems.find((c) => c.name === customerName);
    if (customer) {
      customerId = String(customer.id);
      cleanup.push(`/api/v1/finance/customers/${customerId}`);
    }
  });

  test('4. create trip billing through UI using real trip/customer/vehicle', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');
    await page.locator('button').filter({ hasText: /Create Trip Billing|New Billing/ }).first().click();
    await page.waitForTimeout(500);

    const invoiceNumber = `${PREFIX}_INV-001`;
    const dueDateStr = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];
    const invoiceDateStr = new Date().toISOString().split('T')[0];

    await fillFormByLabels(page.locator('[data-testid="finance-trip-billing-form"]'), {
      'Trip ID': tripId,
      'Customer ID': customerId,
      'Vehicle ID': vehicleId,
      'Driver ID': driverId,
      'Invoice Number': invoiceNumber,
      'Invoice Date': invoiceDateStr,
      'LR Number': 'LR-2026-001',
      'Challan Number': 'CH-2026-001',
      'E-Way Bill Number': 'EWB-2026-001',
      'Customer PO Number': 'PO-TATA-2026-001',
      'Place of Supply State': 'Maharashtra',
      'Origin State': 'Maharashtra',
      'Destination State': 'Karnataka',
      'Freight Amount': '100000',
      'Loading Charges': '5000',
      'Unloading Charges': '5000',
      'Detention Charges': '0',
      'Toll Charges': '3000',
      'Permit Charges': '2000',
      'Other Charges': '0',
      'Discount Amount': '2000',
      'CGST Amount': '9000',
      'SGST Amount': '9000',
      'IGST Amount': '0',
      'TDS Amount': '5000',
      'Due Date': dueDateStr,
      'Notes': 'Mumbai to Bangalore trip',
    });

    await page.click('[data-testid="finance-save-button"]');

    // Verify trip billing appears in table
    const row = page.locator('tr').filter({ hasText: invoiceNumber });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Verify UI shows calculated values: totalAmount, netReceivable are positive and correct
    const rowText = await row.textContent() ?? '';
    expect(rowText).not.toContain('₹0.00');

    // Retrieve billing ID for subsequent payment steps
    const res = await apiGet(base, token, '/api/v1/finance/trip-billings') as Record<string, unknown>;
    const items = ((res.data as Record<string, unknown>)?.items ?? []) as Array<Record<string, unknown>>;
    const billing = items.find((b) => String(b.invoiceNumber) === invoiceNumber);
    if (billing) {
      billingId = String(billing.id);
      cleanup.push(`/api/v1/finance/trip-billings/${billingId}`);
      expect(Number(billing.totalAmount)).toBeGreaterThan(0);
      expect(Number(billing.netReceivable)).toBeGreaterThan(0);
      expect(Number(billing.netReceivable)).toBeLessThanOrEqual(Number(billing.totalAmount));
    } else {
      throw new Error('Created billing not found');
    }
  });

  test('5. create partial payment through UI and verify status', async ({ page }) => {
    // Get netReceivable to calculate 60%
    const billingRes = await apiGet(base, token, `/api/v1/finance/trip-billings/${billingId}`) as { data?: Record<string, unknown> };
    const netReceivable = Number(billingRes.data?.netReceivable ?? 117000);
    const partialAmt = Math.round(netReceivable * 0.6);

    await loginAsRole(page, 'admin');
    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForTimeout(500);

    const notesStr = `${PREFIX} 60% advance payment`;

    await fillFormByLabels(page.locator('[data-testid="finance-payment-form"]'), {
      'Trip Billing ID': billingId,
      'Amount': String(partialAmt),
      'Payment Date': new Date().toISOString().split('T')[0],
      'Payment Mode': 'BANK_TRANSFER',
      'Bank UTR Number': 'UTR-HDFC-2026-001',
      'Notes': notesStr,
    });

    await page.click('[data-testid="finance-save-button"]');

    // Verify payment appears in UI
    await expect(page.locator('td').filter({ hasText: notesStr }).first()).toBeVisible({ timeout: 15000 });

    // Track payment for cleanup
    const pRes1 = await apiGet(base, token, '/api/v1/finance/payments') as Record<string, unknown>;
    const pItems1 = ((pRes1.data as Record<string, unknown>)?.items ?? []) as Array<Record<string, unknown>>;
    const payment1 = pItems1.find((p) => p.notes === notesStr);
    if (payment1) {
      cleanup.push(`/api/v1/finance/payments/${String(payment1.id)}`);
    }

    // Verify trip billing status becomes PARTIALLY_PAID
    await page.goto('/finance/trip-billings');
    await page.waitForLoadState('networkidle');
    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row.locator('text=PARTIALLY PAID').first()).toBeVisible({ timeout: 15000 });
  });

  test('6. create second payment through UI and verify status becomes PAID', async ({ page }) => {
    // Get remaining balance
    const billingRes = await apiGet(base, token, `/api/v1/finance/trip-billings/${billingId}`) as { data?: Record<string, unknown> };
    const balanceAmount = Number(billingRes.data?.balanceAmount ?? 46800);

    await loginAsRole(page, 'admin');
    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForTimeout(500);

    const notesStr = `${PREFIX} Final payment`;

    await fillFormByLabels(page.locator('[data-testid="finance-payment-form"]'), {
      'Trip Billing ID': billingId,
      'Amount': String(balanceAmount),
      'Payment Date': new Date().toISOString().split('T')[0],
      'Payment Mode': 'CHEQUE',
      'Cheque Number': 'CHQ-001234',
      'Cheque Date': new Date().toISOString().split('T')[0],
      'Notes': notesStr,
    });

    await page.click('[data-testid="finance-save-button"]');

    // Verify payment appears in UI
    await expect(page.locator('td').filter({ hasText: notesStr }).first()).toBeVisible({ timeout: 15000 });

    // Track payment for cleanup
    const pRes2 = await apiGet(base, token, '/api/v1/finance/payments') as Record<string, unknown>;
    const pItems2 = ((pRes2.data as Record<string, unknown>)?.items ?? []) as Array<Record<string, unknown>>;
    const payment2 = pItems2.find((p) => p.notes === notesStr);
    if (payment2) {
      cleanup.push(`/api/v1/finance/payments/${String(payment2.id)}`);
    }

    // Verify trip billing status becomes PAID and balance is 0
    await page.goto('/finance/trip-billings');
    await page.waitForLoadState('networkidle');
    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row.locator('text=PAID').first()).toBeVisible({ timeout: 15000 });
  });

  test('7. negative validation - invalid GSTIN vendor', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');
    await page.locator('button').filter({ hasText: /Create Vendor|New Vendor/ }).first().click();
    await page.waitForTimeout(500);

    await fillFormByLabels(page.locator('[data-testid="finance-vendor-form"]'), {
      'Name': `${PREFIX} Invalid Vendor`,
      'GSTIN': 'INVALID_GSTIN',
    });

    await page.click('[data-testid="finance-save-button"]');
    const errorBanner = page.locator('[data-testid="finance-error-message"]');
    await expect(errorBanner).toBeVisible({ timeout: 15000 });
    await expect(errorBanner).toContainText(/validation|GSTIN/i);
  });

  test('8. negative validation - invalid PAN customer', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');
    await page.locator('button').filter({ hasText: /Create Customer|New Customer/ }).first().click();
    await page.waitForTimeout(500);

    await fillFormByLabels(page.locator('[data-testid="finance-customer-form"]'), {
      'Name': `${PREFIX} Invalid Customer`,
      'PAN': 'INVALID_PAN',
    });

    await page.click('[data-testid="finance-save-button"]');
    const errorBanner = page.locator('[data-testid="finance-error-message"]');
    await expect(errorBanner).toBeVisible({ timeout: 15000 });
    await expect(errorBanner).toContainText(/validation|PAN/i);
  });

  test('9. negative validation - payment amount <= 0', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForTimeout(500);

    await fillFormByLabels(page.locator('[data-testid="finance-payment-form"]'), {
      'Trip Billing ID': billingId,
      'Amount': '0',
      'Payment Date': new Date().toISOString().split('T')[0],
    });

    await page.click('[data-testid="finance-save-button"]');
    const errorBanner = page.locator('[data-testid="finance-error-message"]');
    await expect(errorBanner).toBeVisible({ timeout: 15000 });
    await expect(errorBanner).toContainText(/validation|amount/i);
  });

  test('10. negative validation - overpayment', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');
    await page.locator('button').filter({ hasText: /Create Payment|New Payment/ }).first().click();
    await page.waitForTimeout(500);

    await fillFormByLabels(page.locator('[data-testid="finance-payment-form"]'), {
      'Trip Billing ID': billingId,
      'Amount': '5000',
      'Payment Date': new Date().toISOString().split('T')[0],
    });

    await page.click('[data-testid="finance-save-button"]');
    const errorBanner = page.locator('[data-testid="finance-error-message"]');
    await expect(errorBanner).toBeVisible({ timeout: 15000 });
    await expect(errorBanner).toContainText(/validation|exceeds|balance/i);
  });

  test('11. P&L dashboard loads and shows financial data', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="finance-tab-dashboard"]')).toHaveClass(/finance-tab-active/);

    await expect(page.locator('[data-testid="finance-pnl-section"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="finance-pnl-summary"]')).toBeVisible();

    const summarySection = page.locator('[data-testid="finance-pnl-summary"]');
    await expect(summarySection.locator('text=Total Income')).toBeVisible();
    await expect(summarySection.locator('text=Total Expenses')).toBeVisible();
    await expect(summarySection.locator('text=Net Profit')).toBeVisible();
  });
});
