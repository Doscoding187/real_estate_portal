/**
 * Canonical Place Authority (geography contract v0.5, Section 14).
 *
 * A Place is one durable geographic referent. Its identity is a stable, opaque
 * `place_id` that is assigned once, never reused, and is independent of names,
 * slugs, classification, parent/relationship assignment, boundary, preferred
 * public name, and lifecycle or publication state (D0).
 *
 * Identity dimensions are deliberately NOT collapsed into one status field
 * (D0, D3, D12):
 *   - `placeClassification`   statutory | non_statutory   (D4, D11)
 *   - `verificationStatus`    evidence standing of the referent (D2, D11)
 *   - `lifecycleStatus`       identity lifecycle (D9)
 *   - `publicationEligible`   may be published as public authority (D12)
 *   - `searchEligible`        may be resolved in public search (D12)
 *
 * Identity is anchored directly on the opaque `place_id` primary key. No
 * numeric surrogate is introduced: no consumer references one, every child
 * foreign key targets `place_id`, and an unused environment-local integer would
 * be a second identity-shaped column on the most authoritative table in the
 * system (D0).
 *
 * Slice 1 establishes the foundation and proves it through Database Authority.
 * It does not migrate any product consumer, retire the three-level runtime
 * tables, or change current runtime geography resolution.
 */

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';

/**
 * Durable, cross-environment Place identity.
 *
 * Format: `pl-place-01-<24 lowercase hex>`, e.g. `pl-place-01-9f2c1a4b7e0d3c5a8b1e6f40`.
 * 96 bits of entropy. Derived by the governed generator from evidence, never
 * from a name, slug, or database key. Immutable and never reused, including
 * after retirement, merge, or split (D0, D9).
 */
export const PLACE_ID_PATTERN = /^pl-place-01-[a-f0-9]{24}$/;

export function isPlaceId(value: unknown): value is string {
  return typeof value === 'string' && PLACE_ID_PATTERN.test(value);
}

/**
 * Governed Place classification (D0, D4).
 *
 * `statutory` values are the pre-existing factual geography vocabulary and are
 * carried forward unchanged so that a Place can hold any classification the
 * factual catalogue already uses without rewriting it.
 *
 * `non_statutory` values are the referents D4 admits (estate, precinct,
 * development). A non-statutory Place may only be published as public
 * geographic authority once its referent is sufficiently evidenced, which the
 * `publication_eligible` invariant below enforces mechanically.
 */
export const PLACE_CLASSIFICATIONS = ['statutory', 'non_statutory'] as const;

export type PlaceClassification = (typeof PLACE_CLASSIFICATIONS)[number];

/**
 * Place type. Values are the committed factual geography vocabulary
 * (`FACTUAL_GEOGRAPHY_TYPES` in `shared/factualRuntimeGeographyBridge.ts`)
 * plus the three non-statutory types D4 admits. No type is ever rewritten to
 * fit storage (Section 4, D0).
 */
export const PLACE_TYPES = [
  // Statutory / factual geography (carried forward unchanged)
  'province',
  'district_municipality',
  'local_municipality',
  'city',
  'town',
  'township',
  'suburb',
  'neighbourhood',
  'locality',
  'village',
  // Non-statutory referents admitted by D4
  'estate',
  'precinct',
  'development',
  // Explicit escape hatch for an evidenced referent outside the governed list
  'other',
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];

/**
 * Verification / evidence status (D2, D11). This is the evidence standing of
 * the referent, not its lifecycle and not its publication state.
 */
export const PLACE_VERIFICATION_STATUSES = ['candidate', 'provisional', 'verified'] as const;
export type PlaceVerificationStatus = (typeof PLACE_VERIFICATION_STATUSES)[number];

/**
 * Identity lifecycle (D9). Rename, reclassification, spelling change, parent
 * reassignment, boundary revision, source/licence change and tier change are
 * NOT lifecycle transitions and must not alter this value.
 */
export const PLACE_LIFECYCLE_STATUSES = ['active', 'retired'] as const;
export type PlaceLifecycleStatus = (typeof PLACE_LIFECYCLE_STATUSES)[number];

/**
 * Evidence and demand assertion kinds. Every signal lands here and never
 * creates public geographic authority directly (D11).
 */
