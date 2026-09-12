-- A recent-view row is updated on revisits, so strict consumer recency needs
-- durable sub-second precision rather than an incidental row-ID tie breaker.
ALTER TABLE `recently_viewed`
  MODIFY COLUMN `viewedAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
