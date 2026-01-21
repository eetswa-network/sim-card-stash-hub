-- Add SELECT policy allowing users to view history for SIM cards they currently own
-- This allows users to see the audit trail for their own SIM cards

CREATE POLICY "Users can view history for their own SIM cards"
ON public.sim_card_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sim_cards
    WHERE sim_cards.id = sim_card_history.sim_card_id
    AND sim_cards.user_id = auth.uid()
  )
);