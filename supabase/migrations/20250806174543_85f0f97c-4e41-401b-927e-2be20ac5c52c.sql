-- Create a partial unique index on sim_number
-- This allows 'XXXXXXXXXXXXX' to be repeated but ensures all other sim numbers are unique
CREATE UNIQUE INDEX unique_sim_number_excluding_placeholder 
ON public.sim_cards (sim_number) 
WHERE sim_number != 'XXXXXXXXXXXXX';