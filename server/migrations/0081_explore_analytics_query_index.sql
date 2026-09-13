-- P8 analytics performance: support period-filtered engagement aggregates and content joins.
ALTER TABLE `explore_engagements`
  ADD INDEX `idx_explore_engagements_created_content` (`created_at`, `content_id`);
