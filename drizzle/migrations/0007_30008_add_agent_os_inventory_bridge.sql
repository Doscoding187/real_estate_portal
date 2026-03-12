ALTER TABLE `properties`
  ADD COLUMN `sourceListingId` int NULL;
--> statement-breakpoint

ALTER TABLE `properties`
  ADD INDEX `idx_properties_sourceListingId` (`sourceListingId`);
--> statement-breakpoint

ALTER TABLE `properties`
  ADD CONSTRAINT `fk_properties_sourceListingId`
    FOREIGN KEY (`sourceListingId`) REFERENCES `listings`(`id`)
    ON DELETE SET NULL;
--> statement-breakpoint

UPDATE `properties` p
JOIN (
  SELECT `ownerId`, `title`, `address`, MAX(`id`) AS `listingId`
  FROM `listings`
  GROUP BY `ownerId`, `title`, `address`
) l
  ON l.`ownerId` = p.`ownerId`
 AND l.`title` = p.`title`
 AND l.`address` = p.`address`
SET p.`sourceListingId` = l.`listingId`
WHERE p.`sourceListingId` IS NULL;
