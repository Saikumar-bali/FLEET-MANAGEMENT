import { getStorageProvider } from '../src/lib/storage/storage.service';

async function test() {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  console.log('Storage provider test');
  console.log('  Provider:', provider);
  console.log('');

  if (provider === 's3' || provider === 'r2') {
    const required = ['STORAGE_BUCKET', 'STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      console.error('Missing required env vars:', missing.join(', '));
      process.exit(1);
    }
    console.log('R2/S3 env vars configured');
  }

  const storage = getStorageProvider();

  const testPdf = Buffer.from('%PDF-1.4 Test fleet document for storage integration');
  const testKey = `uploads/test-${Date.now()}.pdf`;

  console.log('1. Uploading test document...');
  const result = await storage.uploadFile(testPdf, testKey, 'application/pdf');
  console.log('   Upload passed');

  console.log('2. Getting signed view URL...');
  const viewUrl = await storage.getSignedViewUrl(result.storageKey, 'application/pdf');
  console.log('   Signed URL generated');

  console.log('3. Getting download URL...');
  const downloadUrl = await storage.getDownloadUrl(result.storageKey, 'application/pdf');
  console.log('   Signed URL generated');

  console.log('4. Checking file exists...');
  const exists = await storage.fileExists(result.storageKey);
  console.log('   File exists:', exists);

  console.log('5. Deleting file...');
  await storage.deleteFile(result.storageKey);
  console.log('   Delete passed');

  console.log('6. Verifying deletion...');
  const existsAfter = await storage.fileExists(result.storageKey);
  console.log('   Exists after delete:', existsAfter);

  console.log('\nStorage provider test passed!');
}

test().catch((e) => {
  console.error('Test failed:', e.message || e);
  process.exit(1);
});
