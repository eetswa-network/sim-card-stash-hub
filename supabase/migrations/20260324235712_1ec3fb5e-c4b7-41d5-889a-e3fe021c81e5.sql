CREATE OR REPLACE FUNCTION public.track_sim_card_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  changes text[] := '{}';
  change_details text;
BEGIN
  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.sim_card_history (
      sim_card_id, event_type, old_value, new_value, changed_by, notes
    ) VALUES (
      NEW.id, 'status_change',
      COALESCE(OLD.status, '(none)'), COALESCE(NEW.status, '(none)'),
      auth.uid(),
      'Status changed from "' || COALESCE(OLD.status, '(none)') || '" to "' || COALESCE(NEW.status, '(none)') || '"'
    );
  END IF;

  -- Track location/device changes
  IF OLD.location IS DISTINCT FROM NEW.location THEN
    INSERT INTO public.sim_card_history (
      sim_card_id, event_type, old_value, new_value, changed_by, notes
    ) VALUES (
      NEW.id, 'location_change',
      COALESCE(OLD.location, '(none)'), COALESCE(NEW.location, '(none)'),
      auth.uid(),
      'Device changed from "' || COALESCE(OLD.location, '(none)') || '" to "' || COALESCE(NEW.location, '(none)') || '"'
    );
  END IF;

  -- Track value/balance changes (covers both form edits and recharges)
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO public.sim_card_history (
      sim_card_id, event_type, old_value, new_value, changed_by, notes
    ) VALUES (
      NEW.id, 'value_change',
      COALESCE(OLD.value::text, '0'), COALESCE(NEW.value::text, '0'),
      auth.uid(),
      'Value changed from $' || COALESCE(OLD.value::text, '0') || ' to $' || COALESCE(NEW.value::text, '0')
    );
  END IF;

  -- Track other field edits
  changes := '{}';
  
  IF OLD.phone_number IS DISTINCT FROM NEW.phone_number THEN
    changes := array_append(changes, 'Phone: "' || COALESCE(OLD.phone_number, '(none)') || '" to "' || COALESCE(NEW.phone_number, '(none)') || '"');
  END IF;
  IF OLD.sim_number IS DISTINCT FROM NEW.sim_number THEN
    changes := array_append(changes, 'SIM Number: "' || OLD.sim_number || '" to "' || NEW.sim_number || '"');
  END IF;
  IF OLD.carrier IS DISTINCT FROM NEW.carrier THEN
    changes := array_append(changes, 'Carrier: "' || COALESCE(OLD.carrier, '(none)') || '" to "' || COALESCE(NEW.carrier, '(none)') || '"');
  END IF;
  IF OLD.sim_type IS DISTINCT FROM NEW.sim_type THEN
    changes := array_append(changes, 'SIM Type: "' || OLD.sim_type || '" to "' || NEW.sim_type || '"');
  END IF;
  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    changes := array_append(changes, 'Notes updated');
  END IF;
  IF OLD.login IS DISTINCT FROM NEW.login THEN
    changes := array_append(changes, 'Login updated');
  END IF;
  IF OLD.password IS DISTINCT FROM NEW.password THEN
    changes := array_append(changes, 'Password updated');
  END IF;
  IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    changes := array_append(changes, 'Account changed');
  END IF;
  IF OLD.activated_at IS DISTINCT FROM NEW.activated_at THEN
    changes := array_append(changes, 'Activation date updated');
  END IF;

  IF array_length(changes, 1) > 0 THEN
    change_details := array_to_string(changes, '; ');
    INSERT INTO public.sim_card_history (
      sim_card_id, event_type, old_value, new_value, changed_by, notes
    ) VALUES (
      NEW.id, 'field_edit',
      NULL, NULL,
      auth.uid(),
      change_details
    );
  END IF;

  RETURN NEW;
END;
$function$;