-- P9 Place Authority (Slice 1): `search_area_member` explicit membership.
--
-- Membership is explicit, evidenced, and belongs to the Search Area authority
-- only. A membership row is never factual containment and never creates or
-- implies a Place relationship (Section 10). The Place reference is restrictive
-- so a Place can never be removed out from under an active membership.
CREATE TABLE `search_area_member` (
  `id` int AUTO_INCREMENT NOT NULL,
  `search_area_id` varchar(64) NOT NULL,
  `place_id` varchar(32) NOT NULL,
  `member_state` enum('active','disputed','excluded') NOT NULL DEFAULT 'active',
  `evidence_source` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `search_area_member_id` PRIMARY KEY(`id`),
  CONSTRAINT `search_area_member_uq` UNIQUE(`search_area_id`,`place_id`),
  CONSTRAINT `search_area_member_area_fk`
    FOREIGN KEY (`search_area_id`) REFERENCES `search_area`(`search_area_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `search_area_member_place_fk`
    FOREIGN KEY (`place_id`) REFERENCES `place`(`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  INDEX `idx_search_area_member_place` (`place_id`),
  INDEX `idx_search_area_member_state` (`search_area_id`,`member_state`)
);
