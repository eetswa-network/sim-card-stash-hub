-- Drop the old status check constraint and add one that includes 'stored'
ALTER TABLE public.sim_cards DROP CONSTRAINT sim_cards_status_check;
ALTER TABLE public.sim_cards ADD CONSTRAINT sim_cards_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'expired'::text, 'swapped'::text, 'stored'::text]));