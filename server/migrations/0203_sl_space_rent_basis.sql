ALTER TABLE `sl_space_availability`
  ADD COLUMN `rent_basis` ENUM('per_space','per_person') NOT NULL DEFAULT 'per_space';
