import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

type Driver = {
  name: string; mobile: string; altMobile: string; address: string; emergency: string;
  licenseNumber: string; licenseExpiry: string; experience: string;
};

const drivers: Driver[] = [
  { name: 'Rajesh Kumar Singh', mobile: '9876543210', altMobile: '9812345678', address: '12 Shivaji Nagar, Pune, Maharashtra 411005', emergency: '9823456789', licenseNumber: 'MH-DL-2019-445512', licenseExpiry: '2029-08-15', experience: '8' },
  { name: 'Mohammed Irfan Patel', mobile: '9988776655', altMobile: '9900112233', address: '45 Koramangala, Bangalore, Karnataka 560034', emergency: '9911223344', licenseNumber: 'KA-TR-2020-778812', licenseExpiry: '2030-03-22', experience: '6' },
  { name: 'Suresh Babu Nair', mobile: '9123456789', altMobile: '9234567890', address: '78 Connaught Place, New Delhi 110001', emergency: '9112233445', licenseNumber: 'DL-TC-2018-334499', licenseExpiry: '2028-12-10', experience: '10' },
  { name: 'Arun Prasad Verma', mobile: '9345678901', altMobile: '9456789012', address: '23 T. Nagar, Chennai, Tamil Nadu 600017', emergency: '9334455667', licenseNumber: 'TN-MV-2021-556677', licenseExpiry: '2031-06-30', experience: '5' },
  { name: 'Vikramjeet Singh Rathore', mobile: '9567890123', altMobile: '9678901234', address: '56 Navrangpura, Ahmedabad, Gujarat 380009', emergency: '9556677889', licenseNumber: 'GJ-DR-2019-889900', licenseExpiry: '2029-11-25', experience: '7' },
  { name: 'Anil Kumar Yadav', mobile: '9789012345', altMobile: '9890123456', address: '89 Gomti Nagar, Lucknow, UP 226010', emergency: '9778899001', licenseNumber: 'UP-TC-2022-112233', licenseExpiry: '2032-04-18', experience: '4' },
];

async function createDriver(page: Page, d: Driver) {
  await page.goto('/drivers/new');
  await page.waitForSelector('#driver-form');

  await page.getByLabel('Name', { exact: false }).fill(d.name);
  await page.getByLabel('Mobile *').fill(d.mobile);
  await page.getByLabel('Alternate Mobile', { exact: false }).fill(d.altMobile);
  await page.getByLabel('Address', { exact: false }).fill(d.address);
  await page.getByLabel('Emergency Contact', { exact: false }).fill(d.emergency);
  await page.getByLabel('License Number', { exact: false }).fill(d.licenseNumber);
  await page.getByLabel('License Expiry', { exact: false }).fill(d.licenseExpiry);
  await page.getByLabel('Experience', { exact: false }).fill(d.experience);

  await page.click('button[type="submit"]:has-text("Create Driver")');
  await page.waitForURL(/\/drivers\/[a-z0-9]+$/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Seed: Drivers', () => {
  test('Create 6 Indian drivers', async ({ page }) => {
    test.setTimeout(180_000);

    const loggedIn = await loginAsRole(page, 'admin');
    expect(loggedIn).toBe(true);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[i];
      console.log(`[${i + 1}/6] ${d.name} (${d.mobile})`);
      await createDriver(page, d);
      console.log('  [OK] Created');
    }

    console.log('\n=== ALL 6 DRIVERS SEEDED ===');
  });
});
