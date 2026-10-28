ALTER TABLE `land_parcels`
  ADD CONSTRAINT `fk_land_parcels_canonical_place`
  FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
