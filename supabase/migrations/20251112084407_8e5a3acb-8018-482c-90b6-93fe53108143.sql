-- Create SIM card history table to track ownership changes
CREATE TABLE public.sim_card_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_card_id UUID NOT NULL,
  previous_user_id UUID NOT NULL,
  new_user_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.sim_card_history ENABLE ROW LEVEL SECURITY;

-- Super admins can view all history
CREATE POLICY "Super admins can view all SIM card history"
ON public.sim_card_history
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can insert history records
CREATE POLICY "Super admins can insert SIM card history"
ON public.sim_card_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_sim_card_history_sim_card_id ON public.sim_card_history(sim_card_id);
CREATE INDEX idx_sim_card_history_previous_user_id ON public.sim_card_history(previous_user_id);
CREATE INDEX idx_sim_card_history_new_user_id ON public.sim_card_history(new_user_id);