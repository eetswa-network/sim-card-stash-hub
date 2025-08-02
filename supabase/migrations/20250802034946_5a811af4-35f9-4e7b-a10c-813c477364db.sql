-- Create table for storing user MFA settings
CREATE TABLE public.user_mfa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  secret TEXT,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own MFA settings" 
ON public.user_mfa_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own MFA settings" 
ON public.user_mfa_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA settings" 
ON public.user_mfa_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MFA settings" 
ON public.user_mfa_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_mfa_settings_updated_at
BEFORE UPDATE ON public.user_mfa_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();