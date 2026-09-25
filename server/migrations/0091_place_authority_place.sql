-- P9 Place Authority (Slice 1): the canonical `place` table.
--
-- One row is one durable geographic referent. `place_id` is the stable, opaque,
-- cross-environment identity (format `pl-place-01-<24 hex>`), assigned once and
-- never reused, and independent of names, slugs, classification, parent or
-- relationship assignment, boundary, preferred public name, and lifecycle or
-- publication state (geography contract v0.5 D0).
--
-- The auto-increment `id` is an environment-local join handle only. It is never
-- geographic authority and is never copied between environments, exactly as the
-- existing province/city/suburb numeric handles are treated.
--
-- Identity dimensions are deliberately not collapsed into one status column
-- (D0, D12): classification, verification, lifecycle, publication eligibility
-- and search eligibility are distinct recorded facts. The CHECK constraints
-- encode only invariants the contract states explicitly, so impossible
-- combinations are rejected by the database rather than by convention.
--
-- Additive. No existing table, resolver, or consumer is changed. No data.
CREATE TABLE `place` (
  `place_id` varchar(32) NOT NULL,
  `place_type` enum('province','district_municipality','local_municipality','city','town','township','suburb','neighbourhood','locality','village','estate','precinct','development','other') NOT NULL,
  `place_classification` enum('statutory','non_statutory') NOT NULL DEFAULT 'statutory',
  `verification_status` enum('candidate','provisional','verified') NOT NULL DEFAULT 'candidate',
  `lifecycle_status` enum('active','retired') NOT NULL DEFAULT 'active',
  `publication_eligible` int NOT NULL DEFAULT (0),
  `search_eligible` int NOT NULL DEFAULT (0),
  `search_scope` enum('province','metro_city','locality'),
  `licensing_classification` enum('mixed_odbl_supported','permissive_supported','osm_only_odbl_provisional'),
  `supersedes_place_id` varchar(32),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `place_place_id` PRIMARY KEY(`place_id`),
  CONSTRAINT `place_place_id_uq` UNIQUE(`place_id`),
  CONSTRAINT `chk_place_publication_eligible_boolean` CHECK (
    `publication_eligible` IN (0,1)
  ),
  CONSTRAINT `chk_place_search_eligible_boolean` CHECK (
    `search_eligible` IN (0,1)
  ),
  CONSTRAINT `chk_place_scope_requires_searchable` CHECK (
    `search_scope` IS NULL OR (`search_eligible` = 1 AND `lifecycle_status` = 'active')
  ),
  CONSTRAINT `chk_place_candidate_not_authoritative` CHECK (
    `verification_status` <> 'candidate' OR (`publication_eligible` = 0 AND `search_eligible` = 0)
  ),
  CONSTRAINT `chk_place_non_statutory_requires_evidence` CHECK (
    `place_classification` <> 'non_statutory' OR `verification_status` = 'verified'
  ),
  CONSTRAINT `chk_place_publication_implies_search` CHECK (
    `publication_eligible` = 0 OR `search_eligible` = 1
  ),
  CONSTRAINT `chk_place_retired_not_eligible` CHECK (
    `lifecycle_status` <> 'retired' OR (`publication_eligible` = 0 AND `search_eligible` = 0)
  ),
  INDEX `idx_place_lifecycle` (`lifecycle_status`),
  INDEX `idx_place_type` (`place_type`),
  INDEX `idx_place_verification` (`verification_status`),
  INDEX `idx_place_search_eligible` (`search_eligible`,`lifecycle_status`)
);
