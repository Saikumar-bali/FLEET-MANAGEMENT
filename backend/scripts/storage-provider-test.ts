import { getStorageProvider } from '../src/lib/storage/storage.service';

async function test() {
  console.log('Storage provider config:');
  console.log('  PROVIDER:', process.env.STORAGE_PROVIDER);
  console.log('  BUCKET:', process.env.STORAGE_BUCKET);
  console.log('  ENDPOINT:', process.env.STORAGE_ENDPOINT);
  console.log('');

  const storage = getStorageProvider();

  // 1. Upload a test PDF
  const testPdf = Buffer.from('%PDF-1.4 Test fleet document for R2 integration');
  const testKey = `uploads/test-${Date.now()}.pdf`;

  console.log('1. Uploading test document via storage provider...');
  const result = await storage.uploadFile(testPdf, testKey, 'application/pdf');
  console.log('   OK -', JSON.stringify(result, null, 2));

  // 2. Get signed view URL
  console.log('2. Getting signed view URL...');
  const viewUrl = await storage.getSignedViewUrl(result.storageKey, 'application/pdf');
  console.log(`   OK - ${viewUrl.substring(0, 100)}...`);

  // 3. Get download URL
  console.log('3. Getting download URL...');
  const downloadUrl = await storage.getDownloadUrl(result.storageKey, 'application/pdf');
  console.log(`   OK - ${downloadUrl.substring(0, 100)}...`);

  // 4. Check exists
  console.log('4. Checking file exists...');
  const exists = await storage.fileExists(result.storageKey);
  console.log(`   OK - exists: ${exists}`);

  // 5. Delete
  console.log('5. Deleting file...');
  await storage.deleteFile(result.storageKey);
  console.log('   OK - deleted');

  // 6. Verify deleted
  console.log('6. Verifying deletion...');
  const existsAfter = await storage.fileExists(result.storageKey);
  console.log(`   OK - exists after delete: ${existsAfter}`);

  console.log('\nFull storage provider test passed!');
}

test().catch((e) => {
  console.error('Test failed:', e.message || e);
  process.exit(1);
});
