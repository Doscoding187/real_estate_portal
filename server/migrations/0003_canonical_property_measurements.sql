ALTER TABLE `properties`
  ADD COLUMN `internal_area_m2` decimal(14,2) NULL,
  ADD COLUMN `erf_size_m2` decimal(14,2) NULL,
  ADD COLUMN `land_area_m2` decimal(14,2) NULL;

CREATE INDEX `idx_properties_internal_area_m2` ON `properties` (`internal_area_m2`);

CREATE INDEX `idx_properties_erf_size_m2` ON `properties` (`erf_size_m2`);

CREATE INDEX `idx_properties_land_area_m2` ON `properties` (`land_area_m2`);
