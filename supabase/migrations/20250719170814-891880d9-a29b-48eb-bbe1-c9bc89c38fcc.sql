-- Add sim_type column to sim_cards table
ALTER TABLE public.sim_cards 
ADD COLUMN sim_type TEXT NOT NULL DEFAULT 'Physical SIM' 
CHECK (sim_type IN ('eSIM', 'Physical SIM'));