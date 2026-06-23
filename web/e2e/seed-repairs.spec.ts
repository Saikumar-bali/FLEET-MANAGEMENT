import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

async function getVehicleMap(page: Page): Promise<Map<string, string>> {
  await page.goto('/repairs/new');
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

type RepairEntry = {
  vehiclePattern: string; date: string; category: string; provider: string;
  description: string; estimatedCost: string; actualCost: string;
  invoiceNumber: string; notes: string;
};

const entries: RepairEntry[] = [
  { vehiclePattern: 'MH12DE', date: '2025-05-20', category: 'Body', provider: 'Tata Authorized Service, Pune', description: 'Front bumper repair after minor collision at parking lot. Dent removal and repaint required.', estimatedCost: '18000', actualCost: '16500', invoiceNumber: 'TATA-PUN-2025-0520', notes: 'Insurance claim processed, deductible paid' },
  { vehiclePattern: 'KA01AB', date: '2025-05-15', category: 'Engine', provider: 'Ashok Leyland ASC, Bangalore', description: 'Turbocharger overhaul at 73,000 km. Loss of power and black smoke under load.', estimatedCost: '42000', actualCost: '39800', invoiceNumber: 'AL-BLR-2025-0515', notes: 'Genuine turbo kit replaced, 6-month warranty' },
  { vehiclePattern: 'DL03CE', date: '2025-05-25', category: 'AC', provider: 'Delhi AC Works, Karol Bagh', description: 'AC compressor replacement, cabin cooling completely stopped. Refrigerant leak detected.', estimatedCost: '12000', actualCost: '11200', invoiceNumber: 'ACW-DEL-2025-0525', notes: 'New compressor + receiver drier + gas充fill' },
  { vehiclePattern: 'TN07FG', date: '2025-06-01', category: 'Brake', provider: 'BharatBenz Service Center, Chennai', description: 'Rear brake drum machining + shoe replacement. Excessive braking distance reported.', estimatedCost: '9500', actualCost: '9200', invoiceNumber: 'BB-CHN-2025-0601', notes: 'Drums resurfaced, new shoes fitted, brake fluid topped' },
  { vehiclePattern: 'GJ05HI', date: '2025-04-10', category: 'Electrical', provider: 'Auto Electric Works, Ahmedabad', description: 'Wiring harness repair, right indicator and headlight malfunction. Rodent damage suspected.', estimatedCost: '7500', actualCost: '7000', invoiceNumber: 'AEW-AMD-2025-0410', notes: 'Harness repaired, protective conduit added' },
  { vehiclePattern: 'UP32LM', date: '2025-05-30', category: 'Body', provider: 'Maruti Authorized Workshop, Lucknow', description: 'Left side mirror replacement + door dent repair from loading dock incident.', estimatedCost: '5500', actualCost: '5200', invoiceNumber: 'MS-LKN-2025-0530', notes: 'OEM mirror fitted, dent pulled and painted' },
];

function findVehicleId(vehicleMap: Map<string, string>, pattern: string): string | undefined {
  for (const [key, val] of vehicleMap) {
    if (key.toUpperCase().includes(pattern)) return val;
  }
  return undefined;
}

async function createRepair(page: Page, e: RepairEntry, vehicleId: string) {
  await page.goto('/repairs/new');
  await page.waitForSelector('.stack-form');
  await wait(page, 1000);

  await page.locator('.stack-form select').first().selectOption(vehicleId);
  await page.getByLabel('Repair Date', { exact: false }).fill(e.date);
  await page.getByLabel('Category', { exact: false }).fill(e.category);
  await page.getByLabel('Provider', { exact: false }).fill(e.provider);
  await page.getByLabel('Description', { exact: false }).fill(e.description);
  await page.getByLabel('Estimated Cost', { exact: false }).fill(e.estimatedCost);
  await page.getByLabel('Actual Cost', { exact: false }).fill(e.actualCost);
  await page.getByLabel('Invoice Number', { exact: false }).fill(e.invoiceNumber);
  await page.getByLabel('Notes', { exact: false }).fill(e.notes);

  await page.click('button[type="submit"]:has-text("Save")');
  await page.waitForURL(/\/repairs\//, { timeout: 15000 });
  await wait(page, 1000);
}

test.describe('Seed: Repairs', () => {
  test('Create 6 repair entries', async ({ page }) => {
    test.setTimeout(300_000);

    const loggedIn = await loginAsRole(page, 'admin');
    expect(loggedIn).toBe(true);
    await page.waitForLoadState('networkidle');

    const vehicleMap = await getVehicleMap(page);
    console.log(`Found ${vehicleMap.size} vehicles`);

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const vehicleId = findVehicleId(vehicleMap, e.vehiclePattern);
      if (!vehicleId) { console.log(`  [SKIP] Vehicle ${e.vehiclePattern} not found`); continue; }
      console.log(`[${i + 1}/6] ${e.vehiclePattern} | ${e.category} | ${e.provider}`);
      await createRepair(page, e, vehicleId);
      console.log('  [OK] Created');
    }

    console.log('\n=== ALL 6 REPAIRS SEEDED ===');
  });
});
