import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({
  region: 'auto',
  endpoint: 'https://c60476ef1ffb10e731c1a6aec612af6e.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '16d2069687c78e87ebf440f8049f04e4',
    secretAccessKey: 'e180c834cf6c882d00f09fa4b9604a21b04fe14e77a51657c89b31cf3598af15',
  },
  forcePathStyle: true,
});

const BUCKET = 'fleet-documents';

async function test() {
  const testKey = 'test/r2-test.txt';
  const testContent = Buffer.from('Fleet Management R2 test - ' + new Date().toISOString());

  // 1. Upload
  console.log('1. Uploading test file...');
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: testKey,
    Body: testContent,
    ContentType: 'text/plain',
  }));
  console.log('   OK - uploaded');

  // 2. Head (check exists)
  console.log('2. Checking file exists...');
  const head = await client.send(new HeadObjectCommand({
    Bucket: BUCKET,
    Key: testKey,
  }));
  console.log(`   OK - exists, size: ${head.ContentLength} bytes`);

  // 3. Signed URL for download
  console.log('3. Generating signed download URL...');
  const downloadUrl = await getSignedUrl(client, new GetObjectCommand({
    Bucket: BUCKET,
    Key: testKey,
  }), { expiresIn: 3600 });
  console.log(`   OK - URL: ${downloadUrl.substring(0, 80)}...`);

  // 4. Signed URL for upload (view)
  console.log('4. Generating signed upload URL...');
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
    Bucket: BUCKET,
    Key: 'test/r2-presigned-upload.txt',
  }), { expiresIn: 3600 });
  console.log(`   OK - URL: ${uploadUrl.substring(0, 80)}...`);

  // 5. Delete
  console.log('5. Deleting test file...');
  await client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: testKey,
  }));
  console.log('   OK - deleted');

  // 6. Verify deleted
  console.log('6. Verifying deletion...');
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: testKey }));
    console.log('   FAIL - file still exists');
  } catch (e: any) {
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
      console.log('   OK - confirmed deleted');
    } else {
      throw e;
    }
  }

  console.log('\nAll R2 tests passed!');
}

test().catch((e) => {
  console.error('R2 test failed:', e.message || e);
  process.exit(1);
});
