-- Update all inactive SIM cards to swapped status
UPDATE sim_cards SET status = 'swapped' WHERE status = 'inactive';