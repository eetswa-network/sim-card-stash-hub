-- Drop the insecure base64 "encryption" functions
DROP FUNCTION IF EXISTS public.encrypt_account_password(TEXT);
DROP FUNCTION IF EXISTS public.decrypt_account_password(TEXT);

-- Create proper password hashing function using bcrypt
-- This is one-way hashing - passwords cannot be decrypted, only verified
CREATE OR REPLACE FUNCTION public.hash_account_password(password_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF password_text IS NULL OR password_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Use bcrypt with cost factor 12 for secure password hashing
  RETURN crypt(password_text, gen_salt('bf', 12));
END;
$$;

-- Create password verification function
CREATE OR REPLACE FUNCTION public.verify_account_password(password_text TEXT, password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF password_text IS NULL OR password_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify password against bcrypt hash
  RETURN password_hash = crypt(password_text, password_hash);
END;
$$;

COMMENT ON FUNCTION public.hash_account_password IS 'Securely hash account passwords using bcrypt';
COMMENT ON FUNCTION public.verify_account_password IS 'Verify a password against its bcrypt hash';