-- P9 Place Authority (Slice 1): `search_area` persisted Search Area identity.
--
-- Search Areas remain a separate Property Listify authority. They have a
-- separate identity namespace, explicit membership, and explicit authorized
-- journeys; they never become factual Places and never establish factual
-- containment (geography contract v0.5 Section 10).
--
-- `authorized_journeys` is explicit and mandatory, so membership can never
-- imply an executable journey. Lifecycle defaults to `preview` so a Search Area
-- is never active merely by existing.
CREATE TABLE `search_area` (
  `search_area_id` varchar(64) NOT NULL,
  `label` varchar(160) NOT NULL,
  `public_slug` varchar(120),
  `definition_version` varchar(32) NOT NULL,
  `lifecycle` enum('active','preview','disabled') NOT NULL DEFAULT 'preview',
  `authorized_journeys` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `search_area_id` PRIMARY KEY(`search_area_id`),
  CONSTRAINT `search_area_id_uq` UNIQUE(`search_area_id`),
  INDEX `idx_search_area_lifecycle` (`lifecycle`)
);
