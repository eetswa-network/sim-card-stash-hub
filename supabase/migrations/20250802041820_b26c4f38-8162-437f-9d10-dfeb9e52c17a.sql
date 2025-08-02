-- Create table for app updates/changelog
CREATE TABLE public.app_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'feature', -- feature, bugfix, improvement, security
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create table to track which updates users have seen
CREATE TABLE public.user_update_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  update_id UUID NOT NULL REFERENCES public.app_updates(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, update_id)
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_update_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_updates (everyone can read active updates)
CREATE POLICY "Anyone can view active updates" 
ON public.app_updates 
FOR SELECT 
USING (is_active = true);

-- RLS policies for user_update_views
CREATE POLICY "Users can view their own update views" 
ON public.user_update_views 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own update views" 
ON public.user_update_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_app_updates_updated_at
BEFORE UPDATE ON public.app_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample updates
INSERT INTO public.app_updates (title, description, update_type, version) VALUES
('Enhanced Security Features', 'Added passkey authentication and improved two-factor authentication system', 'feature', 'v2.1.0'),
('Session Management', 'Implemented automatic session timeout after 1 hour for improved security', 'security', 'v2.1.0'),
('Bug Fixes', 'Fixed various logout and authentication issues for better user experience', 'bugfix', 'v2.0.1');