-- Insert recent app updates
INSERT INTO app_updates (title, description, update_type, version, is_active)
VALUES 
  ('2FA Login Fix', 'Fixed an issue where two-step authentication was not working correctly on the published site. Users can now complete MFA verification without session interruption.', 'bugfix', NULL, true),
  ('New User Experience Improvement', 'Added an "Add SIM Card" button to the empty state view, making it easier for new users to add their first SIM card.', 'improvement', NULL, true);