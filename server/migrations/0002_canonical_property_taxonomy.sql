ALTER TABLE `listings`
  MODIFY COLUMN `propertyType` enum('apartment','house','townhouse','cluster_home','farm','plot','land','commercial','shared_living') NOT NULL;
