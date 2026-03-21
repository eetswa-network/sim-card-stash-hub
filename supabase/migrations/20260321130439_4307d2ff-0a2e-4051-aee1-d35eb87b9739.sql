-- Make phone_number nullable to support stored SIM cards without a number yet
ALTER TABLE public.sim_cards ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE public.sim_cards ALTER COLUMN phone_number SET DEFAULT '';