import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

async function getVehicleMap(page: Page): Promise<Map<string, string>> {
  await page.goto('/trips/new');
  await page.waitForSelector('#trip-form');
  await wait(page, 2000);
  const map = new Map<string, string>();
  const vehicleSelect = page.locator('#trip-form select').nth(1);
  const options = vehicleSelect.locator('option');
  const optCount = await options.count();
  for (let i = 0; i < optCount; i++) {
    const opt = options.nth(i);
    const val = await opt.getAttribute('value');
    const text = await opt.textContent();
    if (val && text && text !== 'Select vehicle') map.set(text.trim(), val);
  }
  return map;
}

async function getDriverMap(page: Page): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const selects = page.locator('#trip-form select');
  const count = await selects.count();
  if (count < 3) return map;
  const driverSelect = selects.nth(2);
  const options = driverSelect.locator('option');
  const optCount = await options.count();
  for (let i = 0; i < optCount; i++) {
    const opt = options.nth(i);
    const val = await opt.getAttribute('value');
    const text = await opt.textContent();
    if (val && text && !text.includes('No driver')) map.set(text.trim(), val);
  }
  return map;
}

type Trip = {
  tripType: string; vehiclePattern: string; purpose: string; notes: string;
  origin: string; destination: string; originAddr: string; destAddr: string;
  start: string; end: string;
  driverPattern: string; assistantPattern: string;
};

const trips: Trip[] = [
  { tripType: 'DELIVERY', vehiclePattern: 'MH12DE', purpose: 'Industrial equipment delivery to JNPT port', notes: 'Fragile cargo, handle with care', origin: 'Pune', destination: 'Mumbai (JNPT Port)', originAddr: 'Pune MIDC, Bhosari', destAddr: 'JNPT Port, Nhava Sheva, Navi Mumbai', start: '2025-06-20T06:00', end: '2025-06-20T11:00', driverPattern: 'Rajesh', assistantPattern: '' },
  { tripType: 'TRANSFER', vehiclePattern: 'KA01AB', purpose: 'Vehicle transfer to Bangalore depot', notes: 'Driver exchange at Mysore rest stop', origin: 'Bangalore', destination: 'Mysore', originAddr: 'Bangalore BMTC Depot, Hebbal', destAddr: 'Mysore City Bus Stand', start: '2025-06-21T08:00', end: '2025-06-21T11:30', driverPattern: 'Mohammed', assistantPattern: '' },
  { tripType: 'PICKUP', vehiclePattern: 'DL03CE', purpose: 'Raw material pickup from Jaipur supplier', notes: 'Pickup authorization letter attached', origin: 'Delhi', destination: 'Jaipur', originAddr: 'Okhla Industrial Area, Delhi', destAddr: 'Sitapura Industrial Area, Jaipur', start: '2025-06-22T05:30', end: '2025-06-22T12:00', driverPattern: 'Suresh', assistantPattern: 'Arun' },
  { tripType: 'SERVICE', vehiclePattern: 'TN07FG', purpose: 'Service call to Coimbatore client', notes: 'Spare parts loaded, client contact: Ramesh 98765xxxxx', origin: 'Chennai', destination: 'Coimbatore', originAddr: 'Chennai Port Area', destAddr: 'Peelamedu, Coimbatore', start: '2025-06-23T04:00', end: '2025-06-23T12:00', driverPattern: 'Arun', assistantPattern: '' },
  { tripType: 'DELIVERY', vehiclePattern: 'GJ05HI', purpose: 'Chemical tanker delivery to Rajkot refinery', notes: 'Hazmat documentation ready, speed limit 60km/h', origin: 'Ahmedabad', destination: 'Rajkot', originAddr: 'Naroda GIDC, Ahmedabad', destAddr: 'Reliance Refinery, Jamnagar Road, Rajkot', start: '2025-06-19T07:00', end: '2025-06-19T14:00', driverPattern: 'Vikramjeet', assistantPattern: '' },
  { tripType: 'INTERNAL', vehiclePattern: 'MH14JK', purpose: 'Nashik to Pune office transfer', notes: 'Zero emission route preferred, charging at Pune destination', origin: 'Nashik', destination: 'Pune', originAddr: 'Nashik MIDC, Ambad', destAddr: 'Pune IT Park, Hinjewadi', start: '2025-06-20T09:00', end: '2025-06-20T14:00', driverPattern: 'Rajesh', assistantPattern: '' },
  { tripType: 'TRANSFER', vehiclePattern: 'UP32LM', purpose: 'Lucknow to Kanpur parts transfer', notes: 'Small parcel, quick turnaround expected', origin: 'Lucknow', destination: 'Kanpur', originAddr: 'Aminabad Market Area, Lucknow', destAddr: 'Kanpur Central, Gumti No. 5', start: '2025-06-21T10:00', end: '2025-06-21T14:00', driverPattern: 'Anil', assistantPattern: '' },
  { tripType: 'DELIVERY', vehiclePattern: 'MH12DE', purpose: 'Electronics delivery to Nagpur warehouse', notes: 'High-value cargo, GPS tracking mandatory', origin: 'Mumbai', destination: 'Nagpur', originAddr: 'Mumbai APMC Market, Vashi', destAddr: 'MIHAN SEZ, Nagpur', start: '2025-06-25T04:00', end: '2025-06-25T20:00', driverPattern: 'Rajesh', assistantPattern: 'Suresh' },
];

