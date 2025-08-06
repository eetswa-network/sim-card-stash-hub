-- Update the status check constraint to include 'expired' as a valid option
ALTER TABLE public.sim_cards 
DROP CONSTRAINT IF EXISTS sim_cards_status_check;

-- Add the updated constraint with all valid status values including 'expired'
ALTER TABLE public.sim_cards 
ADD CONSTRAINT sim_cards_status_check 
CHECK (status IN ('active', 'inactive', 'suspended', 'expired'));