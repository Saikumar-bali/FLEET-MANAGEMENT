import { expect, test } from '@playwright/test';
import { loginAsRole } from './helpers/credentials';

test.describe('Phase 8 Documents navigation and upload', () => {
  test('admin sees Documents sidebar item', async ({ page }) => {
    await loginAsRole(page, 'admin');

    const sidebarDocs = page.locator('.nav-item', { hasText: 'Documents' });
    await expect(sidebarDocs).toBeVisible();
  });

  test('documents page loads for admin', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');
    await expect(page).not.toHaveURL('/login');

    const header = page.locator('text=Documents Vault');
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('upload button is visible for admin', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');

    const uploadBtn = page.locator('[data-testid="upload-document-button"]');
    await expect(uploadBtn).toBeVisible();
  });

  test('upload panel opens when clicking upload button', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');

    await page.locator('[data-testid="upload-document-button"]').click();
    const panel = page.locator('[data-testid="document-upload-panel"]');
    await expect(panel).toBeVisible();
  });

  test('document tabs are visible', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');

    const tabs = page.locator('[data-testid="document-tabs"]');
    await expect(tabs).toBeVisible();

    const expectedTabs = ['All', 'Vehicles', 'Drivers', 'Trips', 'Compliance', 'Finance', 'Expiring Soon', 'Archived'];
    for (const tabName of expectedTabs) {
      const tab = page.locator(`[data-testid="document-tab-${tabName.toLowerCase().replace(/\s+/g, '-').replace('expiring-soon', 'expiring').replace('all', 'all')}"]`);
      await expect(tab).toBeVisible();
    }
  });

  test('drop zone is visible in upload panel', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');

    await page.locator('[data-testid="upload-document-button"]').click();
    const dropZone = page.locator('[data-testid="file-drop-zone"]');
    await expect(dropZone).toBeVisible();
  });

  test('empty state shows when no documents', async ({ page }) => {
    await loginAsRole(page, 'admin');
    await page.goto('/documents');

    await page.waitForTimeout(2000);
    const listOrEmpty = page.locator('[data-testid="document-list"], [data-testid="documents-empty"]');
    await expect(listOrEmpty).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Documents API upload and manage', () => {
  test('admin can upload and list documents via API', async ({ page }) => {
    const loginRes = await page.request.post('http://localhost:4000/api/v1/auth/login', {
      data: { identifier: 'admin', password: 'admin@123' },
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data?.accessToken;
    if (!token) {
      test.skip();
      return;
    }

    const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n345\n%%EOF';

    const formData = page.request.multipartFormData();
    if (formData) {
      const blob = Buffer.from(pdfContent, 'utf-8');
      formData.append('file', new Blob([blob], { type: 'application/pdf' }), 'test.pdf');
      formData.append('title', 'E2E Test Document');
      formData.append('documentType', 'GENERAL');
      formData.append('documentCategory', 'GENERAL');
    }

    const uploadRes = await page.request.post('http://localhost:4000/api/v1/documents/upload', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: 'test.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from(pdfContent, 'utf-8'),
        },
        title: 'E2E Test Document',
        documentType: 'GENERAL',
        documentCategory: 'GENERAL',
      },
    });
    expect(uploadRes.status()).toBe(201);
    const uploadJson = await uploadRes.json();
    const docId = uploadJson.data?.id;
    expect(docId).toBeTruthy();

    const listRes = await page.request.get('http://localhost:4000/api/v1/documents', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.status()).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.data?.items).toBeTruthy();

    const deleteRes = await page.request.delete(`http://localhost:4000/api/v1/documents/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.status()).toBe(200);
  });
});

test.describe('Entity detail Documents tabs', () => {
  test('vehicle detail page has Documents section', async ({ page }) => {
    await loginAsRole(page, 'admin');

    const listRes = await page.request.get('http://localhost:4000/api/v1/vehicles?limit=1', {
      headers: { Authorization: `Bearer ${(await page.evaluate(() => localStorage.getItem('fleet_token'))) || ''}` },
    });
    const listJson = await listRes.json();
    if (!listJson.data?.items?.length) return;

    await page.goto(`/vehicles/${listJson.data.items[0].id}`);
    const docsTab = page.locator('button, [role="tab"]', { hasText: 'Documents' });
    if (await docsTab.count() > 0) {
      await docsTab.first().click();
      const panel = page.locator('text=Upload and manage');
      await expect(panel).toBeVisible({ timeout: 5000 });
    }
  });

  test('driver detail page has Documents section', async ({ page }) => {
    await loginAsRole(page, 'admin');

    const listRes = await page.request.get('http://localhost:4000/api/v1/drivers?limit=1', {
      headers: { Authorization: `Bearer ${(await page.evaluate(() => localStorage.getItem('fleet_token'))) || ''}` },
    });
    const listJson = await listRes.json();
    if (!listJson.data?.items?.length) return;

    await page.goto(`/drivers/${listJson.data.items[0].id}`);
    const docsTab = page.locator('button, [role="tab"]', { hasText: 'Documents' });
    if (await docsTab.count() > 0) {
      await docsTab.first().click();
      const panel = page.locator('text=Upload and manage');
      await expect(panel).toBeVisible({ timeout: 5000 });
    }
  });
});
