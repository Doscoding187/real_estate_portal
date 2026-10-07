-- The one canonical user row owns founder identity; concurrent first creation cannot commit two owners.
CREATE UNIQUE INDEX `users_founder_authority_unique` ON `users` (`founder_authority`);
