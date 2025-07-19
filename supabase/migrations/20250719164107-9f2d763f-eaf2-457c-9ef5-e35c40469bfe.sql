-- Add login and password fields to sim_cards table
ALTER TABLE public.sim_cards 
ADD COLUMN login TEXT,
ADD COLUMN password TEXT;