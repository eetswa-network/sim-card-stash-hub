-- Remove profile_name column from sim_cards table
ALTER TABLE public.sim_cards 
DROP COLUMN profile_name;