DELETE FROM `recently_viewed`
WHERE `listingId` IS NULL
   OR `id` NOT IN (
     SELECT `id`
     FROM (
       SELECT
         `id`,
         ROW_NUMBER() OVER (
           PARTITION BY `userId`, `listingId`
           ORDER BY `viewedAt` DESC, `id` DESC
         ) AS `row_number`
       FROM `recently_viewed`
       WHERE `listingId` IS NOT NULL
     ) AS `ranked`
     WHERE `row_number` = 1
   );
