/**
 * Cryptographic utilities for MFA secret and backup code protection
 * Uses Web Crypto API for client-side encryption
 */

// Derive an encryption key from the user's ID
async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userId + "_mfa_key_v1"),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("sim_card_stash_salt_v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts MFA secret using AES-GCM
 */
export async function encryptMfaSecret(secret: string, userId: string): Promise<string> {
  try {
    const key = await deriveKey(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt MFA secret");
  }
}

/**
 * Decrypts MFA secret
 */
export async function decryptMfaSecret(encryptedSecret: string, userId: string): Promise<string> {
  try {
    const key = await deriveKey(userId);
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedSecret), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData
    );
    
    // Return as string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt MFA secret");
  }
}

/**
 * Hashes a backup code using SHA-256
 */
export async function hashBackupCode(code: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error("Hashing error:", error);
    throw new Error("Failed to hash backup code");
  }
}

/**
 * Verifies a backup code against its hash
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  try {
    const codeHash = await hashBackupCode(code);
    return codeHash === hash;
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
}
