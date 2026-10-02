-- P9 Place Authority (Slice 1): `place_evidence` evidence and demand signals.
--
-- Every evidence assertion lands here, and none of them creates public
-- geographic authority directly (D11). Search demand, provider suggestions and
-- commercial submissions raise research priority only; a high search count is
-- never an evidence class.
--
-- `place_id` is nullable by design: an unresolved or ambiguous query is
-- evidence with no Place referent, and recording it must never require
-- inventing a Place. `chk_place_evidence_subject_when_unresolved` requires such
-- a signal to carry the query subject so it is actionable as research input.
CREATE TABLE `place_evidence` (
  `id` int AUTO_INCREMENT NOT NULL,
  `place_id` varchar(40),
  `evidence_kind` enum('source_record','municipal_register','parent_edge','provider_observation','commercial_submission','search_demand','unresolved_query','ambiguous_query','continuity_decision') NOT NULL,
  `evidence_state` enum('recorded','under_review','accepted','rejected') NOT NULL DEFAULT 'recorded',
  `subject` varchar(500),
  `provider` varchar(64),
  `provider_record_id` varchar(255),
  `research_priority` int NOT NULL DEFAULT (0),
  `note` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `place_evidence_id` PRIMARY KEY(`id`),
  CONSTRAINT `place_evidence_place_fk`
    FOREIGN KEY (`place_id`) REFERENCES `place`(`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_place_evidence_priority_boolean` CHECK (
    `research_priority` IN (0,1)
  ),
  CONSTRAINT `chk_place_evidence_subject_when_unresolved` CHECK (
    `place_id` IS NOT NULL OR `subject` IS NOT NULL
  ),
  CONSTRAINT `chk_place_evidence_provider_named` CHECK (
    `evidence_kind` NOT IN ('provider_observation','commercial_submission') OR `provider` IS NOT NULL
  ),
  INDEX `idx_place_evidence_place` (`place_id`,`evidence_kind`),
  INDEX `idx_place_evidence_state` (`evidence_state`),
  INDEX `idx_place_evidence_unresolved` (`evidence_kind`,`evidence_state`),
  INDEX `idx_place_evidence_priority` (`research_priority`)
);
