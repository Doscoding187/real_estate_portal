-- P9 Place Authority (Slice 1): `place_name` name assertions.
--
-- Names are assertions attached to a Place, never properties of identity (D8).
-- Roles may overlap on one assertion. A rename is a name-level fact and does not
-- mint a new Place (D9). Preferred public naming is a governed selection policy
-- over these recorded assertions, not a substitute for factual evidence and
-- never a side effect of ingestion or sort order.
--
-- `name_state` records whether the assertion is currently a valid statement of
-- the name, which is how superseded names are retained without being searchable.
CREATE TABLE `place_name` (
  `id` int AUTO_INCREMENT NOT NULL,
  `place_id` varchar(32) NOT NULL,
  `name` varchar(255) NOT NULL,
  `normalized_name` varchar(255) NOT NULL,
  `name_role` enum('preferred_public','official','common','historical','alternate_spelling','language_form') NOT NULL,
  `name_state` enum('active','superseded','withdrawn') NOT NULL DEFAULT 'active',
  `is_searchable` int NOT NULL DEFAULT (0),
  `evidence_source` varchar(64) NOT NULL,
  `valid_from` varchar(10),
  `valid_to` varchar(10),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `place_name_id` PRIMARY KEY(`id`),
  CONSTRAINT `place_name_place_role_name_uq` UNIQUE(`place_id`,`name_role`,`name`),
  CONSTRAINT `place_name_place_fk`
    FOREIGN KEY (`place_id`) REFERENCES `place`(`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_place_name_searchable_boolean` CHECK (
    `is_searchable` IN (0,1)
  ),
  CONSTRAINT `chk_place_name_inactive_not_searchable` CHECK (
    `name_state` = 'active' OR `is_searchable` = 0
  ),
  INDEX `idx_place_name_place` (`place_id`),
  INDEX `idx_place_name_normalized` (`normalized_name`,`is_searchable`),
  INDEX `idx_place_name_role` (`name_role`,`name_state`)
);
