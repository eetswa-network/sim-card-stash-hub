-- Add profile_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN profile_name TEXT;