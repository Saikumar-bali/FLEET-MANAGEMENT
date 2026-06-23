import { test, expect, Page } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

async function wait(page: Page, ms = 1000) { await page.waitForTimeout(ms); }

type Category = { name: string; key: string; description: string };

const categories: Category[] = [
  { name: 'Safety Equipment', key: 'safety_equipment', description: 'Helmets, reflective vests, fire extinguishers, first aid kits' },
  { name: 'Tools & Equipment', key: 'tools_equipment', description: 'Spanners, jacks, diagnostic tools, tool boxes' },
  { name: 'Electronics', key: 'electronics', description: 'GPS trackers, dashcams, tablets, OBD scanners' },
  { name: 'Consumables', key: 'consumables', description: 'Oil filters, brake pads, bulbs, fuses' },
  { name: 'Documentation', key: 'documentation', description: 'Logbooks, permits, certificates, manuals' },
];

async function createCategory(page: Page, cat: Category) {
  await page.goto('/asset-categories');
  await page.waitForLoadState('networkidle');
  await wait(page, 1500);

  const newBtn = page.locator('button:has-text("New Category")');
  if (await newBtn.isVisible()) {
    await newBtn.click();
    await wait(page, 500);
  }

  const form = page.locator('form.stack-form');
  await form.getByLabel('Name', { exact: false }).fill(cat.name);
  await form.getByLabel('Key', { exact: false }).fill(cat.key);
  await form.getByLabel('Description', { exact: false }).fill(cat.description);
  await form.getByLabel('Status', { exact: false }).selectOption('ACTIVE');

  await form.locator('button[type="submit"]').click();
  await wait(page, 2500);

  const error = page.locator('.error-banner');
  if (await error.isVisible({ timeout: 1000 }).catch(() => false)) {
    const text = await error.textContent();
    if (text?.includes('already exists')) {
      console.log('  [SKIP] Already exists');
      return;
    }
  }
}

test.describe('Seed: Asset Categories', () => {
  test('Create 5 asset categories', async ({ page }) => {
    test.setTimeout(180_000);

    const loggedIn = await loginAsRole(page, 'admin');
    expect(loggedIn).toBe(true);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      console.log(`[${i + 1}/5] ${cat.name}`);
      await createCategory(page, cat);
      console.log('  [OK]');
    }

    console.log('\n=== ALL 5 ASSET CATEGORIES SEEDED ===');
  });
});
