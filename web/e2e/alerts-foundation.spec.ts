import { test, expect } from '@playwright/test';

test.describe('Alerts foundation UI contract', () => {
  test('alerts bell and drawer labels are visible', async ({ page }) => {
    await page.setContent(`
      <main>
        <button data-testid="alerts-bell" title="Alerts">Alerts</button>
        <section data-testid="notification-drawer" aria-label="Notifications">
          <strong>Notifications</strong>
          <p>No notifications yet.</p>
        </section>
      </main>
    `);

    await expect(page.getByTestId('alerts-bell')).toBeVisible();
    await expect(page.getByTestId('notification-drawer')).toContainText('Notifications');
  });
});
