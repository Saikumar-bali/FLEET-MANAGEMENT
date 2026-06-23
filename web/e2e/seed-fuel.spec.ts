import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

async function getVehicleMap(page: Page): Promise<Map<string, string>> {
  await page.goto('/fuel/new');
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

type FuelEntry = {
  vehiclePattern: string; date: string; fuelType: string;
  quantity: string; price: string; station: string; receipt: string; notes: string;
};

const fuelEntries: FuelEntry[] = [
  { vehiclePattern: 'MH12DE', date: '2025-06-01', fuelType: 'DIESEL', quantity: '120', price: '92.50', station: 'HP Petrol Pump, Pune-Mumbai Highway', receipt: 'HP-PUN-2025-4401', notes: 'Full tank, long haul to Mumbai' },
  { vehiclePattern: 'KA01AB', date: '2025-06-03', fuelType: 'CNG', quantity: '25', price: '78.00', station: 'BP CNG Station, Koramangala, Bangalore', receipt: 'BP-BLR-2025-3312', notes: 'CNG refill before Mysore trip' },
  { vehiclePattern: 'DL03CE', date: '2025-06-05', fuelType: 'DIESEL', quantity: '85', price: '89.75', station: 'IOCL Depot, Mathura Road, Delhi', receipt: 'IOC-DEL-2025-7721', notes: 'Refuel for Jaipur trip' },
  { vehiclePattern: 'TN07FG', date: '2025-06-07', fuelType: 'DIESEL', quantity: '150', price: '94.20', station: 'HP Petrol Pump, GST Road, Chennai', receipt: 'HP-CHN-2025-5533', notes: 'Heavy load Chennai to Coimbatore' },
  { vehiclePattern: 'GJ05HI', date: '2025-06-02', fuelType: 'DIESEL', quantity: '200', price: '91.80', station: 'Reliance Petrol Pump, SG Highway, Ahmedabad', receipt: 'RIL-AMD-2025-2218', notes: 'Tanker refuel, full capacity' },
  { vehiclePattern: 'MH14JK', date: '2025-06-08', fuelType: 'ELECTRIC', quantity: '0', price: '8.50', station: 'Tata Power Charging Station, Nashik', receipt: 'TP-NAS-2025-1102', notes: 'Charged to 95%, 50kWh consumed' },
  { vehiclePattern: 'UP32LM', date: '2025-06-04', fuelType: 'CNG', quantity: '18', price: '76.50', station: 'Indane CNG Station, Hazratganj, Lucknow', receipt: 'IOL-LKN-2025-4405', notes: 'Quick CNG fill before city delivery' },
  { vehiclePattern: 'MH12DE', date: '2025-06-15', fuelType: 'DIESEL', quantity: '110', price: '93.00', station: 'Shell Station, Baner Road, Pune', receipt: 'SHL-PUN-2025-8809', notes: 'Return trip from Mumbai' },
  { vehiclePattern: 'DL03CE', date: '2025-06-18', fuelType: 'DIESEL', quantity: '95', price: '90.25', station: 'BP Petrol Pump, Tonk Road, Jaipur', receipt: 'BP-JAI-2025-6614', notes: 'Refuel during Delhi-Jaipur return' },
  { vehiclePattern: 'KA01AB', date: '2025-06-20', fuelType: 'CNG', quantity: '28', price: '79.00', station: 'HP CNG Station, Electronic City, Bangalore', receipt: 'HP-BLR-2025-9921', notes: 'CNG refill after Mysore run' },
];

function findVehicleId(vehicleMap: Map<string, string>, pattern: string): string | undefined {
  for (const [key, val] of vehicleMap) {
    if (key.toUpperCase().includes(pattern)) return val;
  }
  return undefined;
}

async function createFuelEntry(page: Page, entry: FuelEntry, vehicleId: string) {
  await page.goto('/fuel/new');
  await page.waitForSelector('.stack-form');
  await wait(page, 1000);

  await page.locator('.stack-form select').first().selectOption(vehicleId);
  await page.getByLabel('Date', { exact: false }).fill(entry.date);
  await page.getByLabel('Fuel Type', { exact: false }).fill(entry.fuelType);
  await page.getByLabel('Quantity Liters', { exact: false }).fill(entry.quantity);
  await page.getByLabel('Price Per Liter', { exact: false }).fill(entry.price);
  await page.getByLabel('Station', { exact: false }).fill(entry.station);
  await page.getByLabel('Receipt Number', { exact: false }).fill(entry.receipt);
  await page.getByLabel('Notes', { exact: false }).fill(entry.notes);

  await page.click('button[type="submit"]:has-text("Save")');
  await page.waitForURL(/\/fuel\//, { timeout: 15000 });
  await wait(page, 1000);
}

test.describe('Seed: Fuel Entries', () => {
  test('Create 10 fuel entries', async ({ page }) => {
    test.setTimeout(300_000);

    const loggedIn = await loginAsRole(page, 'admin');
    expect(loggedIn).toBe(true);
    await page.waitForLoadState('networkidle');

    const vehicleMap = await getVehicleMap(page);
    console.log(`Found ${vehicleMap.size} vehicles`);

    for (let i = 0; i < fuelEntries.length; i++) {
      const e = fuelEntries[i];
      const vehicleId = findVehicleId(vehicleMap, e.vehiclePattern);
      if (!vehicleId) { console.log(`  [SKIP] Vehicle ${e.vehiclePattern} not found`); continue; }
      console.log(`[${i + 1}/10] ${e.vehiclePattern} | ${e.date} | ${e.fuelType} | ${e.quantity}L`);
      await createFuelEntry(page, e, vehicleId);
      console.log('  [OK] Created');
    }

    console.log('\n=== ALL 10 FUEL ENTRIES SEEDED ===');
  });
});
