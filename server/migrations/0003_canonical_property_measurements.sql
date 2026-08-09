ALTER TABLE `properties`
  ADD COLUMN `internal_area_m2` decimal(14,2) NULL,
  ADD COLUMN `erf_size_m2` decimal(14,2) NULL,
  ADD COLUMN `land_area_m2` decimal(14,2) NULL,
  ADD INDEX `idx_properties_internal_area_m2` (`internal_area_m2`),
  ADD INDEX `idx_properties_erf_size_m2` (`erf_size_m2`),
  ADD INDEX `idx_properties_land_area_m2` (`land_area_m2`);
