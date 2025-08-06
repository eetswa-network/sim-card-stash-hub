-- Create a partial unique constraint on sim_number
-- This allows 'XXXXXXXXXXXXX' to be repeated but ensures all other sim numbers are unique
ALTER TABLE public.sim_cards 
ADD CONSTRAINT unique_sim_number_excluding_placeholder 
UNIQUE (sim_number) 
WHERE sim_number != 'XXXXXXXXXXXXX';