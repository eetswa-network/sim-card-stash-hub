
-- Add event_type and value tracking columns to sim_card_history
ALTER TABLE public.sim_card_history 
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'ownership_transfer',
  ADD COLUMN IF NOT EXISTS old_value text,
  ADD COLUMN IF NOT EXISTS new_value text;

-- Make previous_user_id and new_user_id nullable for non-transfer events
ALTER TABLE public.sim_card_history 
  ALTER COLUMN previous_user_id DROP NOT NULL,
  ALTER COLUMN new_user_id DROP NOT NULL,
  ALTER COLUMN changed_by DROP NOT NULL;

-- Create trigger function to track location changes
CREATE OR REPLACE FUNCTION public.track_sim_card_location_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.location IS DISTINCT FROM NEW.location THEN
    INSERT INTO public.sim_card_history (
      sim_card_id, event_type, old_value, new_value, changed_by, notes
    ) VALUES (
      NEW.id,
      'location_change',
      COALESCE(OLD.location, '(none)'),
      COALESCE(NEW.location, '(none)'),
      auth.uid(),
      'Location changed from "' || COALESCE(OLD.location, '(none)') || '" to "' || COALESCE(NEW.location, '(none)') || '"'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER track_location_change
  AFTER UPDATE ON public.sim_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.track_sim_card_location_change();

-- Allow users to insert their own history entries (for location changes via trigger)
CREATE POLICY "Users can insert history for their own SIM cards"
  ON public.sim_card_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim_cards WHERE sim_cards.id = sim_card_id AND sim_cards.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
