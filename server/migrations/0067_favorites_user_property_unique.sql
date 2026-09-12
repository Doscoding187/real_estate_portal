CREATE UNIQUE INDEX `uq_favorites_user_property`
ON `favorites` (`user_id`, `property_id`);
