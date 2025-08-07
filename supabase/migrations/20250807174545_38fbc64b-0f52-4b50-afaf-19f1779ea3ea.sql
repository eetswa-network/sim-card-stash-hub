-- Add recent app updates to showcase the new features implemented

INSERT INTO public.app_updates (
  title,
  description,
  update_type,
  version,
  is_active
) VALUES 
(
  'New Statistics Dashboard',
  'Added a comprehensive statistics page with interactive pie charts showing SIM card status distribution and carrier breakdown. The new page includes visual charts for better data insights and a detailed summary table with improved formatting and column separators.',
  'feature',
  '2.4.0',
  true
),
(
  'Enhanced SIM Card Grid View',
  'Improved the grid view layout with phone numbers as titles, SIM type icons positioned before SIM numbers, and reorganized status/carrier information for better visual hierarchy. Updated the card layout to show phone numbers prominently with proper icon placement.',
  'improvement',
  '2.3.0',
  true
),
(
  'Password Display Enhancement',
  'Password fields now show the exact number of bullet characters matching the password length, and the show/hide password checkbox has been moved to the same line as the password for better space utilization across all views (grid, mobile, and desktop).',
  'improvement',
  '2.2.0',
  true
),
(
  'Expired SIM Card Support',
  'Added full support for "expired" SIM card status including database schema updates, visual indicators with crossed-out text for expired cards, proper search functionality, and consistent styling across all view modes.',
  'feature',
  '2.1.0',
  true
),
(
  'Account Page SIM Summary',
  'Previously added a summary table on the account details page showing total counts of SIM cards by status (active, inactive, expired) with percentages and visual indicators. This feature has now been moved to the dedicated Statistics page.',
  'feature',
  '2.0.0',
  false
),
(
  'Database Stability Improvements',
  'Fixed critical database insertion issues related to UUID validation for account_id fields and improved error handling for SIM card creation forms.',
  'bugfix',
  '1.9.1',
  true
);