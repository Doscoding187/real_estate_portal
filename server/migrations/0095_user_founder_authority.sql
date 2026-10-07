-- Nullable for every ordinary account; only genuine founder authentication may claim this authority.
ALTER TABLE `users` ADD COLUMN `founder_authority` enum('platform_founder') NULL;
