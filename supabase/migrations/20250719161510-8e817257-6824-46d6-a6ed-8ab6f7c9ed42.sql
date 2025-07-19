-- Update SIM cards table to link to users
ALTER TABLE public.sim_cards ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view SIM cards" ON public.sim_cards;
DROP POLICY IF EXISTS "Anyone can create SIM cards" ON public.sim_cards;
DROP POLICY IF EXISTS "Anyone can update SIM cards" ON public.sim_cards;
DROP POLICY IF EXISTS "Anyone can delete SIM cards" ON public.sim_cards;

-- Create user-specific policies
CREATE POLICY "Users can view their own SIM cards" 
ON public.sim_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SIM cards" 
ON public.sim_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SIM cards" 
ON public.sim_cards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SIM cards" 
ON public.sim_cards 
FOR DELETE 
USING (auth.uid() = user_id);