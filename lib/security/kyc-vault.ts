import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type EncryptedKycPayload = {
  encryptedDataBase64: string;
  ivHex: string;
  authTagHex: string;
  algorithm: 'aes-256-gcm';
  encryptedAt: string;
};

export class KycVaultError extends Error {
  public readonly code: 'INVALID_KEY' | 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'TAMPERING_DETECTED';

  constructor(code: 'INVALID_KEY' | 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'TAMPERING_DETECTED', message: string) {
    super(message);
    this.name = 'KycVaultError';
    this.code = code;
  }
}

/**
 * Derives a 256-bit key from an environment variable or master passphrase.
 */
export function deriveKycMasterKey(secret: string): Buffer {
  if (!secret || secret.length < 16) {
    throw new KycVaultError('INVALID_KEY', 'KYC secret key must be at least 16 characters long.');
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

/**
 * Encrypts a binary document (ID card, selfie verification, contract) using AES-256-GCM.
 */
export function encryptKycDocument(documentBuffer: Buffer, masterKey: Buffer): EncryptedKycPayload {
  if (masterKey.length !== 32) {
    throw new KycVaultError('INVALID_KEY', 'Master key must be exactly 32 bytes (256 bits).');
  }

  try {
    const iv = randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = createCipheriv('aes-256-gcm', masterKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(documentBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedDataBase64: encrypted.toString('base64'),
      ivHex: iv.toString('hex'),
      authTagHex: authTag.toString('hex'),
      algorithm: 'aes-256-gcm',
      encryptedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new KycVaultError('ENCRYPTION_FAILED', `Failed to encrypt document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypts an AES-256-GCM encrypted KYC document. Throws error if payload was tampered with.
 */
export function decryptKycDocument(payload: EncryptedKycPayload, masterKey: Buffer): Buffer {
  if (masterKey.length !== 32) {
    throw new KycVaultError('INVALID_KEY', 'Master key must be exactly 32 bytes (256 bits).');
  }

  try {
    const encryptedBuffer = Buffer.from(payload.encryptedDataBase64, 'base64');
    const iv = Buffer.from(payload.ivHex, 'hex');
    const authTag = Buffer.from(payload.authTagHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', masterKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted;
  } catch (error) {
    throw new KycVaultError('TAMPERING_DETECTED', `Decryption failed or data authentication tag mismatch: ${error instanceof Error ? error.message : String(error)}`);
  }
}
