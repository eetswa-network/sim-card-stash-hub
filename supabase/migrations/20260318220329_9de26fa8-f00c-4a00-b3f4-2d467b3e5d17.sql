
-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships they're part of
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests
CREATE POLICY "Users can create friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships addressed to them (accept/decline)
CREATE POLICY "Users can update friendships addressed to them"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id);

-- Users can delete friendships they're part of (unfriend)
CREATE POLICY "Users can delete their own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- SIM card shares table
CREATE TABLE public.sim_card_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sim_card_id uuid NOT NULL REFERENCES public.sim_cards(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (sim_card_id, shared_with_id)
);

ALTER TABLE public.sim_card_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage shares
CREATE POLICY "Owners can view their shares"
  ON public.sim_card_shares FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Owners can create shares"
  ON public.sim_card_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete shares"
  ON public.sim_card_shares FOR DELETE
  USING (auth.uid() = owner_id);

-- Allow shared users to view shared SIM cards
CREATE POLICY "Users can view shared SIM cards"
  ON public.sim_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sim_card_shares
      WHERE sim_card_shares.sim_card_id = sim_cards.id
        AND sim_card_shares.shared_with_id = auth.uid()
    )
  );

-- Allow shared users to view usage data for shared SIM cards
CREATE POLICY "Users can view shared SIM card usage"
  ON public.sim_card_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sim_card_shares
      WHERE sim_card_shares.sim_card_id = sim_card_usage.sim_card_id
        AND sim_card_shares.shared_with_id = auth.uid()
    )
  );

-- Function to find user by email for friend requests
CREATE OR REPLACE FUNCTION public.find_user_by_email(search_email text)
RETURNS TABLE (user_id uuid, email text, profile_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id as user_id, au.email, p.profile_name
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE au.email = search_email
    AND au.id != auth.uid()
  LIMIT 1;
$$;
