import { randomBytes } from 'node:crypto';
import { objectStorage } from '../storage/object-storage.ts';

export type CryptoPurgeResult = {
  success: boolean;
  shreddedBytes: number;
  purgedAt: string;
};

/**
 * Performs digital shredding / crypto-purging by overwriting storage data with random noise before unlinking.
 */
export async function cryptoPurgeKycRecord(objectKey: string): Promise<CryptoPurgeResult> {
  const existing = await objectStorage.getObject(objectKey);

  if (!existing) {
    return {
      success: false,
      shreddedBytes: 0,
      purgedAt: new Date().toISOString(),
    };
  }

  const length = existing.length;
  // Overwrite buffer with random bytes (gutmann/DoD zeroing simulation)
  const randomNoise = randomBytes(length);
  await objectStorage.putObject(objectKey, randomNoise);

  // Delete storage object
  await objectStorage.deleteObject(objectKey);

  return {
    success: true,
    shreddedBytes: length,
    purgedAt: new Date().toISOString(),
  };
}
