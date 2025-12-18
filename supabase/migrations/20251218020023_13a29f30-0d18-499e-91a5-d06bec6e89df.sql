-- Clear MFA settings for user to allow fresh 2FA setup
UPDATE public.user_mfa_settings 
SET is_enabled = false, 
    secret = null, 
    secret_encrypted = null, 
    backup_codes = null, 
    backup_codes_hashed = null, 
    encryption_salt = null 
WHERE user_id = '979a5ded-4303-429f-b455-172e4a2bceda';