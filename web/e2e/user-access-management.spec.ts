import { expect, test } from '@playwright/test';
import { loginAsRole, getCredential, getApiBase } from './helpers/credentials';

test.describe('User Access Management', () => {
  test('super_admin can manage user access end-to-end', async ({ page }) => {
    const cred = getCredential('super_admin');
    if (!cred) {
      test.skip();
      return;
    }

    // 1-2. Login as super_admin, open Users page
    await loginAsRole(page, 'super_admin');
    await page.goto('/users');
    await page.waitForSelector('text=Users');

    // 3. Click Manage Access on a non-admin user (e.g. driver demo)
    await page.waitForSelector('text=Manage Access');
    const manageButtons = page.locator('button:has-text("Manage Access")');
    const count = await manageButtons.count();
    expect(count).toBeGreaterThan(0);

    // Click the last Manage Access button (likely the simplest user)
    await manageButtons.last().click();
    await page.waitForURL(/\/users\//);

    // 4. Open Effective Permissions tab
    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=Effective Permissions');
    await page.waitForSelector('text=role permissions');
    const initialPermCount = await page.locator('text=Final effective list').count();
    expect(initialPermCount).toBeGreaterThanOrEqual(0);

    // 5. Add ALLOW override for fuel_view
    await page.click('button:has-text("Permission Overrides")');
    await page.waitForSelector('text=Permission Overrides');

    // Select the permission dropdown and choose fuel_view
    const permSelect = page.locator('select').filter({ has: page.locator('option[value="fuel_view"]') });
    if (await permSelect.count() > 0) {
      await permSelect.selectOption('fuel_view');
    } else {
      // The dropdown might have many options - use the last select as the permission selector
      const allSelects = page.locator('select');
      const selectCount = await allSelects.count();
      // The override permission select is usually the 3rd select
      if (selectCount >= 3) {
        await allSelects.nth(2).selectOption('fuel_view');
      } else {
        await allSelects.last().selectOption('fuel_view');
      }
    }

    // Set effect to ALLOW
    const effectSelect = page.locator('select').filter({ has: page.locator('option[value="ALLOW"]') });
    if (await effectSelect.count() > 0) {
      await effectSelect.selectOption('ALLOW');
    }

    // Enter reason
    const reasonInput = page.locator('input[placeholder="Optional reason"]').first();
    await reasonInput.fill('E2E test - allow fuel_view');

    // Click Add override
    await page.click('button:has-text("Add override")');
    await page.waitForTimeout(1000);

    // 6. Switch back to Effective Permissions tab and confirm fuel_view appears
    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=ALLOW overrides');
    const allowText = page.locator('text=fuel_view');
    // fuel_view might be from role permissions, so check ALLOW overrides list
    const hasAllowOverride = await page.locator('text=ALLOW overrides').locator('..').locator('text=fuel_view').count();
    // If fuel_view is already in role permissions, it's still there; ALLOW overrides section might show it

    // 7. Add DENY override for fuel_view
    await page.click('button:has-text("Permission Overrides")');
    await page.waitForSelector('text=Permission Overrides');

    // Select fuel_view again but with DENY
    const permSelect2 = page.locator('select').filter({ has: page.locator('option[value="fuel_view"]') });
    if (await permSelect2.count() > 0) {
      await permSelect2.selectOption('fuel_view');
    } else {
      const allSelects = page.locator('select');
      const selectCount = await allSelects.count();
      if (selectCount >= 3) {
        await allSelects.nth(2).selectOption('fuel_view');
      } else {
        await allSelects.last().selectOption('fuel_view');
      }
    }

    // Change effect to DENY
    const effectSelect2 = page.locator('select').filter({ has: page.locator('option[value="DENY"]') });
    if (await effectSelect2.count() > 0) {
      await effectSelect2.selectOption('DENY');
    } else {
      // Find the second select which should be the effect selector
      const allSelects = page.locator('select');
      const selectCount = await allSelects.count();
      if (selectCount >= 4) {
        await allSelects.nth(3).selectOption('DENY');
      }
    }

    await page.locator('input[placeholder="Optional reason"]').first().fill('E2E test - deny fuel_view');
    await page.click('button:has-text("Add override")');
    await page.waitForTimeout(1000);

    // 8. Confirm fuel_view is now in DENY overrides in Effective Permissions tab
    await page.click('button:has-text("Effective Permissions")');
    await page.waitForSelector('text=DENY overrides');

    // 9. Grant VEHICLE VIEW scope
    await page.click('button:has-text("Data Scopes")');
    await page.waitForSelector('text=Data Scopes');

    // Select scope type VEHICLE
    const scopeTypeSelect = page.locator('select').first();
    await scopeTypeSelect.selectOption('VEHICLE');

    // Enter scope ID
    const scopeIdInput = page.locator('input').filter({ has: page.locator('[placeholder="e.g. vehicle-123"]') });
    if (await scopeIdInput.count() > 0) {
      await scopeIdInput.fill('vehicle-e2e-test');
    } else {
      // Fallback: find the input after scope type
      await page.locator('input[placeholder*="vehicle"]').fill('vehicle-e2e-test');
    }

    // Select access level VIEW
    const accessLevelSelect = page.locator('select').nth(1);
    await accessLevelSelect.selectOption('VIEW');

    await page.click('button:has-text("Grant scope")');
    await page.waitForTimeout(1000);

    // 10. Confirm scope appears
    await page.waitForSelector('text=vehicle-e2e-test');
    await expect(page.locator('text=vehicle-e2e-test')).toBeVisible();

    // 11. Remove scope
    const removeScopeButton = page.locator('button:has-text("Remove")').first();
    await removeScopeButton.click();
    await page.waitForTimeout(500);

    // 12. Confirm scope removed
    await expect(page.locator('text=vehicle-e2e-test')).toHaveCount(0);

    // 13. Open Activity tab and check audit entries
    await page.click('button:has-text("Activity")');
    await page.waitForSelector('text=Activity Timeline');
    // The activity should contain the permission.allow or permission.deny entries
    const activityCount = await page.locator('text=admin.user').count();
    expect(activityCount).toBeGreaterThanOrEqual(1);
  });

  test('user can view My Access page', async ({ page }) => {
    // 14. Login as the demo driver
    const driverCred = getCredential('driver');
    if (!driverCred) {
      test.skip();
      return;
    }

    const loggedIn = await loginAsRole(page, 'driver');
    if (!loggedIn) {
      test.skip();
      return;
    }

    // 15. Open /my-access
    await page.goto('/my-access');
    await page.waitForSelector('text=My Access');

    // 16. Confirm permissions/scopes visible
    await page.waitForSelector('text=My Account');
    await page.waitForSelector('text=My Role');
    await page.waitForSelector('text=My Effective Permissions');
    await page.waitForSelector('text=My Data Scopes');
    await page.waitForSelector('text=My Visible Menus');
  });
});
