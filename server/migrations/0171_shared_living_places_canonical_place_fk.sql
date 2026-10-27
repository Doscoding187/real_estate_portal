ALTER TABLE `sl_places`
  ADD CONSTRAINT `fk_sl_places_canonical_place`
  FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