export const PLACE_EVIDENCE_KINDS = [
  'source_record',
  'municipal_register',
  'parent_edge',
  'provider_observation',
  'commercial_submission',
  'search_demand',
  'unresolved_query',
  'ambiguous_query',
  'continuity_decision',
] as const;
export type PlaceEvidenceKind = (typeof PLACE_EVIDENCE_KINDS)[number];

export const PLACE_EVIDENCE_STATES = ['recorded', 'under_review', 'accepted', 'rejected'] as const;
export type PlaceEvidenceState = (typeof PLACE_EVIDENCE_STATES)[number];

/** Name assertion roles. Roles may overlap on one assertion (D8). */
export const PLACE_NAME_ROLES = [
  'preferred_public',
  'official',
  'common',
  'historical',
  'alternate_spelling',
  'language_form',
] as const;
export type PlaceNameRole = (typeof PLACE_NAME_ROLES)[number];

/** Whether a name assertion is currently a valid statement of the name (D8, D9). */
export const PLACE_NAME_STATES = ['active', 'superseded', 'withdrawn'] as const;
export type PlaceNameState = (typeof PLACE_NAME_STATES)[number];

/**
 * Typed relationship kinds (D10). Administrative containment, settlement
 * membership, market association and succession never share one generic
 * meaning, so they are distinct values here rather than one `parent` column.
 */
export const PLACE_RELATIONSHIP_TYPES = [
  'administratively_contains',
  'settlement_within',
  'market_association',
  'search_area_member',
  'succeeds',
  'preceded_by',
  'co_located_with',
] as const;
export type PlaceRelationshipType = (typeof PLACE_RELATIONSHIP_TYPES)[number];

/** Search Areas remain a separate Property Listify authority (contract Section 10). */
export const SEARCH_AREA_LIFECYCLES = ['active', 'preview', 'disabled'] as const;
export type SearchAreaLifecycle = (typeof SEARCH_AREA_LIFECYCLES)[number];

export const SEARCH_AREA_MEMBER_STATES = ['active', 'disputed', 'excluded'] as const;
export type SearchAreaMemberState = (typeof SEARCH_AREA_MEMBER_STATES)[number];

const placeIdColumn = (name = 'place_id') => varchar(name, { length: 32 });

