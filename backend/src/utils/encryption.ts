import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

// Derive a 32-byte key from LICENSE_ENCRYPTION_KEY or JWT_SECRET environment variables
function getEncryptionKey(): Buffer {
  const secret = process.env.LICENSE_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL SECURITY ERROR: License encryption requires LICENSE_ENCRYPTION_KEY or JWT_SECRET to be configured in environment variables.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive license key string
 * Format: iv:authTag:encryptedHex
 */
export function encryptLicenseKey(plainText: string): string {
  if (!plainText) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    throw new Error('Failed to encrypt license key');
  }
}

/**
 * Decrypt sensitive license key string
 */
export function decryptLicenseKey(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // If it's legacy plain text (fallback)
      return cipherText;
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return '******** (Decryption error)';
  }
}

/**
 * Mask license key for secure display: e.g. "XXXX-XXXX-XXXX-ABCD"
 */
export function maskLicenseKey(rawKeyOrEncrypted: string): string {
  if (!rawKeyOrEncrypted) return '';
  
  // Try decrypting if encrypted
  let clearText = rawKeyOrEncrypted;
  if (rawKeyOrEncrypted.includes(':') && rawKeyOrEncrypted.split(':').length === 3) {
    clearText = decryptLicenseKey(rawKeyOrEncrypted);
  }
  
  const clean = clearText.replace(/\s+/g, '');
  if (clean.length <= 4) return '****';
  
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-XXXX-${last4.toUpperCase()}`;
}
