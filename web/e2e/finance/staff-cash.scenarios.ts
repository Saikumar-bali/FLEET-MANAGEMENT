import { expect, test } from '@playwright/test';
import { loginAsRole } from '../helpers/credentials';

test.describe('Ledger-backed Finance workspace', () => {
  test('groups the finance journey and explains custody balances', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/staff-cash');

    await expect(page.locator('[data-testid="finance-grouped-navigation"]')).toBeVisible();
    await expect(page.locator('.finance-nav-label')).toHaveText(['Overview', 'Cash & claims', 'Billing & collections', 'Ledger & setup']);
    await expect(page.locator('[data-testid="finance-tab-staff-cash"]')).toHaveClass(/finance-tab-active/);
    await expect(page.locator('[data-testid="staff-cash-page"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cash & staff advances' })).toBeVisible();
    await expect(page.getByText('Company money in staff custody', { exact: true })).toBeVisible();
    await expect(page.locator('.custody-metrics article')).toHaveCount(4);
    await expect(page.getByText('Eligible for reuse on a future allowance')).toBeVisible();
  });

  test('makes reuse versus preserve explicit in the allowance form', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/staff-cash');
    await page.locator('[data-testid="new-staff-advance"]').click();

    const form = page.locator('[data-testid="staff-advance-form"]');
    await expect(form).toBeVisible();
    await expect(page.getByText('Money moves only after approval and funding.')).toBeVisible();
    const reuse = form.getByLabel('Use existing wallet balance');
    await expect(reuse.locator('option')).toHaveText([
      'Yes — issue only the shortfall',
      'No — preserve existing balance',
    ]);
    await reuse.selectOption('PRESERVE_EXISTING_BALANCE');
    await expect(reuse).toHaveValue('PRESERVE_EXISTING_BALANCE');
  });

  test('shows advances, source-aware settlements, and numbered receipts', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/staff-cash');

    await page.locator('[data-testid="staff-cash-advances"]').click();
    await expect(page.locator('table')).toContainText('Funding split');
    await expect(page.locator('table')).toContainText('existing');

    await page.locator('[data-testid="staff-cash-settlements"]').click();
    await expect(page.locator('table')).toContainText('Disposition');
    await expect(page.locator('table')).toContainText('Reimbursement');
    await expect(page.locator('table')).toContainText(/RCT-|Reconciled/);
  });

  test('payment entry separates incoming receipts from outgoing payments', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/finance/payments');

    await expect(page.locator('[data-testid="finance-tab-payments"]')).toHaveClass(/finance-tab-active/);
    const direction = page.locator('[data-testid="finance-payment-form"]').getByLabel(/Direction/);
    await expect(direction).toBeVisible();
    await expect(direction.locator('option')).toHaveText(['Incoming — customer receipt', 'Outgoing — vendor/company payment']);
  });
});
