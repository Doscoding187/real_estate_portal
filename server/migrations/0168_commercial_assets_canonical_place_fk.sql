ALTER TABLE `commercial_assets`
  ADD CONSTRAINT `fk_commercial_assets_canonical_place`
  FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
