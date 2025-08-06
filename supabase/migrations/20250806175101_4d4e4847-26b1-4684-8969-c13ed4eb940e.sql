-- Remove the existing unique constraint that blocks all duplicates
ALTER TABLE public.sim_cards 
DROP CONSTRAINT sim_cards_sim_number_key;

-- The partial unique index we created earlier will handle the logic:
-- unique_sim_number_excluding_placeholder allows XXXXXXXXXXXXX to be duplicated
-- but ensures all other sim numbers are unique