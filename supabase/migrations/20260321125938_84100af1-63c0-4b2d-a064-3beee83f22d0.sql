
-- Add value and activated_at fields to sim_cards
ALTER TABLE public.sim_cards
ADD COLUMN value numeric DEFAULT NULL,
ADD COLUMN activated_at timestamp with time zone DEFAULT NULL;
