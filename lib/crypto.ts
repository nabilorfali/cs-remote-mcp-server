import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { TokenSet } from './oauth';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  // Derive a stable 32-byte key from the client secret
  return createHash('sha256')
    .update(process.env.CS_CLIENT_SECRET ?? 'fallback-secret')
    .digest();
}

export function encryptTokenSet(data: TokenSet): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Pack: iv (16) + tag (16) + encrypted data → base64url string
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptTokenSet(token: string): TokenSet | null {
  try {
    const key = getKey();
    const buf = Buffer.from(token, 'base64url');
    const iv        = buf.subarray(0, 16);
    const tag       = buf.subarray(16, 32);
    const encrypted = buf.subarray(32);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as TokenSet;
  } catch {
    return null;
  }
}
