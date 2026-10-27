ALTER TABLE `demand_campaigns`
  ADD CONSTRAINT `demand_campaigns_canonical_place_id_place_fk`
  FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
