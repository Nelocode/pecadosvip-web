import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type EncryptedBookingPayload = {
  encryptedDataBase64: string;
  ivHex: string;
  authTagHex: string;
};

export type PrivateInquiryForm = {
  clientName: string;
  contactMethod: string;
  preferredCity: string;
  modelId: string;
  requestedDate: string;
  notes?: string;
};

export function encryptPrivateInquiry(
  form: PrivateInquiryForm,
  agencyPublicKeySecret: string = 'agency-e2ee-public-key-secret-12345'
): EncryptedBookingPayload {
  const key = createHash('sha256').update(agencyPublicKeySecret).digest();
  const iv = randomBytes(12);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const jsonStr = JSON.stringify(form);
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedDataBase64: encrypted.toString('base64'),
    ivHex: iv.toString('hex'),
    authTagHex: authTag.toString('hex'),
  };
}

export function decryptPrivateInquiry(
  payload: EncryptedBookingPayload,
  agencyPrivateKeySecret: string = 'agency-e2ee-public-key-secret-12345'
): PrivateInquiryForm {
  const key = createHash('sha256').update(agencyPrivateKeySecret).digest();
  const iv = Buffer.from(payload.ivHex, 'hex');
  const authTag = Buffer.from(payload.authTagHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decryptedBuffer = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedDataBase64, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decryptedBuffer.toString('utf8'));
}
