-- Disable 2FA for user caught@droctopus.net
UPDATE user_mfa_settings 
SET is_enabled = false, 
    secret = NULL, 
    secret_encrypted = NULL, 
    backup_codes = NULL, 
    backup_codes_hashed = NULL,
    encryption_salt = NULL
WHERE user_id = '979a5ded-4303-429f-b455-172e4a2bceda';