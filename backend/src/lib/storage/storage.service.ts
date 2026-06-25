import * as path from 'path';
import type { StorageProvider, StorageConfig } from './storage.types';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';

let storageInstance: StorageProvider | null = null;

function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || 'local') as StorageConfig['provider'];

  if (provider === 's3' || provider === 'r2') {
    if (!process.env.STORAGE_ENDPOINT) {
      throw new Error(`STORAGE_ENDPOINT is required when STORAGE_PROVIDER=${provider}`);
    }
    if (!process.env.STORAGE_ACCESS_KEY_ID) {
      throw new Error(`STORAGE_ACCESS_KEY_ID is required when STORAGE_PROVIDER=${provider}`);
    }
    if (!process.env.STORAGE_SECRET_ACCESS_KEY) {
      throw new Error(`STORAGE_SECRET_ACCESS_KEY is required when STORAGE_PROVIDER=${provider}`);
    }
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
  if (storageInstance) return storageInstance;

  const config = getStorageConfig();

  switch (config.provider) {
    case 's3':
    case 'r2':
      storageInstance = new S3StorageProvider(config);
      break;
    case 'local':
    default:
      storageInstance = new LocalStorageProvider(config.localPath!);
      break;
  }

  return storageInstance;
}

export function resetStorageProvider(): void {
  storageInstance = null;
}
