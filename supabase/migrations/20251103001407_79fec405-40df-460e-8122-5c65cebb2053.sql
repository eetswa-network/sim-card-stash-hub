-- Delete duplicate app update entries (keeping the first of each pair)
DELETE FROM app_updates WHERE id IN (
  '65957f22-16ae-4d2e-ad27-9f1b84268849',
  '96060db6-afe5-4df0-9a9e-225ed1f2bdf9',
  'adf84741-081d-4f57-b4e3-50280e8800fb',
  'f9ea648b-3f7c-4aa8-bae8-d18f9dd8384f',
  '8ea2e1b5-9f75-489d-8fab-309778a62b82',
  'd4573575-f82c-463f-a3b5-984cb7698ba7',
  '58c5b232-4332-4005-9498-0b7ba68c7d73'
);