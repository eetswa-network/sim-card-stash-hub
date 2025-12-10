-- Recreate hash_account_password function with explicit schema reference to pgcrypto functions
CREATE OR REPLACE FUNCTION public.hash_account_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF password_text IS NULL OR password_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Use bcrypt with cost factor 12 for secure password hashing
  RETURN extensions.crypt(password_text, extensions.gen_salt('bf', 12));
END;
$$;

-- Also fix verify_account_password function
CREATE OR REPLACE FUNCTION public.verify_account_password(password_text text, password_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF password_text IS NULL OR password_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify password against bcrypt hash
  RETURN password_hash = extensions.crypt(password_text, password_hash);
END;
$$;