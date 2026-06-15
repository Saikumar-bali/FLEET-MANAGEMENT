import { expect, test } from '@playwright/test';
import { createE2EVehicle, loginAsAdmin } from './helpers/api';
import { loginAsRole } from './helpers/credentials';

test.describe('Phase 5 fuel and expense workflow', () => {
  test('admin creates and views TEST-E2E fuel and expense records', async ({ page }) => {
    const token = await loginAsAdmin();
    const vehicle = await createE2EVehicle(token);
    await loginAsRole(page, 'admin');

    await page.goto('/fuel/new');
    await page.getByLabel('Vehicle *').selectOption(vehicle.id);
    await page.getByLabel('Quantity Liters *').fill('12.5');
    await page.getByLabel('Price Per Liter *').fill('100');
    await page.getByLabel('Station').fill('TEST-E2E Fuel Station');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Status: DRAFT')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();

    await page.goto('/expenses/new');
    await page.getByLabel('Vehicle *').selectOption(vehicle.id);
    await page.getByLabel('Category *').fill('TEST-E2E TOLL');
    await page.getByLabel('Amount *').fill('250');
    await page.getByLabel('Vendor').fill('TEST-E2E Vendor');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Status: DRAFT')).toBeVisible();

    await page.goto('/fuel');
    await expect(page.getByRole('button', { name: 'Create Fuel Entry' })).toBeVisible();
    await page.goto('/expenses');
    await expect(page.getByRole('button', { name: 'Create Expense' })).toBeVisible();
  });

  test('viewer sees records but not create actions', async ({ page }) => {
    await loginAsRole(page, 'viewer');
    await page.goto('/fuel');
    await expect(page.getByRole('button', { name: 'Create Fuel Entry' })).toHaveCount(0);
    await page.goto('/expenses');
    await expect(page.getByRole('button', { name: 'Create Expense' })).toHaveCount(0);
  });
});
