
-- Add location column to sim_cards
ALTER TABLE public.sim_cards ADD COLUMN location text NULL;

-- Create a table for user-defined location options
CREATE TABLE public.sim_card_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, user_id)
);

-- Enable RLS
ALTER TABLE public.sim_card_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own locations"
ON public.sim_card_locations FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create their own locations"
ON public.sim_card_locations FOR INSERT
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete their own locations"
ON public.sim_card_locations FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update their own locations"
ON public.sim_card_locations FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role));
