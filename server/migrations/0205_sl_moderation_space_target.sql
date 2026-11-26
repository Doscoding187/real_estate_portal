ALTER TABLE `sl_moderation_queue`
  ADD COLUMN `space_id` INT NULL,
  ADD COLUMN `subject_type` ENUM('residence','space') NOT NULL DEFAULT 'residence',
  ADD KEY `idx_sl_moderation_queue_subject` (`subject_type`,`space_id`,`action`),
  ADD CONSTRAINT `fk_sl_moderation_queue_space` FOREIGN KEY (`space_id`) REFERENCES `sl_spaces` (`id`) ON DELETE CASCADE;
