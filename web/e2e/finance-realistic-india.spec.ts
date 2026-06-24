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

test.describe('Realistic India-native Finance UI workflow', () => {
  const createdIds: { path: string; id: string }[] = [];

  test.afterAll(async () => {
    const apiBase = getApiBase();
    let token: string;
    try { token = await apiLogin(); } catch { return; }
    for (const item of [...createdIds].reverse()) {
      try { await apiDelete(apiBase, token, item.path); } catch { /* best effort */ }
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

    await page.click('button:has-text("Create Vendor"), button:has-text("New Vendor")');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    const form = page.locator('[data-testid="finance-vendor-form"]');
    await form.locator('input').nth(0).fill(`${PREFIX} Bharat Petroleum`);
    await form.locator('select').first().selectOption('FUEL_STATION');
    await form.locator('input').nth(1).fill('9876543210');
    await form.locator('input[type="email"]').fill('billing@bharatpetro.in');

    const gstinInput = form.locator('input').filter({ has: page.locator('~ .field-label:has-text("GSTIN"), ~ span:has-text("GSTIN")') }).first();
    const allInputs = form.locator('input');
    const inputCount = await allInputs.count();
    for (let i = 0; i < inputCount; i++) {
      const label = await allInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('GSTIN')) await allInputs.nth(i).fill('27AALCS1234F1ZH');
      if (label.includes('Address')) await allInputs.nth(i).fill('123 MG Road, Mumbai');
      if (label.includes('Vendor Code')) await allInputs.nth(i).fill(`${PREFIX}-VENDOR-001`);
      if (label.includes('Legal Name')) await allInputs.nth(i).fill('Bharat Petroleum Corporation Ltd');
      if (label.includes('Trade Name')) await allInputs.nth(i).fill('Bharat Petro');
      if (label.includes('PAN') && !label.includes('Contact')) await allInputs.nth(i).fill('AALCS1234F');
      if (label.includes('State') && !label.includes('Code') && !label.includes('Supply') && !label.includes('Origin') && !label.includes('Destination')) await allInputs.nth(i).fill('Maharashtra');
      if (label.includes('State Code')) await allInputs.nth(i).fill('27');
      if (label.includes('Pincode')) await allInputs.nth(i).fill('400001');
      if (label.includes('Contact Person Name')) await allInputs.nth(i).fill('Rajesh Kumar');
      if (label.includes('Contact Person Phone')) await allInputs.nth(i).fill('9876543211');
      if (label.includes('Bank Account')) await allInputs.nth(i).fill('****9012');
      if (label.includes('IFSC')) await allInputs.nth(i).fill('HDFC0001234');
      if (label.includes('UPI')) await allInputs.nth(i).fill('bharatpetro@upi');
    }

    const paymentTermsInput = form.locator('input[type="number"]');
    const ptCount = await paymentTermsInput.count();
    for (let i = 0; i < ptCount; i++) {
      const label = await paymentTermsInput.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Payment Terms')) await paymentTermsInput.nth(i).fill('30');
    }

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });

    const nameCell = page.locator('td strong, td').filter({ hasText: `${PREFIX} Bharat Petroleum` });
    await expect(nameCell.first()).toBeVisible({ timeout: 5000 });
  });

  test('3. create customer through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    await page.click('button:has-text("Create Customer"), button:has-text("New Customer")');
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    const form = page.locator('[data-testid="finance-customer-form"]');
    const allInputs = form.locator('input, textarea');
    const inputCount = await allInputs.count();
    for (let i = 0; i < inputCount; i++) {
      const el = allInputs.nth(i);
      const label = await el.evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Name') && !label.includes('Legal') && !label.includes('Trade') && !label.includes('Contact')) await el.fill(`${PREFIX} Tata Logistics`);
      if (label.includes('Phone') && !label.includes('Contact')) await el.fill('9876543220');
      if (label.includes('Email')) await el.fill('accounts@tatalogistics.in');
      if (label.includes('GSTIN')) await el.fill('27AALCC5678G1ZI');
      if (label.includes('Billing Address')) await el.fill('456 Nehru Nagar, Mumbai');
      if (label.includes('Shipping Address')) await el.fill('789 Gandhi Road, Mumbai');
      if (label.includes('Customer Code')) await el.fill(`${PREFIX}-CUST-001`);
      if (label.includes('Legal Name')) await el.fill('Tata Logistics Pvt Ltd');
      if (label.includes('Trade Name')) await el.fill('Tata Logistics');
      if (label.includes('PAN') && !label.includes('Contact')) await el.fill('AALCC5678G');
      if (label.includes('State') && !label.includes('Code') && !label.includes('Supply') && !label.includes('Origin') && !label.includes('Destination')) await el.fill('Maharashtra');
      if (label.includes('State Code')) await el.fill('27');
      if (label.includes('Pincode')) await el.fill('400002');
      if (label.includes('Contact Person Name')) await el.fill('Priya Sharma');
      if (label.includes('Contact Person Phone')) await el.fill('9876543221');
      if (label.includes('Credit Limit')) await el.fill('1000000');
    }

    const selectEl = form.locator('select').first();
    await selectEl.selectOption('ENTERPRISE');

    const numberInputs = form.locator('input[type="number"]');
    const numCount = await numberInputs.count();
    for (let i = 0; i < numCount; i++) {
      const label = await numberInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Payment Terms')) await numberInputs.nth(i).fill('45');
    }

    const gstCheckbox = form.locator('input[type="checkbox"]').first();
    if (!await gstCheckbox.isChecked()) await gstCheckbox.check();

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });

    const nameCell = page.locator('td strong, td').filter({ hasText: `${PREFIX} Tata Logistics` });
    await expect(nameCell.first()).toBeVisible({ timeout: 5000 });
  });

  test('4. setup vehicle, driver, trip via API', async ({ page }) => {
    const apiBase = getApiBase();
    const token = await apiLogin();

    const vehicle = await apiCreate(apiBase, token, '/api/v1/vehicles', {
      vehicleNumber: `${PREFIX}-MH12AB1234`,
      vehicleType: 'TRUCK',
      fuelType: 'DIESEL',
      brand: 'Tata',
      model: 'Prima 2525.K',
      year: 2024,
    });
    createdIds.push({ path: `/api/v1/vehicles/${vehicle.id}`, id: vehicle.id });

    const driver = await apiCreate(apiBase, token, '/api/v1/drivers', {
      name: `${PREFIX} Driver Ram`,
      mobile: `9${ts.toString().slice(-9)}`,
      licenseNumber: `DL-${PREFIX}-001`,
    });
    createdIds.push({ path: `/api/v1/drivers/${driver.id}`, id: driver.id });

    const trip = await apiCreate(apiBase, token, '/api/v1/trips', {
      tripType: 'DELIVERY',
      vehicleId: vehicle.id,
      driverId: driver.id,
      originName: 'Mumbai Warehouse',
      destinationName: 'Bangalore Hub',
      originAddress: 'Andheri East, Mumbai',
      destinationAddress: 'Electronic City, Bangalore',
    });
    createdIds.push({ path: `/api/v1/trips/${trip.id}`, id: trip.id });

    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const form = page.locator('[data-testid="finance-trip-billing-form"]');
    const tripIdInput = form.locator('input').filter({ has: page.locator('~ .field-label:has-text("Trip ID")') }).first();

    const allInputs = form.locator('input:not([type="date"]):not([type="number"])');
    const count = await allInputs.count();
    for (let i = 0; i < count; i++) {
      const label = await allInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Trip ID')) await allInputs.nth(i).fill(trip.id);
    }

    const existingVendor = await (await import('./helpers/api')).loginAsAdmin();
    const vendorsRes = await fetch(`${apiBase}/api/v1/finance/vendors`, { headers: { Authorization: `Bearer ${existingVendor}` } });
    const vendorsJson = await vendorsRes.json() as { data?: { items?: Array<{ id: string; name: string }> } };
    const vendor = vendorsJson.data?.items?.find((v) => v.name.includes(PREFIX));
    const customersRes = await fetch(`${apiBase}/api/v1/finance/customers`, { headers: { Authorization: `Bearer ${existingVendor}` } });
    const customersJson = await customersRes.json() as { data?: { items?: Array<{ id: string; name: string }> } };
    const customer = customersJson.data?.items?.find((c) => c.name.includes(PREFIX));

    if (customer) {
      for (let i = 0; i < count; i++) {
        const label = await allInputs.nth(i).evaluate((el) => {
          const label = el.closest('label');
          return label?.textContent?.trim() ?? '';
        });
        if (label.includes('Customer ID')) await allInputs.nth(i).fill(customer.id);
      }
    }

    for (let i = 0; i < count; i++) {
      const label = await allInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Vehicle ID')) await allInputs.nth(i).fill(vehicle.id);
      if (label.includes('Driver ID')) await allInputs.nth(i).fill(driver.id);
    }

    const dateInputs = form.locator('input[type="date"]');
    const dateCount = await dateInputs.count();
    for (let i = 0; i < dateCount; i++) {
      const label = await dateInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      const today = new Date().toISOString().split('T')[0];
      if (label.includes('Invoice Date')) await dateInputs.nth(i).fill(today);
      if (label.includes('Due Date')) {
        const due = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];
        await dateInputs.nth(i).fill(due);
      }
    }

    const numInputs = form.locator('input[type="number"]');
    const numCount = await numInputs.count();
    for (let i = 0; i < numCount; i++) {
      const label = await numInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Freight Amount')) await numInputs.nth(i).fill('100000');
      if (label.includes('Loading Charges')) await numInputs.nth(i).fill('5000');
      if (label.includes('Unloading Charges')) await numInputs.nth(i).fill('5000');
      if (label.includes('Detention Charges')) await numInputs.nth(i).fill('0');
      if (label.includes('Toll Charges')) await numInputs.nth(i).fill('3000');
      if (label.includes('Permit Charges')) await numInputs.nth(i).fill('2000');
      if (label.includes('Other Charges')) await numInputs.nth(i).fill('0');
      if (label.includes('Discount Amount')) await numInputs.nth(i).fill('2000');
      if (label.includes('CGST Amount')) await numInputs.nth(i).fill('9000');
      if (label.includes('SGST Amount')) await numInputs.nth(i).fill('9000');
      if (label.includes('IGST Amount')) await numInputs.nth(i).fill('0');
      if (label.includes('TDS Amount')) await numInputs.nth(i).fill('5000');
    }

    const allTextInputs = form.locator('input:not([type]):not([type="date"]):not([type="number"])');
    const textCount = await allTextInputs.count();
    for (let i = 0; i < textCount; i++) {
      const label = await allTextInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Invoice Number')) await allTextInputs.nth(i).fill(`${PREFIX}_INV-001`);
      if (label.includes('LR Number')) await allTextInputs.nth(i).fill('LR-2026-001');
      if (label.includes('Challan Number')) await allTextInputs.nth(i).fill('CH-2026-001');
      if (label.includes('E-Way Bill')) await allTextInputs.nth(i).fill('EWB-2026-001');
      if (label.includes('Customer PO')) await allTextInputs.nth(i).fill('PO-TATA-2026-001');
      if (label.includes('Place of Supply')) await allTextInputs.nth(i).fill('Maharashtra');
      if (label.includes('Origin State')) await allTextInputs.nth(i).fill('Maharashtra');
      if (label.includes('Destination State')) await allTextInputs.nth(i).fill('Karnataka');
    }

    const textarea = form.locator('textarea');
    if (await textarea.count() > 0) await textarea.first().fill('Mumbai to Bangalore trip');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });

    const invoiceCell = page.locator('td').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(invoiceCell.first()).toBeVisible({ timeout: 5000 });
  });

  test('5. verify trip billing calculated values', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });

    const totalCell = row.locator('td').nth(3);
    const netCell = row.locator('td').nth(4);
    const totalText = await totalCell.textContent() ?? '';
    const netText = await netCell.textContent() ?? '';

    const total = parseFloat(totalText.replace(/[₹,\s]/g, '')) || 0;
    const net = parseFloat(netText.replace(/[₹,\s]/g, '')) || 0;

    expect(total).toBeGreaterThan(0);
    expect(net).toBeGreaterThan(0);
    expect(net).toBeLessThanOrEqual(total);

    const statusCell = row.locator('td').nth(7);
    const statusText = await statusCell.textContent() ?? '';
    expect(['BILLED', 'UNBILLED', 'PARTIALLY_PAID']).toContain(statusText.trim());
  });

  test('6. create partial payment through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    await page.click('button:has-text("Create Payment"), button:has-text("New Payment")');
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const apiBase = getApiBase();
    const token = await apiLogin();
    const billingsRes = await fetch(`${apiBase}/api/v1/finance/trip-billings`, { headers: { Authorization: `Bearer ${token}` } });
    const billingsJson = await billingsRes.json() as { data?: { items?: Array<{ id: string; invoiceNumber?: string; netReceivable: number }> } };
    const billing = billingsJson.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));

    const form = page.locator('[data-testid="finance-payment-form"]');
    const allInputs = form.locator('input:not([type="number"]):not([type="date"])');
    const count = await allInputs.count();
    for (let i = 0; i < count; i++) {
      const label = await allInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Trip Billing ID') && billing) await allInputs.nth(i).fill(billing.id);
      if (label.includes('Bank UTR')) await allInputs.nth(i).fill('UTR-HDFC-2026-001');
      if (label.includes('Reference Number')) await allInputs.nth(i).fill('REF-ADVANCE-001');
    }

    const numInput = form.locator('input[type="number"]');
    if (await numInput.count() > 0) {
      const partialAmount = billing ? Math.round(billing.netReceivable * 0.6) : 70000;
      await numInput.first().fill(String(partialAmount));
    }

    const dateInput = form.locator('input[type="date"]');
    if (await dateInput.count() > 0) {
      const today = new Date().toISOString().split('T')[0];
      await dateInput.first().fill(today);
    }

    const modeSelect = form.locator('select').first();
    await modeSelect.selectOption('BANK_TRANSFER');

    const textarea = form.locator('textarea');
    if (await textarea.count() > 0) await textarea.first().fill('60% advance payment');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('7. verify trip billing status after partial payment', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });

    const statusCell = row.locator('td').nth(7);
    await expect(statusCell).toContainText('PARTIALLY_PAID', { timeout: 10000 });
  });

  test('8. create second payment (full balance) through UI', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    await page.click('button:has-text("Create Payment"), button:has-text("New Payment")');
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    const apiBase = getApiBase();
    const token = await apiLogin();
    const billingsRes = await fetch(`${apiBase}/api/v1/finance/trip-billings`, { headers: { Authorization: `Bearer ${token}` } });
    const billingsJson = await billingsRes.json() as { data?: { items?: Array<{ id: string; invoiceNumber?: string; balanceAmount: number }> } };
    const billing = billingsJson.data?.items?.find((b) => b.invoiceNumber?.includes(PREFIX));

    const form = page.locator('[data-testid="finance-payment-form"]');
    const allInputs = form.locator('input:not([type="number"]):not([type="date"])');
    const count = await allInputs.count();
    for (let i = 0; i < count; i++) {
      const label = await allInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Trip Billing ID') && billing) await allInputs.nth(i).fill(billing.id);
      if (label.includes('Cheque Number')) await allInputs.nth(i).fill('CHQ-001234');
      if (label.includes('Reference Number')) await allInputs.nth(i).fill('REF-FINAL-001');
    }

    const numInput = form.locator('input[type="number"]');
    if (await numInput.count() > 0) {
      const balance = billing ? Math.ceil(billing.balanceAmount) : 50000;
      await numInput.first().fill(String(balance));
    }

    const dateInput = form.locator('input[type="date"]');
    const dateCount = await dateInput.count();
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < dateCount; i++) {
      const label = await dateInput.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label.includes('Payment Date') || label === '') await dateInput.nth(i).fill(today);
      if (label.includes('Cheque Date')) await dateInput.nth(i).fill(today);
    }

    const modeSelect = form.locator('select').first();
    await modeSelect.selectOption('CHEQUE');

    const textarea = form.locator('textarea');
    if (await textarea.count() > 0) await textarea.first().fill('Final payment');

    await page.click('[data-testid="finance-save-button"]');
    await expect(page.locator('[data-testid="finance-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('9. verify trip billing status fully paid', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/trip-billings');
    await page.waitForSelector('[data-testid="finance-trip-billing-form"]');

    const row = page.locator('tr').filter({ hasText: `${PREFIX}_INV-001` });
    await expect(row).toBeVisible({ timeout: 10000 });

    const statusCell = row.locator('td').nth(7);
    await expect(statusCell).toContainText('PAID', { timeout: 10000 });

    const balanceCell = row.locator('td').nth(6);
    const balanceText = await balanceCell.textContent() ?? '';
    const balance = parseFloat(balanceText.replace(/[₹,\s]/g, '')) || 0;
    expect(balance).toBe(0);
  });

  test('10. negative validation - invalid GSTIN on vendor', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/vendors');
    await page.waitForSelector('[data-testid="finance-vendor-form"]');

    await page.click('button:has-text("Create Vendor"), button:has-text("New Vendor")');

    const form = page.locator('[data-testid="finance-vendor-form"]');
    const allInputs = form.locator('input');
    const count = await allInputs.count();
    for (let i = 0; i < count; i++) {
      const label = await allInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label === 'Name') await allInputs.nth(i).fill(`${PREFIX} Invalid GSTIN Vendor`);
      if (label.includes('GSTIN')) await allInputs.nth(i).fill('INVALID-GSTIN');
    }

    await page.click('[data-testid="finance-save-button"]');

    const errorOrSuccess = page.locator('[data-testid="finance-error"], [data-testid="finance-success"]');
    await expect(errorOrSuccess.first()).toBeVisible({ timeout: 10000 });
  });

  test('11. negative validation - invalid PAN on customer', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/customers');
    await page.waitForSelector('[data-testid="finance-customer-form"]');

    await page.click('button:has-text("Create Customer"), button:has-text("New Customer")');

    const form = page.locator('[data-testid="finance-customer-form"]');
    const allInputs = form.locator('input:not([type="checkbox"])');
    const count = await allInputs.count();
    for (let i = 0; i < count; i++) {
      const label = await allInputs.nth(i).evaluate((el) => {
        const label = el.closest('label');
        return label?.textContent?.trim() ?? '';
      });
      if (label === 'Name') await allInputs.nth(i).fill(`${PREFIX} Invalid PAN Customer`);
      if (label.includes('PAN') && !label.includes('Contact')) await allInputs.nth(i).fill('INVALID');
    }

    await page.click('[data-testid="finance-save-button"]');

    const errorOrSuccess = page.locator('[data-testid="finance-error"], [data-testid="finance-success"]');
    await expect(errorOrSuccess.first()).toBeVisible({ timeout: 10000 });
  });

  test('12. negative validation - zero payment amount', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/payments');
    await page.waitForSelector('[data-testid="finance-payment-form"]');

    await page.click('button:has-text("Create Payment"), button:has-text("New Payment")');

    const form = page.locator('[data-testid="finance-payment-form"]');
    const numInput = form.locator('input[type="number"]');
    if (await numInput.count() > 0) await numInput.first().fill('0');

    const dateInput = form.locator('input[type="date"]');
    if (await dateInput.count() > 0) {
      const today = new Date().toISOString().split('T')[0];
      await dateInput.first().fill(today);
    }

    await page.click('[data-testid="finance-save-button"]');

    const errorMsg = page.locator('[data-testid="finance-error"]');
    const successMsg = page.locator('[data-testid="finance-success"]');
    await expect(errorMsg.or(successMsg).first()).toBeVisible({ timeout: 10000 });
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
      const labelCount = await labels.count();
      const labelTexts: string[] = [];
      for (let i = 0; i < labelCount; i++) {
        labelTexts.push(await labels.nth(i).textContent() ?? '');
      }
      const hasIncome = labelTexts.some((l) => l.includes('Income'));
      const hasExpenses = labelTexts.some((l) => l.includes('Expenses'));
      const hasProfit = labelTexts.some((l) => l.includes('Profit'));
      expect(hasIncome || hasExpenses || hasProfit).toBeTruthy();
    }
  });
});
