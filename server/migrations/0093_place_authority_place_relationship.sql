-- P9 Place Authority (Slice 1): `place_relationship` typed evidenced edges.
--
-- Administrative containment, settlement membership, market association and
-- succession are distinct relationship types and never share one ambiguous
-- generic meaning (D10). Every edge is evidenced, so `evidence_source` is
-- mandatory.
--
-- `search_scope_authorized` defaults to 0: a relationship that exists in the
-- graph has no effect on an executable query boundary unless its type is
-- explicitly authorized (D12). Relationships are not automatically search
-- expansion. Storage is relational; no graph database is adopted (D10).
CREATE TABLE `place_relationship` (
  `id` int AUTO_INCREMENT NOT NULL,
  `from_place_id` varchar(32) NOT NULL,
  `to_place_id` varchar(32) NOT NULL,
  `relationship_type` enum('administratively_contains','settlement_within','market_association','search_area_member','succeeds','preceded_by','co_located_with') NOT NULL,
  `search_scope_authorized` int NOT NULL DEFAULT (0),
  `evidence_source` varchar(64) NOT NULL,
  `valid_from` varchar(10),
  `valid_to` varchar(10),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `place_relationship_id` PRIMARY KEY(`id`),
  CONSTRAINT `place_relationship_edge_uq` UNIQUE(`from_place_id`,`to_place_id`,`relationship_type`),
  CONSTRAINT `place_relationship_from_fk`
    FOREIGN KEY (`from_place_id`) REFERENCES `place`(`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `place_relationship_to_fk`
    FOREIGN KEY (`to_place_id`) REFERENCES `place`(`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_place_relationship_search_authorized_boolean` CHECK (
    `search_scope_authorized` IN (0,1)
  ),
  CONSTRAINT `chk_place_relationship_no_self` CHECK (
    `from_place_id` <> `to_place_id`
  ),
  INDEX `idx_place_relationship_from` (`from_place_id`,`relationship_type`),
  INDEX `idx_place_relationship_to` (`to_place_id`,`relationship_type`),
  INDEX `idx_place_relationship_search_authorized` (`relationship_type`,`search_scope_authorized`)
);
