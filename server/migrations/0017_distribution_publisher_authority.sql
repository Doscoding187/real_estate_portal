ALTER TABLE `distribution_brand_partnerships`
  MODIFY COLUMN `brand_profile_id` int NULL,
  ADD UNIQUE KEY `ux_distribution_brand_partnerships_publisher` (`catalogue_publisher_id`);
