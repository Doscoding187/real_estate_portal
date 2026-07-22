-- Track who created a canonical showing for agency viewing ownership/auditability.

ALTER TABLE `showings`
  ADD COLUMN `createdByUserId` int NULL AFTER `visitorId`;

ALTER TABLE `showings`
  ADD INDEX `idx_showings_creator` (`createdByUserId`);

ALTER TABLE `showings`
  ADD CONSTRAINT `showings_createdByUserId_users_id_fk`
    FOREIGN KEY (`createdByUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL;
