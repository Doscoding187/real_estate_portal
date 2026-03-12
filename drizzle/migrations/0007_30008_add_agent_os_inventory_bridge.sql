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

ALTER TABLE `showings`
  ADD COLUMN `propertyId` int NULL;
--> statement-breakpoint

ALTER TABLE `showings`
  ADD COLUMN `leadId` int NULL;
--> statement-breakpoint

ALTER TABLE `showings`
  MODIFY COLUMN `propertyId` int NULL;
--> statement-breakpoint

ALTER TABLE `showings`
  MODIFY COLUMN `leadId` int NULL;
--> statement-breakpoint

ALTER TABLE `showings`
  ADD INDEX `idx_showings_propertyId` (`propertyId`);
--> statement-breakpoint

ALTER TABLE `showings`
  ADD INDEX `idx_showings_leadId` (`leadId`);
--> statement-breakpoint

ALTER TABLE `showings`
  ADD CONSTRAINT `fk_showings_propertyId`
    FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`)
    ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE `showings`
  ADD CONSTRAINT `fk_showings_leadId`
    FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`)
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
--> statement-breakpoint

UPDATE `showings` s
JOIN `properties` p
  ON p.`sourceListingId` = s.`listingId`
SET s.`propertyId` = p.`id`
WHERE s.`propertyId` IS NULL;
