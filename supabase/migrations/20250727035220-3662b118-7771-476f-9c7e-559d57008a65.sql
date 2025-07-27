-- Create accounts table for login credentials
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  login TEXT NOT NULL,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, login)
);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own accounts" 
ON public.accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
ON public.accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
ON public.accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing login/password data from sim_cards to accounts table
-- Use INSERT ON CONFLICT to handle duplicates
INSERT INTO public.accounts (user_id, login, password)
SELECT DISTINCT ON (user_id, login) user_id, login, password
FROM public.sim_cards 
WHERE login IS NOT NULL AND login != ''
ON CONFLICT (user_id, login) DO UPDATE SET 
  password = EXCLUDED.password,
  updated_at = now();

-- Add account_id column to sim_cards table
ALTER TABLE public.sim_cards ADD COLUMN account_id UUID REFERENCES public.accounts(id);

-- Update sim_cards to reference the new accounts
UPDATE public.sim_cards 
SET account_id = accounts.id
FROM public.accounts
WHERE sim_cards.user_id = accounts.user_id 
AND sim_cards.login = accounts.login;