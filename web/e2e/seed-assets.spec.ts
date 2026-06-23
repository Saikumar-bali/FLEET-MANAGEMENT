import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

type Asset = {
  code: string; name: string; categoryName: string; serial: string;
  amount: string; purchaseDate: string; notes: string;
};

const assets: Asset[] = [
  { code: 'ASSET-001', name: 'Fire Extinguisher 5kg', categoryName: 'Safety Equipment', serial: 'FE-2024-001', amount: '3500', purchaseDate: '2024-01-15', notes: 'ABC dry chemical, BIS certified, mounted on Tata Prima' },
  { code: 'ASSET-002', name: 'First Aid Kit Premium', categoryName: 'Safety Equipment', serial: 'FA-2024-002', amount: '2800', purchaseDate: '2024-02-10', notes: 'ISI certified, 50-item kit for commercial vehicles' },
  { code: 'ASSET-003', name: 'Hydraulic Jack 3 Ton', categoryName: 'Tools & Equipment', serial: 'HJ-2023-003', amount: '8500', purchaseDate: '2023-06-20', notes: 'Heavy duty floor jack for truck tire changes' },
  { code: 'ASSET-004', name: 'Reflective Vest Set (5)', categoryName: 'Safety Equipment', serial: 'RV-2024-004', amount: '1200', purchaseDate: '2024-03-01', notes: 'Hi-vis orange vests, AIS-140 compliant' },
  { code: 'ASSET-005', name: 'Dashcam 4K Front+Rear', categoryName: 'Electronics', serial: 'DC-2024-005', amount: '12000', purchaseDate: '2024-04-15', notes: 'Night vision, GPS overlay, 128GB storage' },
  { code: 'ASSET-006', name: 'OBD2 Diagnostic Scanner', categoryName: 'Electronics', serial: 'OB-2023-006', amount: '6500', purchaseDate: '2023-09-10', notes: 'Bluetooth scanner for fleet diagnostics' },
  { code: 'ASSET-007', name: 'LED Warning Light Bar', categoryName: 'Safety Equipment', serial: 'LW-2024-007', amount: '4200', purchaseDate: '2024-05-20', notes: 'Magnetic mount amber strobe for breakdowns' },
  { code: 'ASSET-008', name: 'Tool Box Complete Set', categoryName: 'Tools & Equipment', serial: 'TB-2023-008', amount: '15000', purchaseDate: '2023-08-15', notes: '86-piece mechanic set with carrying case' },
  { code: 'ASSET-009', name: 'Mobile Tablet Mount', categoryName: 'Electronics', serial: 'MT-2024-009', amount: '3200', purchaseDate: '2024-06-01', notes: 'Dashboard mount for driver tablets, vibration dampened' },
  { code: 'ASSET-010', name: 'Tire Pressure Gauge Digital', categoryName: 'Tools & Equipment', serial: 'TP-2024-010', amount: '1800', purchaseDate: '2024-07-10', notes: 'Digital gauge, 0-150 PSI range, backlight display' },
];

async function getCategoryOptions(page: Page): Promise<Map<string, string>> {
  await page.goto('/assets/new');
  await page.waitForSelector('#asset-form');
  await wait(page, 1000);
  const map = new Map<string, string>();
  const options = page.locator('#asset-form select').first().locator('option');
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const opt = options.nth(i);
    const text = await opt.textContent();
    const val = await opt.getAttribute('value');
    if (text && val) map.set(text.trim(), val);
  }
  return map;
}

async function createAsset(page: Page, a: Asset, catMap: Map<string, string>) {
  await page.goto('/assets/new');
  await page.waitForSelector('#asset-form');
  await wait(page, 500);

  await page.getByLabel('Asset Code', { exact: false }).fill(a.code);
  await page.getByLabel('Name', { exact: false }).fill(a.name);

  const catId = catMap.get(a.categoryName);
  if (catId) {
    await page.locator('#asset-form select').first().selectOption(catId);
  }

  await page.getByLabel('Serial Number', { exact: false }).fill(a.serial);
  await page.getByLabel('Purchase Amount', { exact: false }).fill(a.amount);
  await page.getByLabel('Purchase Date', { exact: false }).fill(a.purchaseDate);
  await page.getByLabel('Notes', { exact: false }).fill(a.notes);

  await page.click('button[type="submit"]:has-text("Create Asset")');
  await page.waitForURL(/\/assets\/[a-z0-9]+$/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Seed: Assets', () => {
  test('Create 10 assets across categories', async ({ page }) => {
    test.setTimeout(300_000);

    const loggedIn = await loginAsRole(page, 'admin');
    expect(loggedIn).toBe(true);
    await page.waitForLoadState('networkidle');

    const catMap = await getCategoryOptions(page);
    console.log(`Found ${catMap.size} categories: ${[...catMap.keys()].join(', ')}`);

    for (let i = 0; i < assets.length; i++) {
      const a = assets[i];
      console.log(`[${i + 1}/10] ${a.code} - ${a.name}`);
      await createAsset(page, a, catMap);
      console.log('  [OK] Created');
    }

    console.log('\n=== ALL 10 ASSETS SEEDED ===');
  });
});
