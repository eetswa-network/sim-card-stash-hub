-- Add profile_id field to sim_cards table to link to profiles
ALTER TABLE public.sim_cards 
ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update existing records to link to profiles based on user_id
UPDATE public.sim_cards 
SET profile_id = (
  SELECT id FROM public.profiles 
  WHERE profiles.user_id = sim_cards.user_id
)
WHERE user_id IS NOT NULL;