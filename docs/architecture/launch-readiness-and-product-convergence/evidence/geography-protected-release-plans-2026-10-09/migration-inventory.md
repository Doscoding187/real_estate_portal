# Ordered schema transitions from merge 49a48572

Target fingerprint: `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.

Fresh plan digest: `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d`.

15 migrations, 15 statements, exact accepted old head 0096 and expected new head 0111. No application is authorized by this inventory.

## 0097_place_authority_place.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `eea3a79c694d49f9668b24817d9c5b8108b8c1b1bf0a102c162af97f0e90d703`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0097_place_authority_place.sql)

```sql
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
```

## 0098_place_authority_place_name.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `95e305184f82d8ccbb830d7009a9091f50ad8511b1332507e9601bc9f02da02b`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0098_place_authority_place_name.sql)

```sql
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
  `place_id` varchar(40) NOT NULL,
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
```

## 0099_place_authority_place_relationship.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `8275e78ba10916537732eb1bea7f49d7c63177a402c50f331d5ccbcffbe77202`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0099_place_authority_place_relationship.sql)

```sql
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
--
-- The vocabulary is deliberately five types. `preceded_by` is absent because it
-- is the inverse of `succeeds` and is derived by reversing a `succeeds` edge;
-- storing both directions would give one fact two writable authorities.
-- `search_area_member` is absent because the `search_area_member` table is the
-- single authority for Search Area membership, and a Place relationship must
-- never restate it.
--
-- `administratively_contains` and `settlement_within` are NOT inverses of one
-- another. A referent may be administratively within one municipality and
-- understood as settled within another, so the two are separate assertions and
-- neither may be derived from the other.
CREATE TABLE `place_relationship` (
  `id` int AUTO_INCREMENT NOT NULL,
  `from_place_id` varchar(40) NOT NULL,
  `to_place_id` varchar(40) NOT NULL,
  `relationship_type` enum('administratively_contains','settlement_within','market_association','succeeds','co_located_with') NOT NULL,
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
```

## 0100_place_authority_place_evidence.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `d9c39faff56bca01399f46601bcd54875e66a5734093709287c5a14bb0d913a4`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0100_place_authority_place_evidence.sql)

```sql
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
```

## 0101_place_authority_place_external_mapping.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `703fa916a67899940d04e3d51123dd2b20f6c8d7f14d87b81da5a76942b4a05d`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0101_place_authority_place_external_mapping.sql)

```sql
-- P9 Place Authority (Slice 1): `place_external_mapping` provider observations.
--
-- Provider data is evidence and enrichment only. A provider place ID or label can
-- never become public identity (D3), so this table records observations against
-- an existing Place and holds no eligibility or authority columns of its own.
CREATE TABLE `place_external_mapping` (
  `id` int AUTO_INCREMENT NOT NULL,
  `place_id` varchar(40) NOT NULL,
  `provider` varchar(64) NOT NULL,
  `provider_record_id` varchar(255) NOT NULL,
  `provider_label` varchar(255),
  `normalized_alias` varchar(255),
  `observed_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `place_external_mapping_id` PRIMARY KEY(`id`),
  CONSTRAINT `place_external_mapping_provider_record_uq` UNIQUE(`provider`,`provider_record_id`),
  CONSTRAINT `place_external_mapping_place_fk`
    FOREIGN KEY (`place_id`) REFERENCES `place`(`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  INDEX `idx_place_external_mapping_place` (`place_id`),
  INDEX `idx_place_external_mapping_alias` (`provider`,`normalized_alias`)
);
```

## 0102_place_authority_search_area.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `5f598cf793ca29003767ad976a512dfa50a65e8cbf0ae2250848c482e8624542`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0102_place_authority_search_area.sql)

```sql
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
```

## 0103_place_authority_search_area_member.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `0e0650eb710ea6d49267432af42aebf2fb3c91a1d53187c4aae8b3e50db67fe3`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0103_place_authority_search_area_member.sql)

```sql
-- P9 Place Authority (Slice 1): `search_area_member` explicit membership.
--
-- Membership is explicit, evidenced, and belongs to the Search Area authority
-- only. A membership row is never factual containment and never creates or
-- implies a Place relationship (Section 10). The Place reference is restrictive
-- so a Place can never be removed out from under an active membership.
CREATE TABLE `search_area_member` (
  `id` int AUTO_INCREMENT NOT NULL,
  `search_area_id` varchar(64) NOT NULL,
  `place_id` varchar(40) NOT NULL,
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
```

## 0104_saved_searches_canonical_place_reference.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `21babcf0b3823a4cac98fa35174df0e628f8afc0db2ae29eadb02ecc624e6859`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0104_saved_searches_canonical_place_reference.sql)

```sql
-- P10 Place Authority (Slice 3): one additive persisted canonical reference.
--
-- A saved search is the existing, already-governed home of a versioned geographic
-- query intent (geography contract v0.5 Section 15). It is a consumer of
-- geography, not an authority over it, so holding one canonical Place reference
-- here cannot make it a second geography authority.
--
-- The column is nullable, so no existing row is rewritten and no data migration
-- is required. When it is present it is the *sole* geographic authority for that
-- saved search: the legacy geography fields inside `criteria` are not consulted
-- for geography, and a save that supplies both a canonical Place and competing
-- legacy geography text is rejected by the caller rather than merged. That is the
-- explicit precedence contract, not a silent fallback.
--
-- The width matches the canonical `place.place_id` (40) so a valid Place id can
-- never be truncated on the way in.
--
-- ON DELETE RESTRICT, consistent with Place identity immutability: a Place can
-- never be removed out from under a saved search.
--
-- The column and its foreign key are added as two separate DDL statements. TiDB
-- refuses a single ALTER that both introduces a column and adds a dependent
-- constraint, and the physical column is appended at the end of the table, so
-- the Drizzle model declares `place_id` last to keep the ordinals congruent.

ALTER TABLE `saved_searches`
  ADD COLUMN `place_id` varchar(40) NULL;
```

## 0105_saved_searches_canonical_place_reference_fk.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `27098ecba5c8bee31f314ccb47ea694bdcfaeff81870f6506264877b2bb30583`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0105_saved_searches_canonical_place_reference_fk.sql)

```sql
-- P10 Place Authority (Slice 3): the foreign key for the saved-search Place
-- reference, sequenced after 0098.
--
-- TiDB refuses a single ALTER that both introduces a column and adds a dependent
-- constraint, and the canonical migration manifest requires exactly one statement
-- per incremental DDL migration, so the column and its key are two migrations.
-- Splitting them keeps each migration single-statement and reversible in
-- isolation, and keeps the physical column appended at the end of the table, which
-- is why the Drizzle model declares `place_id` last.
--
-- ON DELETE RESTRICT, consistent with Place identity immutability: a Place can
-- never be removed out from under a saved search.
ALTER TABLE `saved_searches`
  ADD CONSTRAINT `saved_searches_place_id_fk`
    FOREIGN KEY (`place_id`) REFERENCES `place` (`place_id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;
```

## 0106_listings_canonical_place_reference.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `d116f8010581c5c24152e2ff10817cea4c6ad3156623bae268bc2b4fe80b15e0`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0106_listings_canonical_place_reference.sql)

```sql
-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
ALTER TABLE `listings` ADD COLUMN `canonical_place_id` varchar(40) NULL;
```

## 0107_listings_canonical_place_reference_index.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `d65369ef2a759231540d70367945a74baee5e2ed5f00d6ed7d88ae0185e9c0b9`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0107_listings_canonical_place_reference_index.sql)

```sql
-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
CREATE INDEX `idx_listings_canonical_place_id` ON `listings` (`canonical_place_id`);
```

## 0108_listings_canonical_place_reference_fk.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `c2c14940fc7a15681adafaee85a426a5ad4d32a0e245a5ea1f0d2bdbd9f845f6`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0108_listings_canonical_place_reference_fk.sql)

```sql
-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
ALTER TABLE `listings` ADD CONSTRAINT `listings_canonical_place_id_place_place_id_fk` FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
```

## 0109_properties_canonical_place_reference.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `05fff766bd53e77252497d54cd253e60ea56b3ad0ba11c91027da27c2edf2d2e`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0109_properties_canonical_place_reference.sql)

```sql
-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
ALTER TABLE `properties` ADD COLUMN `canonical_place_id` varchar(40) NULL;
```

## 0110_properties_canonical_place_reference_index.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `4b5750bb9ef30a64fd27e6acae3f436504f7e0719d148dadf3131e4b21b4fa3f`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0110_properties_canonical_place_reference_index.sql)

```sql
-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
CREATE INDEX `idx_properties_canonical_place_id` ON `properties` (`canonical_place_id`);
```

## 0111_properties_canonical_place_reference_fk.sql

Kind: `ddl`. Statement count: `1`. SHA-256: `2ce21151b1793e94436d3018da62aa730a950409b25dbab9cb68893ec530926b`.

[Canonical source](https://github.com/Doscoding187/real_estate_portal/blob/49a48572c24d1b122fcf17b025a76e5ab77f03a8/server/migrations/0111_properties_canonical_place_reference_fk.sql)

```sql
-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
ALTER TABLE `properties` ADD CONSTRAINT `properties_canonical_place_id_place_place_id_fk` FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
```