function findId(map: Map<string, string>, pattern: string): string | undefined {
  for (const [key, val] of map) {
    if (key.toUpperCase().includes(pattern.toUpperCase())) return val;
  }
  return undefined;
}

async function createTrip(page: Page, t: Trip, vehicleId: string, driverId?: string, assistantId?: string) {
  await page.goto('/trips/new');
  await page.waitForSelector('#trip-form');
  await wait(page, 1500);

  await page.getByLabel('Trip Type', { exact: false }).selectOption(t.tripType);
  await page.locator('#trip-form select').nth(1).selectOption(vehicleId);
  await page.getByLabel('Purpose', { exact: false }).fill(t.purpose);
  await page.getByLabel('Notes', { exact: false }).fill(t.notes);

  await page.getByLabel('Origin Name', { exact: false }).fill(t.origin);
  await page.getByLabel('Destination Name', { exact: false }).fill(t.destination);
  await page.getByLabel('Origin Address', { exact: false }).fill(t.originAddr);
  await page.getByLabel('Destination Address', { exact: false }).fill(t.destAddr);
  await page.getByLabel('Planned Start', { exact: false }).fill(t.start);
  await page.getByLabel('Planned End', { exact: false }).fill(t.end);

  const selects = page.locator('#trip-form select');
  const selectCount = await selects.count();

  if (driverId && selectCount >= 3) {
    await selects.nth(2).selectOption(driverId);
  }
  if (assistantId && selectCount >= 4) {
    await selects.nth(3).selectOption(assistantId);
  }

  await page.click('button[type="submit"]:has-text("Create Trip")');
  await page.waitForURL(/\/trips\/[a-z0-9]+$/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Seed: Trips', () => {
  test('Create 8 trips with routes and drivers', async ({ page }) => {
    test.setTimeout(600_000);

    const loggedIn = await loginAsRole(page, 'admin');
    expect(loggedIn).toBe(true);
    await page.waitForLoadState('networkidle');

    const vehicleMap = await getVehicleMap(page);
    const driverMap = await getDriverMap(page);
    console.log(`Found ${vehicleMap.size} vehicles, ${driverMap.size} drivers`);

    for (let i = 0; i < trips.length; i++) {
      const t = trips[i];
      const vehicleId = findId(vehicleMap, t.vehiclePattern);
      if (!vehicleId) { console.log(`  [SKIP] Vehicle ${t.vehiclePattern} not found`); continue; }
      const driverId = t.driverPattern ? findId(driverMap, t.driverPattern) : undefined;
      const assistantId = t.assistantPattern ? findId(driverMap, t.assistantPattern) : undefined;

      console.log(`[${i + 1}/8] ${t.tripType} | ${t.vehiclePattern} | ${t.origin} → ${t.destination}`);
      await createTrip(page, t, vehicleId, driverId, assistantId);
      console.log('  [OK] Created');
    }

    console.log('\n=== ALL 8 TRIPS SEEDED ===');
  });
});
