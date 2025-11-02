-- Drop the existing check constraint
ALTER TABLE sim_cards DROP CONSTRAINT IF EXISTS sim_cards_status_check;

-- Add a new check constraint that includes all statuses: active, inactive, suspended, expired, and swapped
ALTER TABLE sim_cards ADD CONSTRAINT sim_cards_status_check 
CHECK (status IN ('active', 'inactive', 'suspended', 'expired', 'swapped'));