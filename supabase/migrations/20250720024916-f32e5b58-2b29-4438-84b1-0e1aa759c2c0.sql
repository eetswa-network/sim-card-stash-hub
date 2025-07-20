-- Create a table for sim card usage entries
CREATE TABLE public.sim_card_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_card_id UUID NOT NULL REFERENCES public.sim_cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  use_purpose TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sim_card_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own sim card usage entries" 
ON public.sim_card_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sim card usage entries" 
ON public.sim_card_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sim card usage entries" 
ON public.sim_card_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sim card usage entries" 
ON public.sim_card_usage 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sim_card_usage_updated_at
BEFORE UPDATE ON public.sim_card_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove the crab_name column from sim_cards table
ALTER TABLE public.sim_cards 
DROP COLUMN crab_name;