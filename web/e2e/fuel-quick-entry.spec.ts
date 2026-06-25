import { expect, test } from '@playwright/test';
import { createE2EVehicle, loginAsAdmin } from './helpers/api';
import { loginAsRole } from './helpers/credentials';

test.describe('Fuel quick entry form', () => {
  test('admin creates a fuel entry via quick amount mode', async ({ page }) => {
    const token = await loginAsAdmin();
    const vehicle = await createE2EVehicle(token);
    await loginAsRole(page, 'admin');

    await page.goto('/fuel');
    await expect(page.getByRole('button', { name: 'Create Fuel Entry' })).toBeVisible();
    await page.getByRole('button', { name: 'Create Fuel Entry' }).click();

    await expect(page.locator('.fuel-quick-form')).toBeVisible({ timeout: 10000 });

    const quickModeBtn = page.locator('.fuel-mode-btn', { hasText: 'Quick Amount' });
    await expect(quickModeBtn).toHaveClass(/fuel-mode-btn-active/);

    await expect(page.locator('.fuel-amount-chip', { hasText: '₹5K' })).toBeVisible();
    await expect(page.locator('.fuel-amount-chip', { hasText: '₹10K' })).toBeVisible();
    await expect(page.locator('.fuel-amount-chip', { hasText: '₹12K' })).toBeVisible();
    await expect(page.locator('.fuel-amount-chip', { hasText: '₹15K' })).toBeVisible();
    await expect(page.locator('.fuel-amount-chip', { hasText: '₹20K' })).toBeVisible();

    await page.locator('select').first().selectOption(vehicle.id);

    await page.locator('input[type="number"][placeholder*="45230"]').fill('45230');

    await page.locator('.fuel-amount-chip', { hasText: '₹12K' }).click();

    const amountInput = page.locator('.fuel-amount-input');
    await expect(amountInput).toHaveValue('12000');

    await page.screenshot({ path: 'docs/ui-review/screenshots/fuel-quick-entry-filled.png', fullPage: true });

    await page.getByRole('button', { name: 'Save Fuel Entry' }).click();

    await expect(page.getByText('Fuel entry created successfully')).toBeVisible({ timeout: 10000 });

    await page.goto('/fuel');
    await expect(page.locator('text=/\\d{4}-\\d{2}-\\d{2}/').first()).toBeVisible({ timeout: 10000 });
  });
});
