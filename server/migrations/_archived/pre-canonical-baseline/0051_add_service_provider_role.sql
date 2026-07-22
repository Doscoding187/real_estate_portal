ALTER TABLE `users`
  MODIFY COLUMN `role` enum(
    'visitor',
    'agent',
    'agency_admin',
    'property_developer',
    'service_provider',
    'super_admin'
  ) NOT NULL DEFAULT 'visitor';
