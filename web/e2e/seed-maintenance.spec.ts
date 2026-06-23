import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

async function getVehicleMap(page: Page): Promise<Map<string, string>> {
  await page.goto('/maintenance/new');
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

type MaintenanceEntry = {
  vehiclePattern: string; date: string; category: string; priority: string;
  estimatedCost: string; description: string; notes: string;
};

const entries: MaintenanceEntry[] = [
  { vehiclePattern: 'MH12DE', date: '2025-06-10', category: 'Engine', priority: 'HIGH', estimatedCost: '25000', description: 'Engine oil change + filter replacement at 48,000 km service interval. Oil pressure light intermittently on.', notes: 'Use Castrol CRB 15W40, OEM filters' },
  { vehiclePattern: 'KA01AB', date: '2025-06-12', category: 'Brake', priority: 'MEDIUM', estimatedCost: '8000', description: 'Front brake pad replacement, squealing noise during braking at low speeds.', notes: 'Check disc rotor condition as well' },
  { vehiclePattern: 'DL03CE', date: '2025-06-15', category: 'Tire', priority: 'LOW', estimatedCost: '45000', description: 'Full tire replacement (6 tires) - worn tread, approaching minimum depth at 18,900 km.', notes: 'Apollo Endurace HL, size 295/90R20.5' },
  { vehiclePattern: 'TN07FG', date: '2025-06-08', category: 'Electrical', priority: 'CRITICAL', estimatedCost: '15000', description: 'Alternator failure, battery draining completely after overnight parking. Vehicle stranded twice this week.', notes: 'Urgent - vehicle cannot be deployed until fixed' },
  { vehiclePattern: 'GJ05HI', date: '2025-06-05', category: 'Suspension', priority: 'HIGH', estimatedCost: '35000', description: 'Front shock absorber replacement, rough ride reported by driver. Visible oil leak on left side.', notes: 'Replace both front shocks as preventive measure' },
  { vehiclePattern: 'MH14JK', date: '2025-06-20', category: 'Battery', priority: 'MEDIUM', estimatedCost: '85000', description: 'EV battery health check requested. Current capacity at 85%, range reduced by approximately 15%.', notes: 'Schedule with Tata EV service center, Nashik' },
];

function findVehicleId(vehicleMap: Map<string, string>, pattern: string): string | undefined {
  for (const [key, val] of vehicleMap) {
    if (key.toUpperCase().includes(pattern)) return val;
  }
  return undefined;
}

async function createMaintenance(page: Page, e: MaintenanceEntry, vehicleId: string) {
  await page.goto('/maintenance/new');
  await page.waitForSelector('.stack-form');
  await wait(page, 1000);

  await page.locator('.stack-form select').first().selectOption(vehicleId);
  await page.getByLabel('Date', { exact: false }).fill(e.date);
  await page.getByLabel('Category', { exact: false }).fill(e.category);
  await page.locator('.stack-form select').nth(1).selectOption(e.priority);
  await page.getByLabel('Estimated Cost', { exact: false }).fill(e.estimatedCost);
  await page.getByLabel('Description', { exact: false }).fill(e.description);
  await page.getByLabel('Notes', { exact: false }).fill(e.notes);

  await page.click('button[type="submit"]:has-text("Save")');
  await page.waitForURL(/\/maintenance\//, { timeout: 15000 });
  await wait(page, 1000);
}

test.describe('Seed: Maintenance', () => {
  test('Create 6 maintenance entries', async ({ page }) => {
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
      console.log(`[${i + 1}/6] ${e.vehiclePattern} | ${e.category} | ${e.priority} | ₹${e.estimatedCost}`);
      await createMaintenance(page, e, vehicleId);
      console.log('  [OK] Created');
    }

    console.log('\n=== ALL 6 MAINTENANCE ENTRIES SEEDED ===');
  });
});
