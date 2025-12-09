-- Add a random salt column for MFA encryption
ALTER TABLE public.user_mfa_settings 
ADD COLUMN IF NOT EXISTS encryption_salt text;

-- Create a function to generate a random salt
CREATE OR REPLACE FUNCTION public.generate_random_salt()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate a 32-byte random salt and encode as base64
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;