-- Create SIM cards table
CREATE TABLE public.sim_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_number TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  carrier TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sim_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a personal app)
CREATE POLICY "Anyone can view SIM cards" 
ON public.sim_cards 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create SIM cards" 
ON public.sim_cards 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update SIM cards" 
ON public.sim_cards 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete SIM cards" 
ON public.sim_cards 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sim_cards_updated_at
  BEFORE UPDATE ON public.sim_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();