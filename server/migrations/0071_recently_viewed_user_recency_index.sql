CREATE INDEX `idx_recently_viewed_user_viewed_at`
ON `recently_viewed` (`userId`, `viewedAt`);
