import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

// Derive a 32-byte key from LICENSE_ENCRYPTION_KEY or JWT_SECRET environment variables
function getEncryptionKey(): Buffer {
  const secret = process.env.LICENSE_ENCRYPTION_KEY || process.env.JWT_SECRET || 'infrainventory-internal-secure-key-default-2026';
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

/**
 * Generic AES-256-GCM secret encryption (for Telegram Bot Tokens, Webhook secrets, etc.)
 */
export function encryptSecret(plainText: string): string {
  return encryptLicenseKey(plainText);
}

/**
 * Generic AES-256-GCM secret decryption
 */
export function decryptSecret(cipherText: string): string {
  return decryptLicenseKey(cipherText);
}

/**
 * Mask sensitive token or secret string for safe display: e.g. "********abcd"
 */
export function maskSecret(rawSecretOrEncrypted?: string | null): string {
  if (!rawSecretOrEncrypted) return '';
  
  let clearText = rawSecretOrEncrypted;
  if (rawSecretOrEncrypted.includes(':') && rawSecretOrEncrypted.split(':').length === 3) {
    clearText = decryptSecret(rawSecretOrEncrypted);
  }
  
  if (!clearText || clearText.startsWith('********')) return '********';
  if (clearText.length <= 6) return '******';
  
  const last4 = clearText.slice(-4);
  return `********${last4}`;
}

/**
 * Mask chat ID for display / logging: e.g. "-100****7890" or "12****78"
 */
export function maskChatId(chatId?: string | null): string {
  if (!chatId) return '';
  const str = String(chatId).trim();
  if (str.length <= 4) return '****';
  
  if (str.startsWith('-100') && str.length > 8) {
    const last4 = str.slice(-4);
    return `-100****${last4}`;
  }
  
  if (str.length > 6) {
    const first2 = str.slice(0, 2);
    const last2 = str.slice(-2);
    return `${first2}****${last2}`;
  }
  
  return `****${str.slice(-2)}`;
}
