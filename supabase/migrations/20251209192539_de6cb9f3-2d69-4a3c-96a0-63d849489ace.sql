-- Add RLS policy for passkey lookup during authentication
-- This allows the edge function (using service role) to look up passkeys by credential_id
-- Normal users still can only see their own passkeys

CREATE POLICY "Service role can select any passkey for authentication"
ON public.user_passkeys
FOR SELECT
TO service_role
USING (true);