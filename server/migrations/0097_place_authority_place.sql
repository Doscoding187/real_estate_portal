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
-- `search_scope` is a derived projection (D1, D12), never an independently
-- writable geographic fact. `chk_place_search_scope_derived_from_type` makes it a
-- deterministic function of `place_type`: a scope may be absent, but it may never
-- contradict the classification, and a type D1 gives no searchable scope may not
-- carry one. Its owner is the Place Authority materializer.
--
-- There is no succession column. Identity succession is expressed once, as an
-- evidenced `place_relationship` edge of type `succeeds`, because D9 requires a
-- continuity decision to state the disposition of every member identity and one
-- nullable column cannot express more than one member.
--
-- Additive. No existing table, resolver, or consumer is changed. No data.
CREATE TABLE `place` (
  `place_id` varchar(40) NOT NULL,
  `place_type` enum('province','district_municipality','local_municipality','city','town','township','suburb','neighbourhood','locality','village','estate','precinct','development','other') NOT NULL,
  `place_classification` enum('statutory','non_statutory') NOT NULL DEFAULT 'statutory',
  `verification_status` enum('candidate','provisional','verified') NOT NULL DEFAULT 'candidate',
  `lifecycle_status` enum('active','retired') NOT NULL DEFAULT 'active',
  `publication_eligible` int NOT NULL DEFAULT (0),
  `search_eligible` int NOT NULL DEFAULT (0),
  `search_scope` enum('province','metro_city','locality'),
  `licensing_classification` enum('mixed_odbl_supported','permissive_supported','osm_only_odbl_provisional'),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `place_place_id` PRIMARY KEY(`place_id`),
  CONSTRAINT `place_place_id_uq` UNIQUE(`place_id`),
  CONSTRAINT `chk_place_id_format` CHECK (
    `place_id` LIKE 'pl-place-01-%' AND CHAR_LENGTH(`place_id`) = 36
  ),
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
  CONSTRAINT `chk_place_search_scope_derived_from_type` CHECK (
    (`place_type` = 'province'
      AND (`search_scope` IS NULL OR `search_scope` = 'province'))
    OR (`place_type` IN ('city','town')
      AND (`search_scope` IS NULL OR `search_scope` = 'metro_city'))
    OR (`place_type` IN ('township','suburb','neighbourhood','locality','village')
      AND (`search_scope` IS NULL OR `search_scope` = 'locality'))
    OR (`place_type` IN ('district_municipality','local_municipality','estate','precinct','development','other')
      AND `search_scope` IS NULL)
  ),
  CONSTRAINT `chk_place_retired_not_eligible` CHECK (
    `lifecycle_status` <> 'retired' OR (`publication_eligible` = 0 AND `search_eligible` = 0)
  ),
  INDEX `idx_place_lifecycle` (`lifecycle_status`),
  INDEX `idx_place_type` (`place_type`),
  INDEX `idx_place_verification` (`verification_status`),
  INDEX `idx_place_search_eligible` (`search_eligible`,`lifecycle_status`)
);
