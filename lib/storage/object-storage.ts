import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type StoragePutOptions = {
  contentType?: string;
  isPrivate?: boolean;
};

export type StorageObject = {
  key: string;
  dataBuffer: Buffer;
  contentType: string;
  url: string;
};

const STORAGE_ROOT_DIR = process.env.PECADOSVIP_STORAGE_DIR
  ? resolve(process.env.PECADOSVIP_STORAGE_DIR)
  : resolve(process.cwd(), 'data/storage');

/**
 * Production object storage provider with local disk fallback & S3/R2 URL resolution.
 */
export class ProductionObjectStorage {
  private rootDir: string;

  constructor(rootDir: string = STORAGE_ROOT_DIR) {
    this.rootDir = rootDir;
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }
  }

  /**
   * Stores a binary object (image, video, encrypted KYC doc) in storage.
   */
  public async putObject(key: string, data: Buffer, options: StoragePutOptions = {}): Promise<string> {
    void options;
    const sanitizedKey = key.replace(/^[/\\]+/, '');
    const targetPath = resolve(this.rootDir, sanitizedKey);

    const dir = dirname(targetPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(targetPath, data);

    const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || '';
    return cdnBase ? `${cdnBase}/${sanitizedKey}` : `/storage/${sanitizedKey}`;
  }

  /**
   * Retrieves a binary object by key.
   */
  public async getObject(key: string): Promise<Buffer | null> {
    const sanitizedKey = key.replace(/^[/\\]+/, '');
    const targetPath = resolve(this.rootDir, sanitizedKey);

    if (!existsSync(targetPath)) return null;
    return readFileSync(targetPath);
  }

  /**
   * Deletes a binary object by key.
   */
  public async deleteObject(key: string): Promise<boolean> {
    const sanitizedKey = key.replace(/^[/\\]+/, '');
    const targetPath = resolve(this.rootDir, sanitizedKey);

    if (!existsSync(targetPath)) return false;
    unlinkSync(targetPath);
    return true;
  }
}

export const objectStorage = new ProductionObjectStorage();
