-- Drop all existing RESTRICTIVE policies on sim_cards and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own SIM cards" ON public.sim_cards;
DROP POLICY IF EXISTS "Users can create their own SIM cards" ON public.sim_cards;
DROP POLICY IF EXISTS "Users can update their own SIM cards" ON public.sim_cards;
DROP POLICY IF EXISTS "Users can delete their own SIM cards" ON public.sim_cards;

-- Recreate policies as PERMISSIVE (default behavior)
CREATE POLICY "Users can view their own SIM cards" 
ON public.sim_cards 
FOR SELECT 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create their own SIM cards" 
ON public.sim_cards 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update their own SIM cards" 
ON public.sim_cards 
FOR UPDATE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete their own SIM cards" 
ON public.sim_cards 
FOR DELETE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Also fix the same issue on related tables
DROP POLICY IF EXISTS "Users can view their own sim card usage entries" ON public.sim_card_usage;
DROP POLICY IF EXISTS "Users can create their own sim card usage entries" ON public.sim_card_usage;
DROP POLICY IF EXISTS "Users can update their own sim card usage entries" ON public.sim_card_usage;
DROP POLICY IF EXISTS "Users can delete their own sim card usage entries" ON public.sim_card_usage;

CREATE POLICY "Users can view their own sim card usage entries" 
ON public.sim_card_usage 
FOR SELECT 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create their own sim card usage entries" 
ON public.sim_card_usage 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update their own sim card usage entries" 
ON public.sim_card_usage 
FOR UPDATE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete their own sim card usage entries" 
ON public.sim_card_usage 
FOR DELETE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix accounts table
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;

CREATE POLICY "Users can view their own accounts" 
ON public.accounts 
FOR SELECT 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create their own accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update their own accounts" 
ON public.accounts 
FOR UPDATE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete their own accounts" 
ON public.accounts 
FOR DELETE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix carriers table
DROP POLICY IF EXISTS "Users can view their own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can create their own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can update their own carriers" ON public.carriers;
DROP POLICY IF EXISTS "Users can delete their own carriers" ON public.carriers;

CREATE POLICY "Users can view their own carriers" 
ON public.carriers 
FOR SELECT 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can create their own carriers" 
ON public.carriers 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update their own carriers" 
ON public.carriers 
FOR UPDATE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can delete their own carriers" 
ON public.carriers 
FOR DELETE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'super_admin'::app_role));