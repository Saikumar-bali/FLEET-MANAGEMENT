import * as crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, StorageUploadResult, StorageConfig } from './storage.types';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId || '',
        secretAccessKey: config.secretAccessKey || '',
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return {
      storageKey: key,
      storageBucket: this.bucket,
      storageProvider: 's3',
      fileSizeBytes: buffer.length,
      mimeType: contentType,
      checksumSha256: checksum,
    };
  }

  async getSignedViewUrl(key: string, _contentType: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async getDownloadUrl(key: string, _contentType: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
