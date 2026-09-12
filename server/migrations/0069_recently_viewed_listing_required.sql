-- Pre-launch consumer activity has one canonical subject: an authored listing.
ALTER TABLE `recently_viewed`
  MODIFY COLUMN `listingId` int NOT NULL;
