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

  /**
   * Resolve a storage key to an absolute path and guarantee it stays inside
   * `basePath`. Rejects absolute paths and any `..` traversal so a malicious key
   * like `../../etc/passwd` cannot escape the storage root.
   */
  private resolveKey(key: string): string {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Invalid storage key');
    }
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    if (path.isAbsolute(normalized) || normalized.split(/[/\\]/).includes('..')) {
      throw new Error('Invalid storage key');
    }
    const resolved = path.resolve(this.basePath, normalized);
    if (resolved !== this.basePath && !resolved.startsWith(this.basePath + path.sep)) {
      throw new Error('Invalid storage key');
    }
    return resolved;
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    const filePath = this.resolveKey(key);
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
    const filePath = this.resolveKey(key);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return `file://${filePath}`;
  }

  async getDownloadUrl(key: string, _contentType: string, _fileName?: string): Promise<string> {
    const filePath = this.resolveKey(key);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return `file://${filePath}`;
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = this.resolveKey(key);
    return fs.existsSync(filePath);
  }

  getFilePath(key: string): string {
    return path.join(this.basePath, key);
  }
}
