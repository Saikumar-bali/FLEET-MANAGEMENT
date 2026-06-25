import type { StorageProvider, StorageUploadResult, StorageConfig } from './storage.types';

export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private accessKeyId?: string;
  private secretAccessKey?: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.region = config.region || 'us-east-1';
    this.endpoint = config.endpoint;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
  }

  async uploadFile(
    _buffer: Buffer,
    _key: string,
    _contentType: string,
  ): Promise<StorageUploadResult> {
    throw new Error('S3 upload not implemented. Configure AWS SDK and implement.');
  }

  async getSignedViewUrl(_key: string, _contentType: string): Promise<string> {
    throw new Error('S3 signed URL not implemented. Configure AWS SDK and implement.');
  }

  async getDownloadUrl(_key: string, _contentType: string): Promise<string> {
    throw new Error('S3 download URL not implemented. Configure AWS SDK and implement.');
  }

  async deleteFile(_key: string): Promise<void> {
    throw new Error('S3 delete not implemented. Configure AWS SDK and implement.');
  }

  async fileExists(_key: string): Promise<boolean> {
    throw new Error('S3 fileExists not implemented. Configure AWS SDK and implement.');
  }
}