export const place = mysqlTable(
  'place',
  {
    /** Durable cross-environment identity. Never an environment-local handle. */
    placeId: placeIdColumn().primaryKey(),
    placeType: mysqlEnum('place_type', PLACE_TYPES).notNull(),
    placeClassification: mysqlEnum('place_classification', PLACE_CLASSIFICATIONS)
      .default('statutory')
      .notNull(),
    verificationStatus: mysqlEnum('verification_status', PLACE_VERIFICATION_STATUSES)
      .default('candidate')
      .notNull(),
    lifecycleStatus: mysqlEnum('lifecycle_status', PLACE_LIFECYCLE_STATUSES)
      .default('active')
      .notNull(),
    publicationEligible: int('publication_eligible').default(0).notNull(),
    searchEligible: int('search_eligible').default(0).notNull(),
    /**
     * Derived search scope (D1, D12). `null` for a non-statutory or otherwise
     * unprojected referent: a Place is not required to be searchable, and a
     * scope is a projection, never identity.
     */
    searchScope: mysqlEnum('search_scope', ['province', 'metro_city', 'locality']),
    licensingClassification: mysqlEnum('licensing_classification', [
      'mixed_odbl_supported',
      'permissive_supported',
      'osm_only_odbl_provisional',
    ]),
    supersedesPlaceId: placeIdColumn('supersedes_place_id'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('place_place_id_uq').on(table.placeId),
    index('idx_place_lifecycle').on(table.lifecycleStatus),
    index('idx_place_type').on(table.placeType),
    index('idx_place_verification').on(table.verificationStatus),
    index('idx_place_search_eligible').on(table.searchEligible, table.lifecycleStatus),
    // Eligibility flags are booleans, not free integers.
    check('chk_place_publication_eligible_boolean', sql.raw('`publication_eligible` IN (0,1)')),
    check('chk_place_search_eligible_boolean', sql.raw('`search_eligible` IN (0,1)')),
    // A search scope is only meaningful for a live, verified, searchable referent.
    check(
      'chk_place_scope_requires_searchable',
      sql.raw(
        "`search_scope` IS NULL OR (`search_eligible` = 1 AND `lifecycle_status` = 'active')",
      ),
    ),
    // D11: a candidate never carries public authority.
    check(
      'chk_place_candidate_not_authoritative',
      sql.raw(
        "`verification_status` <> 'candidate' OR (`publication_eligible` = 0 AND `search_eligible` = 0)",
      ),
    ),
    // D4: a non-statutory referent must be sufficiently evidenced before it is
    // published as public geographic authority.
    check(
      'chk_place_non_statutory_requires_evidence',
      sql.raw("`place_classification` <> 'non_statutory' OR `verification_status` = 'verified'"),
    ),
    // D12: publication is a stricter subset of search eligibility.
    check(
      'chk_place_publication_implies_search',
      sql.raw('`publication_eligible` = 0 OR `search_eligible` = 1'),
    ),
    // D12: a retired referent carries no eligibility.
    check(
      'chk_place_retired_not_eligible',
      sql.raw(
        "`lifecycle_status` <> 'retired' OR (`publication_eligible` = 0 AND `search_eligible` = 0)",
      ),
    ),
  ],
);

export const placeName = mysqlTable(
  'place_name',
  {
    id: int('id').autoincrement().primaryKey(),
    placeId: placeIdColumn()
      .notNull()
      .references(() => place.placeId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 255 }).notNull(),
    nameRole: mysqlEnum('name_role', PLACE_NAME_ROLES).notNull(),
    nameState: mysqlEnum('name_state', PLACE_NAME_STATES).default('active').notNull(),
    isSearchable: int('is_searchable').default(0).notNull(),
    /** Provenance for the assertion. Never a provider identity becoming authority. */
    evidenceSource: varchar('evidence_source', { length: 64 }).notNull(),
    validFrom: varchar('valid_from', { length: 10 }),
    validTo: varchar('valid_to', { length: 10 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    // One assertion per role per place; roles may overlap, so this is not a
    // uniqueness constraint on name alone.
    unique('place_name_place_role_name_uq').on(table.placeId, table.nameRole, table.name),
    index('idx_place_name_place').on(table.placeId),
    // Alias lookup path used by discovery (D8, D12).
    index('idx_place_name_normalized').on(table.normalizedName, table.isSearchable),
    index('idx_place_name_role').on(table.nameRole, table.nameState),
    check('chk_place_name_searchable_boolean', sql.raw('`is_searchable` IN (0,1)')),
    // A superseded or withdrawn assertion is not a current searchable statement.
    check(
      'chk_place_name_inactive_not_searchable',
      sql.raw("`name_state` = 'active' OR `is_searchable` = 0"),
    ),
  ],
);

export const placeRelationship = mysqlTable(
  'place_relationship',
  {
    id: int('id').autoincrement().primaryKey(),
    fromPlaceId: placeIdColumn('from_place_id')
      .notNull()
      .references(() => place.placeId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    toPlaceId: placeIdColumn('to_place_id')
      .notNull()
      .references(() => place.placeId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    relationshipType: mysqlEnum('relationship_type', PLACE_RELATIONSHIP_TYPES).notNull(),
    /**
     * D12: only relationship types explicitly authorized for search scope may
     * affect an executable query boundary. Default 0 — a relationship existing
     * in the graph never widens search by default.
     */
    searchScopeAuthorized: int('search_scope_authorized').default(0).notNull(),
    /** D10: every relationship is evidenced. */
    evidenceSource: varchar('evidence_source', { length: 64 }).notNull(),
    validFrom: varchar('valid_from', { length: 10 }),
    validTo: varchar('valid_to', { length: 10 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('place_relationship_edge_uq').on(
      table.fromPlaceId,
      table.toPlaceId,
      table.relationshipType,
    ),
    index('idx_place_relationship_from').on(table.fromPlaceId, table.relationshipType),
    index('idx_place_relationship_to').on(table.toPlaceId, table.relationshipType),
    index('idx_place_relationship_search_authorized').on(
      table.relationshipType,
      table.searchScopeAuthorized,
    ),
    check(
      'chk_place_relationship_search_authorized_boolean',
      sql.raw('`search_scope_authorized` IN (0,1)'),
    ),
    // A referent cannot contain, succeed or precede itself.
    check('chk_place_relationship_no_self', sql.raw('`from_place_id` <> `to_place_id`')),
  ],
);

export const placeEvidence = mysqlTable(
  'place_evidence',
  {
    id: int('id').autoincrement().primaryKey(),
    /**
     * Nullable by design: an unresolved or ambiguous query is evidence with no
     * Place referent, and recording it must not require inventing a Place (D11).
     */
    placeId: placeIdColumn().references(() => place.placeId, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
    evidenceKind: mysqlEnum('evidence_kind', PLACE_EVIDENCE_KINDS).notNull(),
    evidenceState: mysqlEnum('evidence_state', PLACE_EVIDENCE_STATES).default('recorded').notNull(),
    /** Free-form subject of the assertion, e.g. the normalized query. */
    subject: varchar('subject', { length: 500 }),
    provider: varchar('provider', { length: 64 }),
    providerRecordId: varchar('provider_record_id', { length: 255 }),
    /** D11: signals raise research priority. They are never authority inputs. */
    researchPriority: int('research_priority').default(0).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index('idx_place_evidence_place').on(table.placeId, table.evidenceKind),
    index('idx_place_evidence_state').on(table.evidenceState),
    // Unresolved/ambiguous demand signals are the discovery input for the
    // next research wave, so they must be queryable without a Place.
    index('idx_place_evidence_unresolved').on(table.evidenceKind, table.evidenceState),
    index('idx_place_evidence_priority').on(table.researchPriority),
    check('chk_place_evidence_priority_boolean', sql.raw('`research_priority` IN (0,1)')),
    // A demand signal with no Place referent must say what it was.
    check(
      'chk_place_evidence_subject_when_unresolved',
      sql.raw('`place_id` IS NOT NULL OR `subject` IS NOT NULL'),
    ),
    // A provider assertion must name the provider that produced it.
    check(
      'chk_place_evidence_provider_named',
      sql.raw(
        "`evidence_kind` NOT IN ('provider_observation','commercial_submission') OR `provider` IS NOT NULL",
      ),
    ),
  ],
);

export const placeExternalMapping = mysqlTable(
  'place_external_mapping',
  {
    id: int('id').autoincrement().primaryKey(),
    placeId: placeIdColumn()
      .notNull()
      .references(() => place.placeId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    provider: varchar('provider', { length: 64 }).notNull(),
    providerRecordId: varchar('provider_record_id', { length: 255 }).notNull(),
    /** Raw provider display text. Provenance only; never identity (D3). */
    providerLabel: varchar('provider_label', { length: 255 }),
    normalizedAlias: varchar('normalized_alias', { length: 255 }),
    observedAt: timestamp('observed_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('place_external_mapping_provider_record_uq').on(table.provider, table.providerRecordId),
    index('idx_place_external_mapping_place').on(table.placeId),
    index('idx_place_external_mapping_alias').on(table.provider, table.normalizedAlias),
  ],
);

/**
 * Search Area: a Property Listify-owned market identity, never a factual Place
 * and never factual containment (contract Section 10). Separate identity
 * namespace, so it can never be mistaken for a `place_id`.
 */
export const searchArea = mysqlTable(
  'search_area',
  {
    searchAreaId: varchar('search_area_id', { length: 64 }).primaryKey(),
    label: varchar('label', { length: 160 }).notNull(),
    publicSlug: varchar('public_slug', { length: 120 }),
    definitionVersion: varchar('definition_version', { length: 32 }).notNull(),
    lifecycle: mysqlEnum('lifecycle', SEARCH_AREA_LIFECYCLES).default('preview').notNull(),
    /**
     * Journeys this Search Area may be executed for. Explicit, never inferred
     * from membership (D10, Section 10).
     */
    authorizedJourneys: varchar('authorized_journeys', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('search_area_id_uq').on(table.searchAreaId),
    index('idx_search_area_lifecycle').on(table.lifecycle),
  ],
);

export const searchAreaMember = mysqlTable(
  'search_area_member',
  {
    id: int('id').autoincrement().primaryKey(),
    searchAreaId: varchar('search_area_id', { length: 64 })
      .notNull()
      .references(() => searchArea.searchAreaId, { onDelete: 'cascade', onUpdate: 'restrict' }),
    placeId: placeIdColumn()
      .notNull()
      .references(() => place.placeId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    memberState: mysqlEnum('member_state', SEARCH_AREA_MEMBER_STATES).default('active').notNull(),
    evidenceSource: varchar('evidence_source', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  },
  table => [
    unique('search_area_member_uq').on(table.searchAreaId, table.placeId),
    index('idx_search_area_member_place').on(table.placeId),
    index('idx_search_area_member_state').on(table.searchAreaId, table.memberState),
  ],
);
