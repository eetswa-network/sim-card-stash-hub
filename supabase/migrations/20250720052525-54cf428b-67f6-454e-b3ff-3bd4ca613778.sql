-- Create a carriers table to store custom carriers for each user
CREATE TABLE public.carriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

-- Create policies for carrier access
CREATE POLICY "Users can view their own carriers" 
ON public.carriers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own carriers" 
ON public.carriers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own carriers" 
ON public.carriers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own carriers" 
ON public.carriers 
FOR DELETE 
USING (auth.uid() = user_id);