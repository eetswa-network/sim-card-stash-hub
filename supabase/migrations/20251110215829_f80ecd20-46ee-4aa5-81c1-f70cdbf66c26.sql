-- Add new columns for encrypted storage
ALTER TABLE public.user_mfa_settings
ADD COLUMN IF NOT EXISTS secret_encrypted text,
ADD COLUMN IF NOT EXISTS backup_codes_hashed text[];

-- Add documentation
COMMENT ON COLUMN public.user_mfa_settings.secret_encrypted IS 'Application-level AES-GCM encrypted TOTP secret';
COMMENT ON COLUMN public.user_mfa_settings.backup_codes_hashed IS 'Application-level hashed backup codes using Web Crypto API';