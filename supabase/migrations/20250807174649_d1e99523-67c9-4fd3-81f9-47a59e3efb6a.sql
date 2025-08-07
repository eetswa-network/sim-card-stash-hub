-- Add SIM swap feature update

INSERT INTO public.app_updates (
  title,
  description,
  update_type,
  version,
  is_active
) VALUES 
(
  'SIM Swap Functionality',
  'Introduced SIM swap feature that allows users to easily replace their current SIM card while preserving all account information and usage data. When performing a SIM swap, the current SIM card is automatically deactivated and a new SIM card record is created with the same phone number, carrier, account details, and usage history. The new SIM card starts with an empty SIM number field that can be updated once the new physical SIM is received.',
  'feature',
  '2.5.0',
  true
);