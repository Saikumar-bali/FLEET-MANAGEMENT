import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { StorageProvider, StorageUploadResult } from './storage.types';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    const filePath = path.join(this.basePath, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      storageKey: key,
      storageBucket: 'local',
      storageProvider: 'local',
      fileSizeBytes: buffer.length,
      mimeType: contentType,
      checksumSha256: checksum,
    };
  }

  async getSignedViewUrl(key: string, _contentType: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return `file://${filePath}`;
  }

  async getDownloadUrl(key: string, _contentType: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return `file://${filePath}`;
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    return fs.existsSync(filePath);
  }

  getFilePath(key: string): string {
    return path.join(this.basePath, key);
  }
}
