import * as crypto from 'crypto';
import { getAdminCredential, getApiBase } from './test-helpers/credentials';

const BASE_URL = getApiBase();

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];
let createdDocId: string = '';

function createMinimalPdf(): Buffer {
  const content = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n345\n%%EOF';
  return Buffer.from(content, 'utf-8');
}

async function apiCall(
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
  formData?: FormData,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const init: RequestInit = { method, headers };

  if (formData) {
    init.body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    if (body) init.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, init);
  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  return { status: res.status, data };
}

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, message: 'OK', duration: Date.now() - start });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, message: err.message || String(err), duration: Date.now() - start });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function expect(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function main() {
  console.log('\n📋 Documents Workflow Test Suite\n');
  console.log('─'.repeat(60));

  const adminCred = getAdminCredential();
  const loginRes = await apiCall('POST', '/api/v1/auth/login', '', {
    identifier: adminCred.identifier,
    password: adminCred.password,
  });
  expect(loginRes.status === 200, `Login failed: ${loginRes.status}`);
  const token = loginRes.data.data.accessToken;
  expect(!!token, 'No access token');
  console.log('  ✓ Authenticated as admin\n');

  console.log('Upload Document');
  await runTest('Upload a test PDF document', async () => {
    const pdfBuffer = createMinimalPdf();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, 'test-document.pdf');
    formData.append('title', 'Test Document');
    formData.append('documentType', 'GENERAL');
    formData.append('documentCategory', 'GENERAL');
    formData.append('description', 'Phase 8 test document');

    const res = await apiCall('POST', '/api/v1/documents/upload', token, undefined, formData);
    expect(res.status === 201, `Expected 201, got ${res.status}: ${res.data?.message || ''}`);
    createdDocId = res.data.data.id;
    expect(!!createdDocId, 'No document ID returned');
    expect(res.data.data.documentNumber, 'No document number');
    expect(res.data.data.title === 'Test Document', 'Title mismatch');
    expect(res.data.data.mimeType === 'application/pdf', 'MIME type mismatch');
    expect(res.data.data.documentStatus === 'ACTIVE', 'Status not ACTIVE');
    expect(res.data.data.verificationStatus === 'PENDING', 'Verification not PENDING');
  });

  console.log('\nList Documents');
  await runTest('List documents returns paginated results', async () => {
    const res = await apiCall('GET', '/api/v1/documents', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.data.items, 'No items in response');
    expect(Array.isArray(res.data.data.items), 'Items is not array');
    expect(res.data.data.pagination, 'No pagination');
  });

  await runTest('Filter documents by category', async () => {
    const res = await apiCall('GET', '/api/v1/documents?documentCategory=GENERAL', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(Array.isArray(res.data.data.items), 'Items is not array');
  });

  console.log('\nGet Document');
  await runTest('Get document by ID', async () => {
    const res = await apiCall('GET', `/api/v1/documents/${createdDocId}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.data.id === createdDocId, 'ID mismatch');
    expect(res.data.data.uploadedBy, 'No uploadedBy');
  });

  await runTest('Get non-existent document returns 404', async () => {
    const res = await apiCall('GET', '/api/v1/documents/nonexistent', token);
    expect(res.status === 404, `Expected 404, got ${res.status}`);
  });

  console.log('\nView/Download Document');
  await runTest('View document returns URL or stream', async () => {
    const res = await apiCall('GET', `/api/v1/documents/${createdDocId}/view`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('Download document returns URL or stream', async () => {
    const res = await apiCall('GET', `/api/v1/documents/${createdDocId}/download`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  console.log('\nUpdate Document');
  await runTest('Update document metadata', async () => {
    const res = await apiCall('PUT', `/api/v1/documents/${createdDocId}`, token, {
      title: 'Updated Test Document',
      description: 'Updated description',
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.data.title === 'Updated Test Document', 'Title not updated');
  });

  console.log('\nVerify Document');
  await runTest('Verify document', async () => {
    const res = await apiCall('POST', `/api/v1/documents/${createdDocId}/verify`, token, {
      verificationStatus: 'VERIFIED',
      notes: 'Test verification',
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.data.verificationStatus === 'VERIFIED', 'Verification status not updated');
  });

  console.log('\nArchive Document');
  await runTest('Archive document', async () => {
    const res = await apiCall('POST', `/api/v1/documents/${createdDocId}/archive`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.data.documentStatus === 'ARCHIVED', 'Status not ARCHIVED');
  });

  await runTest('Archived document appears in archived filter', async () => {
    const res = await apiCall('GET', '/api/v1/documents?status=ARCHIVED', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    const found = res.data.data.items.find((d: any) => d.id === createdDocId);
    expect(!!found, 'Archived document not found in results');
  });

  console.log('\nDelete Document');
  await runTest('Soft delete document', async () => {
    const res = await apiCall('DELETE', `/api/v1/documents/${createdDocId}`, token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data.data.documentStatus === 'DELETED', 'Status not DELETED');
  });

  await runTest('Deleted document not in active list', async () => {
    const res = await apiCall('GET', '/api/v1/documents', token);
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    const found = res.data.data.items.find((d: any) => d.id === createdDocId);
    expect(!found, 'Deleted document still in active list');
  });

  await runTest('Get deleted document returns 404', async () => {
    const res = await apiCall('GET', `/api/v1/documents/${createdDocId}`, token);
    expect(res.status === 404, `Expected 404, got ${res.status}`);
  });

  console.log('\n' + '─'.repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Results: ${results.length} total, ${passed} passed, ${failed} failed`);
  console.log('');

  if (failed > 0) {
    console.log('FAILED TESTS:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ✗ ${r.name}: ${r.message}`);
    });
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
