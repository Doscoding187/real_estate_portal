ALTER TABLE `developments` ADD CONSTRAINT `developments_canonical_place_id_place_fk` FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
