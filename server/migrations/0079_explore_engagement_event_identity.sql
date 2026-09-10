-- P8 analytics integrity: make browser engagement retries idempotent.
ALTER TABLE `explore_engagements`
  ADD COLUMN `event_id` varchar(64) NULL AFTER `id`;

ALTER TABLE `explore_engagements`
  ADD UNIQUE KEY `uq_explore_engagement_event_id` (`event_id`);
