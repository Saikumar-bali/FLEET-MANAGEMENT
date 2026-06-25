import * as path from 'path';
import type { StorageProvider, StorageConfig } from './storage.types';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';

let storageInstance: StorageProvider | null = null;

function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || 'local') as StorageConfig['provider'];
  return {
    provider,
    bucket: process.env.STORAGE_BUCKET || 'fleet-documents',
    region: process.env.STORAGE_REGION,
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    localPath: process.env.STORAGE_LOCAL_PATH || path.resolve(__dirname, '..', '..', '..', '.storage', 'uploads'),
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
