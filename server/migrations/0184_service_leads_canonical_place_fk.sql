ALTER TABLE `service_leads`
  ADD CONSTRAINT `service_leads_canonical_place_id_place_fk`
  FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
