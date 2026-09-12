CREATE UNIQUE INDEX `uq_recently_viewed_user_listing`
ON `recently_viewed` (`userId`, `listingId`);
