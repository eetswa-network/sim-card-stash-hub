-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Update RLS policies for sim_cards
DROP POLICY IF EXISTS "Users can view their own SIM cards" ON public.sim_cards;
CREATE POLICY "Users can view their own SIM cards"
  ON public.sim_cards
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can create their own SIM cards" ON public.sim_cards;
CREATE POLICY "Users can create their own SIM cards"
  ON public.sim_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can update their own SIM cards" ON public.sim_cards;
CREATE POLICY "Users can update their own SIM cards"
  ON public.sim_cards
  FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can delete their own SIM cards" ON public.sim_cards;
CREATE POLICY "Users can delete their own SIM cards"
  ON public.sim_cards
  FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- Update RLS policies for sim_card_usage
DROP POLICY IF EXISTS "Users can view their own sim card usage entries" ON public.sim_card_usage;
CREATE POLICY "Users can view their own sim card usage entries"
  ON public.sim_card_usage
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can create their own sim card usage entries" ON public.sim_card_usage;
CREATE POLICY "Users can create their own sim card usage entries"
  ON public.sim_card_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can update their own sim card usage entries" ON public.sim_card_usage;
CREATE POLICY "Users can update their own sim card usage entries"
  ON public.sim_card_usage
  FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can delete their own sim card usage entries" ON public.sim_card_usage;
CREATE POLICY "Users can delete their own sim card usage entries"
  ON public.sim_card_usage
  FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- Update RLS policies for accounts
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
CREATE POLICY "Users can view their own accounts"
  ON public.accounts
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
CREATE POLICY "Users can create their own accounts"
  ON public.accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
CREATE POLICY "Users can update their own accounts"
  ON public.accounts
  FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Users can delete their own accounts"
  ON public.accounts
  FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- Update RLS policies for carriers
DROP POLICY IF EXISTS "Users can view their own carriers" ON public.carriers;
CREATE POLICY "Users can view their own carriers"
  ON public.carriers
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can create their own carriers" ON public.carriers;
CREATE POLICY "Users can create their own carriers"
  ON public.carriers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can update their own carriers" ON public.carriers;
CREATE POLICY "Users can update their own carriers"
  ON public.carriers
  FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can delete their own carriers" ON public.carriers;
CREATE POLICY "Users can delete their own carriers"
  ON public.carriers
  FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));