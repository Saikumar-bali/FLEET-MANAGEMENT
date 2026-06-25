export interface StorageUploadResult {
  storageKey: string;
  storageBucket: string;
  storageProvider: string;
  fileSizeBytes: number;
  mimeType: string;
  checksumSha256: string;
}

export interface StorageProvider {
  uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<StorageUploadResult>;

  getSignedViewUrl(key: string, contentType: string): Promise<string>;

  getDownloadUrl(key: string, contentType: string): Promise<string>;

  deleteFile(key: string): Promise<void>;

  fileExists(key: string): Promise<boolean>;
}

export type StorageConfig = {
  provider: 'local' | 's3' | 'supabase' | 'r2' | 'vercel_blob';
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  localPath?: string;
};
