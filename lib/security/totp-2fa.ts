import { createHmac, randomBytes } from 'node:crypto';

export type TotpSecretResult = {
  secretBase32: string;
  otpauthUrl: string;
};

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bufferToBase32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32ToBuffer(base32Str: string): Buffer {
  const clean = base32Str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generates a secret key for 2FA TOTP (Google Authenticator / Authy).
 */
export function generateTotpSecret(accountEmail: string, issuer: string = 'PecadosVIP'): TotpSecretResult {
  const buf = randomBytes(20);
  const secretBase32 = bufferToBase32(buf);
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}`;

  return {
    secretBase32,
    otpauthUrl,
  };
}

/**
 * Verifies a 6-digit TOTP passcode for a given secret.
 */
export function verifyTotpToken(secretBase32: string, token: string, timeStepSeconds: number = 30): boolean {
  if (!token || token.length !== 6 || !/^\d+$/.test(token)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / timeStepSeconds);

  // Check window of -1, 0, +1 time steps to accommodate clock drift
  for (let window = -1; window <= 1; window++) {
    const counter = currentCounter + window;
    const generatedToken = generateTotpCode(secretBase32, counter);
    if (generatedToken === token) {
      return true;
    }
  }

  return false;
}

function generateTotpCode(secretBase32: string, counter: number): string {
  const key = base32ToBuffer(secretBase32);
  const buffer = Buffer.alloc(8);
  
  // Write counter as 64-bit big-endian integer
  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }

  const hmac = createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}
