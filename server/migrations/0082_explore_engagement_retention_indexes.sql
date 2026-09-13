-- P8 analytics retention and abuse review: bound session/user history scans by time.
ALTER TABLE `explore_engagements`
  ADD INDEX `idx_explore_engagements_session_created` (`session_id`, `created_at`),
  ADD INDEX `idx_explore_engagements_user_created` (`user_id`, `created_at`);
