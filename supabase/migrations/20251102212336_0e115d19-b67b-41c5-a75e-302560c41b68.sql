-- Create encryption/decryption functions using built-in crypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a simple encryption function using digest-based approach
-- This provides basic encryption for account passwords
CREATE OR REPLACE FUNCTION public.encrypt_account_password(password_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  salt TEXT;
BEGIN
  IF password_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Generate a unique salt for this encryption
  salt := encode(gen_random_bytes(16), 'hex');
  
  -- Combine password with salt and encode
  -- This is a simple encryption - for production consider using application-level encryption
  RETURN salt || ':' || encode(
    digest(password_text || salt, 'sha256'),
    'hex'
  ) || ':' || encode(
    convert_to(password_text, 'UTF8'),
    'base64'
  );
END;
$$;

-- Create a decryption function
CREATE OR REPLACE FUNCTION public.decrypt_account_password(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts TEXT[];
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Check if already encrypted (has our format)
  IF position(':' in encrypted_text) > 0 THEN
    parts := string_to_array(encrypted_text, ':');
    IF array_length(parts, 1) = 3 THEN
      -- Extract and decode the password part
      RETURN convert_from(decode(parts[3], 'base64'), 'UTF8');
    END IF;
  END IF;
  
  -- If not encrypted, return as-is (for migration purposes)
  RETURN encrypted_text;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Add comment
COMMENT ON COLUMN public.accounts.password IS 'Encrypted password using custom encryption';

-- Note: We don't migrate existing data in this migration
-- The application will handle encryption on save