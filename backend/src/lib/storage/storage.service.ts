import * as path from 'path';
import type { StorageProvider, StorageConfig } from './storage.types';
import { S3StorageProvider } from './s3-storage.provider';


function getStorageConfig(): StorageConfig {
  const rawProvider = (process.env.STORAGE_PROVIDER || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const provider = (rawProvider === 's3' || rawProvider === 'r2' ? rawProvider : 'local') as StorageConfig['provider'];  if (provider === 's3' || provider === 'r2') {
    if (!process.env.STORAGE_ENDPOINT) throw new Error(`STORAGE_ENDPOINT is required when STORAGE_PROVIDER=${provider}`);
    if (!process.env.STORAGE_ACCESS_KEY_ID) throw new Error(`STORAGE_ACCESS_KEY_ID is required when STORAGE_PROVIDER=${provider}`);
    if (!process.env.STORAGE_SECRET_ACCESS_KEY) throw new Error(`STORAGE_SECRET_ACCESS_KEY is required when STORAGE_PROVIDER=${provider}`);
  }

  return {
    provider,
    bucket: process.env.STORAGE_BUCKET || 'fleet-documents',
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    localPath: process.env.STORAGE_LOCAL_PATH || path.resolve(__dirname, '..', '..', '..', '.storage', 'uploads'),
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
    signedUrlExpiresSeconds: parseInt(process.env.STORAGE_SIGNED_URL_EXPIRES_SECONDS || '900', 10),
  };
}

export function getStorageProvider(): StorageProvider {
  const config = getStorageConfig();
  return new S3StorageProvider(config);
}

export function resetStorageProvider(): void {}

