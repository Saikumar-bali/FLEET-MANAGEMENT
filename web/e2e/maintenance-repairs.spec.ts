import { expect, test } from '@playwright/test';
import { createE2EVehicle, loginAsAdmin } from './helpers/api';
import { loginAsRole } from './helpers/credentials';

test.describe('Phase 6 maintenance and repair workflow', () => {
  test('admin creates and views TEST-E2E maintenance and repair records', async ({ page }) => {
    const token = await loginAsAdmin();
    const vehicle = await createE2EVehicle(token);
    await loginAsRole(page, 'admin');

    await page.goto('/maintenance/new');
    await page.getByLabel('Vehicle *').selectOption(vehicle.id);
    await page.getByLabel('Category *').fill('TEST-E2E ENGINE');
    await page.getByLabel('Description *').fill('Engine oil change needed');
    await page.getByLabel('Priority *').selectOption('HIGH');
    await page.getByLabel('Estimated Cost').fill('5000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Status: DRAFT')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();

    await page.goto('/repairs/new');
    await page.getByLabel('Vehicle *').selectOption(vehicle.id);
    await page.getByLabel('Category *').fill('TEST-E2E TRANSMISSION');
    await page.getByLabel('Description *').fill('Transmission rebuild needed');
    await page.getByLabel('Provider').fill('TEST-E2E Workshop');
    await page.getByLabel('Estimated Cost').fill('25000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('OPEN')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Repair' })).toBeVisible();

    await page.goto('/maintenance');
    await expect(page.getByRole('button', { name: 'Create Maintenance Request' })).toBeVisible();
    await page.goto('/repairs');
    await expect(page.getByRole('button', { name: 'Create Repair' })).toBeVisible();
  });

  test('viewer sees records but not create actions', async ({ page }) => {
    await loginAsRole(page, 'viewer');
    await page.goto('/maintenance');
    await expect(page.getByRole('button', { name: 'Create Maintenance Request' })).toHaveCount(0);
    await page.goto('/repairs');
    await expect(page.getByRole('button', { name: 'Create Repair' })).toHaveCount(0);
  });
});
