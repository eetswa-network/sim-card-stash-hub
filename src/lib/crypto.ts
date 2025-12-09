/**
 * Cryptographic utilities for MFA secret and backup code protection
 * Uses Web Crypto API for client-side encryption with per-user random salts
 */

import { supabase } from "@/integrations/supabase/client";

// Cache for encryption salts to avoid repeated database calls
const saltCache = new Map<string, string>();

/**
 * Get or create a random encryption salt for a user
 * Salts are stored in the database for persistence
 */
async function getOrCreateSalt(userId: string): Promise<string> {
  // Check cache first
  if (saltCache.has(userId)) {
    return saltCache.get(userId)!;
  }

  try {
    // Try to get existing salt from database
    const { data, error } = await supabase
      .from("user_mfa_settings")
      .select("encryption_salt")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.encryption_salt) {
      saltCache.set(userId, data.encryption_salt);
      return data.encryption_salt;
    }

    // Generate a new random salt
    const saltBytes = new Uint8Array(32);
    crypto.getRandomValues(saltBytes);
    const newSalt = btoa(String.fromCharCode(...saltBytes));
    
    // Store in cache for immediate use
    saltCache.set(userId, newSalt);
    
    return newSalt;
  } catch (error) {
    console.error("Error getting/creating salt:", error);
    // Fallback to generating a salt (won't be persisted until MFA save)
    const saltBytes = new Uint8Array(32);
    crypto.getRandomValues(saltBytes);
    const fallbackSalt = btoa(String.fromCharCode(...saltBytes));
    saltCache.set(userId, fallbackSalt);
    return fallbackSalt;
  }
}

/**
 * Derive an encryption key from the user's ID and a random salt
 */
async function deriveKey(userId: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userId + "_mfa_key_v2"), // Updated version for new salt-based keys
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Use the random salt instead of a fixed salt
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
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
 * Legacy key derivation for backward compatibility with existing encrypted secrets
 */
async function deriveLegacyKey(userId: string): Promise<CryptoKey> {
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
 * Encrypts MFA secret using AES-GCM with random per-user salt
 * Returns the encrypted secret - salt should be saved separately
 */
export async function encryptMfaSecret(secret: string, userId: string): Promise<{ encrypted: string; salt: string }> {
  try {
    const salt = await getOrCreateSalt(userId);
    const key = await deriveKey(userId, salt);
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
    return {
      encrypted: btoa(String.fromCharCode(...combined)),
      salt: salt
    };
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt MFA secret");
  }
}

/**
 * Decrypts MFA secret - automatically handles both new (salted) and legacy formats
 */
export async function decryptMfaSecret(encryptedSecret: string, userId: string, salt?: string | null): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedSecret), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Try decryption with the appropriate key
    let key: CryptoKey;
    
    if (salt) {
      // New format with random salt
      key = await deriveKey(userId, salt);
    } else {
      // Legacy format with fixed salt
      key = await deriveLegacyKey(userId);
    }
    
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
    // If decryption with new key fails and we had a salt, try legacy
    if (salt) {
      try {
        const legacyKey = await deriveLegacyKey(userId);
        const combined = Uint8Array.from(atob(encryptedSecret), c => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const encryptedData = combined.slice(12);
        
        const decryptedData = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          legacyKey,
          encryptedData
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
      } catch (legacyError) {
        console.error("Legacy decryption also failed:", legacyError);
      }
    }
    
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

/**
 * Clear the salt cache (useful when user re-enables MFA)
 */
export function clearSaltCache(userId: string): void {
  saltCache.delete(userId);
}
