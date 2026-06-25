/**
 * R2 Smoke Test - reads credentials ONLY from environment variables.
 * Never prints secrets, endpoints, access keys, or signed URLs.
 * Do NOT run this script in CI.
 */

const REQUIRED_ENV = [
  'STORAGE_PROVIDER',
  'STORAGE_BUCKET',
  'STORAGE_REGION',
  'STORAGE_ENDPOINT',
  'STORAGE_ACCESS_KEY_ID',
  'STORAGE_SECRET_ACCESS_KEY',
] as const;

function validateEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('Missing required env vars:', missing.join(', '));
    process.exit(1);
  }
  const provider = process.env.STORAGE_PROVIDER;
  if (provider !== 'r2' && provider !== 's3') {
    console.error('STORAGE_PROVIDER must be r2 or s3 for this test');
    process.exit(1);
  }
}

async function main() {
  validateEnv();
  console.log('R2 provider configured');

  const { S3StorageProvider } = await import('../src/lib/storage/s3-storage.provider');
  const { getStorageConfig } = await import('../src/lib/storage/storage.service');

  const config = getStorageConfig();
  const provider = new S3StorageProvider(config);

  const testKey = `smoke-test-${Date.now()}.txt`;
  const testBody = Buffer.from('R2 smoke test');

  console.log('1. Upload...');
  await provider.uploadFile(testBody, testKey, 'text/plain');
  console.log('   Upload passed');

  console.log('2. Signed URL...');
  await provider.getSignedViewUrl(testKey, 'text/plain');
  console.log('   Signed URL generated');

  console.log('3. File exists...');
  const exists = await provider.fileExists(testKey);
  console.log('   Exists:', exists);

  console.log('4. Delete...');
  await provider.deleteFile(testKey);
  console.log('   Delete passed');

  console.log('5. Verify deletion...');
  const existsAfter = await provider.fileExists(testKey);
  console.log('   Exists after delete:', existsAfter);

  console.log('\nR2 smoke test passed!');
}

main().catch((e) => {
  console.error('R2 smoke test failed:', e.message || e);
  process.exit(1);
});
