
-- Add device_name to sim_card_shares so friends can assign a device
ALTER TABLE public.sim_card_shares
  ADD COLUMN device_name text;

-- Allow shared users to update their own share record (to set device_name)
CREATE POLICY "Shared users can update their device assignment"
  ON public.sim_card_shares FOR UPDATE
  USING (auth.uid() = shared_with_id)
  WITH CHECK (auth.uid() = shared_with_id);
