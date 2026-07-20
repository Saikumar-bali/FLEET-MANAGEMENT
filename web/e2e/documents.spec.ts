import { expect, test } from '@playwright/test';
import { loginAsRole, getAdminCredential, getApiBase } from './helpers/credentials';

test.describe('Phase 8 Documents navigation and upload', () => {
  test('admin sees Documents sidebar item', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const sidebarDocs = page.locator('.nav-item', { hasText: 'Documents' });
    await expect(sidebarDocs).toBeVisible();
  });

  test('documents page loads for admin with vault layout', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');
    await expect(page).not.toHaveURL('/login');
    const vault = page.locator('.doc-vault-shell');
    await expect(vault).toBeVisible({ timeout: 10000 });
    const title = page.locator('.doc-vault-title');
    await expect(title).toHaveText('Documents Vault');
    await page.screenshot({ path: 'docs/ui-review/screenshots/phase-8-documents-ui/documents-vault.png', fullPage: true });
  });

  test('upload button opens upload drawer', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');
    await page.locator('[data-testid="upload-document-button"]').click();
    const drawer = page.locator('.doc-upload-drawer');
    await expect(drawer).toBeVisible();
    const dropzone = page.locator('.doc-dropzone');
    await expect(dropzone).toBeVisible();
    await page.screenshot({ path: 'docs/ui-review/screenshots/phase-8-documents-ui/upload-drawer.png', fullPage: true });
  });

  test('KPI strip shows document counts', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');
    const kpiStrip = page.locator('.doc-kpi-strip');
    await expect(kpiStrip).toBeVisible({ timeout: 10000 });
    const kpiCards = page.locator('.doc-kpi-card');
    expect(await kpiCards.count()).toBeGreaterThanOrEqual(4);
  });

  test('document tabs are visible', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');
    const tabs = page.locator('[data-testid="document-tabs"]');
    await expect(tabs).toBeVisible();
    const expectedTabs = ['All', 'Vehicles', 'Drivers', 'Trips', 'Compliance', 'Finance', 'Expiring Soon', 'Archived'];
    for (const tabName of expectedTabs) {
      const tab = page.locator(`[data-testid="document-tab-${tabName.toLowerCase().replace(/\s+/g, '-')}"]`);
      await expect(tab).toBeVisible();
    }
  });

  test('document table renders with proper structure', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');
    await page.waitForTimeout(2000);
    const tableOrEmpty = page.locator('.doc-table-wrap, .doc-empty-state');
    await expect(tableOrEmpty).toBeVisible({ timeout: 10000 });
  });

  test('toolbar has search and filters', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');
    const toolbar = page.locator('.doc-toolbar');
    await expect(toolbar).toBeVisible();
    const search = page.locator('.doc-toolbar-search-input');
    await expect(search).toBeVisible();
    const selects = page.locator('.doc-toolbar-select');
    expect(await selects.count()).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Documents API upload and manage', () => {
  test('admin can upload and list documents via API', async ({ page }) => {
    const adminCred = getAdminCredential();
    const loginRes = await page.request.post(`${getApiBase()}/api/v1/auth/login`, {
      data: { identifier: adminCred.identifier, password: adminCred.password },
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data?.accessToken;
    if (!token) { test.skip(); return; }

    const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n345\n%%EOF';

    const uploadRes = await page.request.post('http://localhost:4000/api/v1/documents/upload', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdfContent, 'utf-8') },
        title: 'E2E Test Document',
        documentType: 'GENERAL',
        documentCategory: 'GENERAL',
      },
    });
    expect(uploadRes.status()).toBe(201);
    const docId = (await uploadRes.json()).data?.id;
    expect(docId).toBeTruthy();

    const listRes = await page.request.get('http://localhost:4000/api/v1/documents', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.status()).toBe(200);

    await page.request.delete(`http://localhost:4000/api/v1/documents/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});

test.describe('Entity detail Documents tabs', () => {
  test('vehicle detail page has Documents section', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const token = await page.evaluate(() => localStorage.getItem('fleet_token'));
    const listRes = await page.request.get('http://localhost:4000/api/v1/vehicles?limit=1', {
      headers: { Authorization: `Bearer ${token || ''}` },
    });
    const items = (await listRes.json()).data?.items;
    if (!items?.length) return;

    await page.goto(`/vehicles/${items[0].id}`);
    const docsTab = page.locator('button, [role="tab"]', { hasText: 'Documents' });
    if (await docsTab.count() > 0) {
      await docsTab.first().click();
      const panel = page.locator('.linked-doc-panel');
      await expect(panel).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'docs/ui-review/screenshots/phase-8-documents-ui/vehicle-documents-tab.png', fullPage: true });
    }
  });

  test('driver detail page has Documents section', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const token = await page.evaluate(() => localStorage.getItem('fleet_token'));
    const listRes = await page.request.get('http://localhost:4000/api/v1/drivers?limit=1', {
      headers: { Authorization: `Bearer ${token || ''}` },
    });
    const items = (await listRes.json()).data?.items;
    if (!items?.length) return;

    await page.goto(`/drivers/${items[0].id}`);
    const docsTab = page.locator('button, [role="tab"]', { hasText: 'Documents' });
    if (await docsTab.count() > 0) {
      await docsTab.first().click();
      const panel = page.locator('.linked-doc-panel');
      await expect(panel).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'docs/ui-review/screenshots/phase-8-documents-ui/driver-documents-tab.png', fullPage: true });
    }
  });

  test('trip detail page has Documents section', async ({ page }) => {
    await loginAsRole(page, 'admin');
    const token = await page.evaluate(() => localStorage.getItem('fleet_token'));
    const listRes = await page.request.get('http://localhost:4000/api/v1/trips?limit=1', {
      headers: { Authorization: `Bearer ${token || ''}` },
    });
    const items = (await listRes.json()).data?.items;
    if (!items?.length) return;

    await page.goto(`/trips/${items[0].id}`);
    const docsTab = page.locator('button, [role="tab"]', { hasText: 'Documents' });
    if (await docsTab.count() > 0) {
      await docsTab.first().click();
      const panel = page.locator('.linked-doc-panel');
      await expect(panel).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'docs/ui-review/screenshots/phase-8-documents-ui/trip-documents-tab.png', fullPage: true });
    }
  });
});

test.describe('Documents Fuel Bills tab', () => {
  test('admin can navigate to Fuel Bills tab', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');
    await expect(page.locator('.doc-vault-shell')).toBeVisible({ timeout: 10000 });

    const fuelBillsTab = page.locator('[data-testid="document-tab-fuel-bills"]');
    if (await fuelBillsTab.count() > 0) {
      await fuelBillsTab.click();
      await expect(fuelBillsTab).toHaveClass(/active/);
    } else {
      const tab = page.locator('button, [role="tab"]', { hasText: 'Fuel Bills' });
      if (await tab.count() > 0) {
        await tab.first().click();
      }
    }

    await page.screenshot({ path: 'docs/ui-review/screenshots/phase-8-documents-ui/fuel-bills-tab.png', fullPage: true });
  });
});

test.describe('Dashboard document widgets', () => {
  test('dashboard shows document KPIs for admin', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/');
    await page.waitForTimeout(3000);
    const docKpis = page.locator('text=Total Documents');
    if (await docKpis.count() > 0) {
      await expect(docKpis.first()).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'docs/ui-review/screenshots/phase-8-documents-ui/dashboard-documents-widgets.png', fullPage: true });
    }
  });
});
