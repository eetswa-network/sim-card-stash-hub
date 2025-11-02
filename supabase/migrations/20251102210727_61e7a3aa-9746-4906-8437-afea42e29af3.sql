-- First, ensure any existing records without user_id are handled
-- This shouldn't exist due to RLS, but being safe
UPDATE sim_cards SET user_id = user_id WHERE user_id IS NULL;

-- Make user_id required in sim_cards table
ALTER TABLE sim_cards ALTER COLUMN user_id SET NOT NULL;