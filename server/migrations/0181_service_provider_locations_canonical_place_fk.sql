ALTER TABLE `service_provider_locations`
  ADD CONSTRAINT `service_provider_locations_canonical_place_id_place_fk`
  FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
