import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

async function getVehicleMap(page: Page): Promise<Map<string, string>> {
  await page.goto('/expenses/new');
  await page.waitForSelector('.stack-form');
  await wait(page, 1500);
  const map = new Map<string, string>();
  const options = page.locator('.stack-form select').first().locator('option');
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const opt = options.nth(i);
    const val = await opt.getAttribute('value');
    const text = await opt.textContent();
    if (val && text && text !== 'Select vehicle') map.set(text.trim(), val);
  }
  return map;
}

type Expense = {
  vehiclePattern: string; date: string; category: string;
  amount: string; vendor: string; receipt: string; notes: string;
};

const expenses: Expense[] = [
  { vehiclePattern: 'MH12DE', date: '2025-06-01', category: 'Toll', amount: '850', vendor: 'NHAI FASTag Pune-Mumbai', receipt: 'TOLL-2025-0601-PUN', notes: 'Pune-Mumbai expressway toll' },
  { vehiclePattern: 'KA01AB', date: '2025-06-03', category: 'Parking', amount: '200', vendor: 'Orion Mall Parking, Bangalore', receipt: 'PRK-2025-0603-BLR', notes: 'Delivery drop parking charge' },
  { vehiclePattern: 'DL03CE', date: '2025-06-05', category: 'Toll', amount: '1200', vendor: 'NHAI FASTag Delhi-Jaipur', receipt: 'TOLL-2025-0605-DEL', notes: 'Delhi-Jaipur highway toll (round trip)' },
  { vehiclePattern: 'TN07FG', date: '2025-06-07', category: 'Insurance', amount: '38500', vendor: 'ICICI Lombard General Insurance', receipt: 'INS-TN-2025-ANNUAL', notes: 'Annual comprehensive insurance renewal' },
  { vehiclePattern: 'GJ05HI', date: '2025-06-02', category: 'Fine', amount: '2000', vendor: 'Gujarat Traffic Police', receipt: 'CHALLAN-GJ-2025-0602', notes: 'Overloading fine near Rajkot' },
  { vehiclePattern: 'MH14JK', date: '2025-06-08', category: 'Charging', amount: '425', vendor: 'Tata Power Charging, Nashik', receipt: 'CHG-MH-2025-0608', notes: 'Fast charge 50kWh for Pune trip' },
  { vehiclePattern: 'UP32LM', date: '2025-06-04', category: 'Toll', amount: '650', vendor: 'NHAI FASTag Lucknow-Kanpur', receipt: 'TOLL-2025-0604-UP', notes: 'Lucknow-Kanpur expressway toll' },
  { vehiclePattern: 'MH12DE', date: '2025-06-10', category: 'Wash', amount: '500', vendor: 'Hero Car Wash, Pune', receipt: 'WASH-2025-0610-PUN', notes: 'Full exterior + interior wash' },
  { vehiclePattern: 'DL03CE', date: '2025-06-12', category: 'Permit', amount: '5000', vendor: 'Delhi Transport Department', receipt: 'PERM-DL-2025-NP', notes: 'National permit renewal fee' },
  { vehiclePattern: 'KA01AB', date: '2025-06-15', category: 'Service', amount: '12500', vendor: 'Ashok Leyland ASC, Bangalore', receipt: 'SVC-KA-2025-0615', notes: 'Scheduled 75,000 km service' },
];

function findVehicleId(vehicleMap: Map<string, string>, pattern: string): string | undefined {
  for (const [key, val] of vehicleMap) {
    if (key.toUpperCase().includes(pattern)) return val;
  }
  return undefined;
}

async function createExpense(page: Page, e: Expense, vehicleId: string) {
  await page.goto('/expenses/new');
  await page.waitForSelector('.stack-form');
  await wait(page, 1000);

  await page.locator('.stack-form select').first().selectOption(vehicleId);
  await page.getByLabel('Date', { exact: false }).fill(e.date);
  await page.getByLabel('Category', { exact: false }).fill(e.category);
  await page.getByLabel('Amount', { exact: false }).fill(e.amount);
  await page.getByLabel('Vendor', { exact: false }).fill(e.vendor);
  await page.getByLabel('Receipt Number', { exact: false }).fill(e.receipt);
  await page.getByLabel('Notes', { exact: false }).fill(e.notes);

  await page.click('button[type="submit"]:has-text("Save")');
  await page.waitForURL(/\/expenses\//, { timeout: 15000 });
  await wait(page, 1000);
}

test.describe('Seed: Expenses', () => {
  test('Create 10 expense entries', async ({ page }) => {
    test.setTimeout(300_000);

    const loggedIn = await loginAsRole(page, 'admin');
    expect(loggedIn).toBe(true);
    await page.waitForLoadState('networkidle');

    const vehicleMap = await getVehicleMap(page);
    console.log(`Found ${vehicleMap.size} vehicles`);

    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      const vehicleId = findVehicleId(vehicleMap, e.vehiclePattern);
      if (!vehicleId) { console.log(`  [SKIP] Vehicle ${e.vehiclePattern} not found`); continue; }
      console.log(`[${i + 1}/10] ${e.vehiclePattern} | ${e.date} | ${e.category} | ₹${e.amount}`);
      await createExpense(page, e, vehicleId);
      console.log('  [OK] Created');
    }

    console.log('\n=== ALL 10 EXPENSES SEEDED ===');
  });
});
