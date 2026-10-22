-- A phase cannot be removed while canonical inventory is assigned to it.
ALTER TABLE `unit_types`
  ADD CONSTRAINT `unit_types_phase_id_development_phases_id_fk`
  FOREIGN KEY (`phase_id`) REFERENCES `development_phases` (`id`)
  ON DELETE RESTRICT ON UPDATE NO ACTION;
