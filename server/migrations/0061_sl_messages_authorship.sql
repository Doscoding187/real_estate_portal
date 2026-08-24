ALTER TABLE `sl_messages`
  ADD COLUMN `author_kind` ENUM('consumer','lister','moderator') NOT NULL DEFAULT 'consumer' AFTER `lead_id`,
  MODIFY COLUMN `sender_user_id` INT NULL;
