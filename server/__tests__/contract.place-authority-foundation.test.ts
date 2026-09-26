import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getTableName } from 'drizzle-orm';
import { normalizedDesiredSchema } from '../_core/databaseAuthority/schemaCongruency';
import * as canonical from '../../drizzle/schema';
import {
  PLACE_CLASSIFICATIONS,
  PLACE_EVIDENCE_KINDS,
  PLACE_ID_PATTERN,
  PLACE_LIFECYCLE_STATUSES,
  PLACE_NAME_ROLES,
  PLACE_NAME_STATES,
  PLACE_RELATIONSHIP_SEARCH_AUTHORIZED_TYPES,
  PLACE_RELATIONSHIP_TYPES,
  PLACE_TYPES,
  PLACE_VERIFICATION_STATUSES,
  SEARCH_AREA_LIFECYCLES,
  SEARCH_AREA_MEMBER_STATES,
  isPlaceId,
  place,
  placeEvidence,
  placeExternalMapping,
  placeName,
  placeRelationship,
  searchArea,
  searchAreaMember,
} from '../../drizzle/schema/placeAuthority';
import { FACTUAL_GEOGRAPHY_TYPES } from '../../shared/factualRuntimeGeographyBridge';

/**
 * Slice 1 executable protection for the Place Authority doctrine recorded in
 * `docs/architecture/geography-coverage-contract.md` v0.5.
 *
 * These tests assert doctrine, not implementation convenience. A test here may
 * only be relaxed by a recorded contract revision (Section 8 of that contract
 * requires a version bump for any Section 2 decision change).
 */

const PLACE_AUTHORITY_TABLES = [
  'place',
  'place_name',
  'place_relationship',
  'place_evidence',
  'place_external_mapping',
  'search_area',
  'search_area_member',
] as const;

const MIGRATIONS = [
  '0091_place_authority_place.sql',
  '0092_place_authority_place_name.sql',
  '0093_place_authority_place_relationship.sql',
  '0094_place_authority_place_evidence.sql',
  '0095_place_authority_place_external_mapping.sql',
  '0096_place_authority_search_area.sql',
  '0097_place_authority_search_area_member.sql',
] as const;

function migrationSql(filename: string): string {
  return readFileSync(`server/migrations/${filename}`, 'utf8');
}

/** Invariants the contract states explicitly, and that the database must enforce. */
const CONTRACT_CHECKS: Record<string, readonly string[]> = {
  place: [
    'chk_place_publication_eligible_boolean',
    'chk_place_search_eligible_boolean',
    'chk_place_scope_requires_searchable',
    'chk_place_candidate_not_authoritative',
    'chk_place_non_statutory_requires_evidence',
    'chk_place_publication_implies_search',
    'chk_place_retired_not_eligible',
    'chk_place_search_scope_derived_from_type',
    'chk_place_id_format',
  ],
  place_name: ['chk_place_name_searchable_boolean', 'chk_place_name_inactive_not_searchable'],
  place_relationship: [
    'chk_place_relationship_search_authorized_boolean',
    'chk_place_relationship_no_self',
  ],
  place_evidence: [
    'chk_place_evidence_priority_boolean',
    'chk_place_evidence_subject_when_unresolved',
    'chk_place_evidence_provider_named',
  ],
  place_external_mapping: [],
  search_area: [],
  search_area_member: [],
};

describe('Place Authority: canonical model surface', () => {
  it('introduces exactly the seven approved V1 tables and nothing else', () => {
    // Contract v0.5 Section 14 approves exactly seven concepts. A table added
    // "merely for architectural elegance" is a contract violation, so the
    // approved set is pinned here rather than derived.
    const declared = [
      getTableName(place),
      getTableName(placeName),
      getTableName(placeRelationship),
      getTableName(placeEvidence),
      getTableName(placeExternalMapping),
      getTableName(searchArea),
      getTableName(searchAreaMember),
    ];
    expect(declared).toEqual([...PLACE_AUTHORITY_TABLES]);
    expect(new Set(declared).size).toBe(7);
  });

  it('anchors Place identity on a stable opaque id, never an environment-local handle', () => {
    // D0: identity is stable, opaque, assigned once, never reused, and is not
    // an environment-specific numeric key.
    const placeColumns = Object.getOwnPropertyDescriptors(place);
    expect(place.placeId.primary).toBe(true);
    expect(place.placeId.name).toBe('place_id');
    // No numeric surrogate is introduced. An unused environment-local integer
    // would be a second identity-shaped column on the most authoritative table,
    // which D0 forbids. Identity is the opaque `place_id` and nothing else.
    expect(placeColumns.id, 'place must not carry a numeric surrogate').toBeUndefined();
    expect(
      Object.getOwnPropertyDescriptors(searchArea).id,
      'search_area must not carry a numeric surrogate',
    ).toBeUndefined();
    // Every Place-facing foreign key targets the opaque identity, never an integer.
    const normalized = normalizedDesiredSchema(canonical);
    for (const table of normalized.tables) {
      for (const key of table.foreignKeys ?? []) {
        if (!key.name.includes('->place.')) continue;
        expect(
          key.columns.some(column => /^id$/i.test(column)),
          `${table.name} must not join to Place through a numeric column`,
        ).toBe(false);
      }
    }
    // Identity must not be derivable from any mutable or presentational column.
    // `search_scope` is deliberately NOT in this list: a derived search scope is a
    // legitimate projection of a Place (D1, D12) and is not identity.
    for (const forbidden of ['name', 'slug', 'preferredName', 'displayName']) {
      expect(placeColumns[forbidden], `place must not expose ${forbidden}`).toBeUndefined();
    }
  });

  it('can physically store every compliant identity, and reject a malformed one', () => {
    // A governed identity format is worthless if the column cannot hold it. The
    // `pl-place-01-` prefix plus 24 hex characters is 36 characters, so the
    // column must be wider than that and pinned to the exact shape.
    const normalized = normalizedDesiredSchema(canonical);
    const placeTable = normalized.tables.find(table => table.name === 'place');
    const placeId = placeTable?.columns.find(column => column.name === 'place_id');
    expect(placeId?.type, 'place_id must be wide enough for the governed format').toMatch(
      /varchar\(40\)/,
    );
    // Every child column must match the parent exactly, or the foreign key cannot
    // be created.
    for (const tableName of [
      'place_name',
      'place_relationship',
      'place_evidence',
      'place_external_mapping',
      'search_area_member',
    ]) {
      const table = normalized.tables.find(candidate => candidate.name === tableName);
      for (const foreignKey of table?.foreignKeys ?? []) {
        if (!foreignKey.name.includes('->place.')) continue;
        for (const column of foreignKey.columns) {
          const columnSpec = table?.columns.find(candidate => candidate.name === column);
          expect(columnSpec?.type, `${tableName}.${column} must match place.place_id`).toMatch(
            /varchar\(40\)/,
          );
        }
      }
    }
    // The exact governed shape is enforced by the database, not only in code.
    const formatCheck = placeTable?.checks.find(check => check.name === 'chk_place_id_format');
    expect(formatCheck).toBeDefined();
    expect(formatCheck?.expression).toContain('pl-place-01-');
  });

  it('uses a durable identity format that is not a name or slug encoding', () => {
    expect(PLACE_ID_PATTERN.test('pl-place-01-9f2c1a4b7e0d3c5a8b1e6f40')).toBe(true);
    expect(isPlaceId('pl-place-01-9f2c1a4b7e0d3c5a8b1e6f40')).toBe(true);
    // Rejected: uppercase hex, wrong version, wrong width, and the retired
    // environment-local handle form.
    expect(isPlaceId('pl-place-01-9F2C1A4B7E0D3C5A8B1E6F40')).toBe(false);
    expect(isPlaceId('pl-place-02-9f2c1a4b7e0d3c5a8b1e6f40')).toBe(false);
    expect(isPlaceId('pl-place-01-9f2c1a4b')).toBe(false);
    expect(isPlaceId('suburb:34')).toBe(false);
    expect(isPlaceId('province:12')).toBe(false);
    // The identity namespace must be distinct from factual geography IDs and
    // from Search Area IDs so the three can never be confused.
    expect(isPlaceId('pl-geo-v01-za-gp-480fa75f70ff01496501')).toBe(false);
    expect(isPlaceId('pl-sa-gp-35163d1b6013797932cd94c1')).toBe(false);
  });
});

describe('Place Authority: identity dimensions stay separate', () => {
  it('models classification, verification, lifecycle, publication and search as distinct facts', () => {
    // D0 and the Slice 1 instruction forbid collapsing these into one status.
    const enumColumns = [
      place.placeClassification,
      place.verificationStatus,
      place.lifecycleStatus,
      place.searchScope,
      place.licensingClassification,
    ];
    const distinctNames = new Set(enumColumns.map(column => column.name));
    expect(distinctNames.size).toBe(enumColumns.length);

    expect(place.placeClassification.name).toBe('place_classification');
    expect(place.verificationStatus.name).toBe('verification_status');
    expect(place.lifecycleStatus.name).toBe('lifecycle_status');
    expect(place.publicationEligible.name).toBe('publication_eligible');
    expect(place.searchEligible.name).toBe('search_eligible');
  });

  it('enforces the minimum vocabulary without speculative status proliferation', () => {
    expect(PLACE_CLASSIFICATIONS).toEqual(['statutory', 'non_statutory']);
    expect(PLACE_VERIFICATION_STATUSES).toEqual(['candidate', 'provisional', 'verified']);
    expect(PLACE_LIFECYCLE_STATUSES).toEqual(['active', 'retired']);
    expect(SEARCH_AREA_LIFECYCLES).toEqual(['active', 'preview', 'disabled']);
    expect(SEARCH_AREA_MEMBER_STATES).toEqual(['active', 'disputed', 'excluded']);
  });

  it('carries the committed factual Place types forward unchanged and adds only D4 non-statutory types', () => {
    // Every pre-existing factual geography type must remain representable so a
    // Place never has to rewrite its type to fit storage (Section 4).
    for (const factualType of FACTUAL_GEOGRAPHY_TYPES) {
      if (factualType === 'estate/residential_development_candidate') {
        // Superseded by D4: the admitted non-statutory types are estate,
        // precinct and development, and a candidate is not a Place type.
        continue;
      }
      expect(PLACE_TYPES, `place_type must carry ${factualType}`).toContain(factualType);
    }
    for (const nonStatutory of ['estate', 'precinct', 'development'] as const) {
      expect(PLACE_TYPES).toContain(nonStatutory);
    }
    // D4 admitted exactly these three. `other` was already present in the
    // committed factual vocabulary, so it is not a new D4 type.
    const nonStatutoryTypes = PLACE_TYPES.filter(
      type => !FACTUAL_GEOGRAPHY_TYPES.includes(type as never),
    );
    expect(nonStatutoryTypes).toEqual(['estate', 'precinct', 'development']);
  });

  it('keeps name roles and relationship types typed and non-generic', () => {
    expect(PLACE_NAME_ROLES).toEqual([
      'preferred_public',
      'official',
      'common',
      'historical',
      'alternate_spelling',
      'language_form',
    ]);
    expect(PLACE_NAME_STATES).toEqual(['active', 'superseded', 'withdrawn']);
    // D10: administrative containment, settlement membership, market association
    // and succession must not share one ambiguous generic meaning.
    expect(PLACE_RELATIONSHIP_TYPES).toEqual([
      'administratively_contains',
      'settlement_within',
      'market_association',
      'succeeds',
      'co_located_with',
    ]);
    // D10 forbids one ambiguous generic meaning.
    expect(PLACE_RELATIONSHIP_TYPES).not.toContain('parent');
    expect(PLACE_RELATIONSHIP_TYPES).not.toContain('related_to');
    expect(PLACE_RELATIONSHIP_TYPES).not.toContain('contains');
    // One fact, one writable authority: the inverse of `succeeds` is derived by
    // reversal, and Search Area membership belongs to the `search_area_member`
    // table. Neither may be restated as a Place relationship.
    expect(PLACE_RELATIONSHIP_TYPES).not.toContain('preceded_by');
    expect(PLACE_RELATIONSHIP_TYPES).not.toContain('search_area_member');
  });

  it('authorizes no relationship type for search-scope expansion by default', () => {
    // D12: a relationship has no effect on an executable query boundary unless its
    // type is explicitly authorized. The V1 set is deliberately empty, so no
    // relationship is an implicit widening.
    expect(PLACE_RELATIONSHIP_SEARCH_AUTHORIZED_TYPES).toEqual([]);
  });

  it('records every demand signal kind as evidence, never as authority', () => {
    // D11: demand, provider suggestion and commercial submission create
    // candidates and research priority only.
    for (const kind of [
      'search_demand',
      'unresolved_query',
      'ambiguous_query',
      'provider_observation',
      'commercial_submission',
    ] as const) {
      expect(PLACE_EVIDENCE_KINDS).toContain(kind);
    }
    // Evidence carries no eligibility column of its own.
    const evidenceColumns = Object.getOwnPropertyDescriptors(placeEvidence);
    for (const forbidden of ['publicationEligible', 'searchEligible', 'verificationStatus']) {
      expect(
        evidenceColumns[forbidden],
        `place_evidence must not carry ${forbidden}`,
      ).toBeUndefined();
    }
  });
});

describe('Place Authority: contract invariants are enforced by the database', () => {
  it('declares every contract invariant as a CHECK constraint in Drizzle', () => {
    // Read the desired model through the Database Authority normalizer rather
    // than by reflecting on the builders, so this asserts the same structure the
    // static gate and physical congruency compare.
    const normalized = normalizedDesiredSchema(canonical);
    for (const [tableName, expected] of Object.entries(CONTRACT_CHECKS)) {
      const table = normalized.tables.find(candidate => candidate.name === tableName);
      expect(table, tableName).toBeDefined();
      const declared = (table?.checks ?? []).map(check => check.name).sort();
      expect(declared, tableName).toEqual([...expected].sort());
    }
  });

  it('anchors both authority roots on an opaque primary key with no unindexed surrogate', () => {
    // A MySQL AUTO_INCREMENT column must be indexed. `place` and `search_area`
    // are anchored on opaque varchar primary keys, so neither may carry a
    // surrogate AUTO_INCREMENT column that is neither primary nor indexed: that
    // DDL is rejected by the server (ER_WRONG_AUTO_KEY) and would silently
    // diverge from the desired model.
    for (const [filename, primaryKeyColumn] of [
      ['0091_place_authority_place.sql', 'place_id'],
      ['0096_place_authority_search_area.sql', 'search_area_id'],
    ] as const) {
      const sql = migrationSql(filename);
      expect(sql, filename).toContain(`PRIMARY KEY(\`${primaryKeyColumn}\`)`);
      expect(sql, `${filename} must not declare a surrogate AUTO_INCREMENT`).not.toContain(
        'AUTO_INCREMENT',
      );
    }
    // Every remaining AUTO_INCREMENT in the Place Authority is the primary key.
    for (const filename of MIGRATIONS) {
      const sql = migrationSql(filename);
      if (!sql.includes('AUTO_INCREMENT')) continue;
      expect(sql, filename).toContain('PRIMARY KEY(`id`)');
    }
  });

  it('declares the same invariants in the physical migrations', () => {
    for (const filename of MIGRATIONS) {
      const declared = [...migrationSql(filename).matchAll(/CONSTRAINT `([^`]+)`/g)].map(
        match => match[1],
      );
      const tableName = getTableName(
        (
          {
            '0091_place_authority_place.sql': place,
            '0092_place_authority_place_name.sql': placeName,
            '0093_place_authority_place_relationship.sql': placeRelationship,
            '0094_place_authority_place_evidence.sql': placeEvidence,
            '0095_place_authority_place_external_mapping.sql': placeExternalMapping,
            '0096_place_authority_search_area.sql': searchArea,
            '0097_place_authority_search_area_member.sql': searchAreaMember,
          } as Record<string, unknown>
        )[filename] as never,
      );
      for (const check of CONTRACT_CHECKS[tableName] ?? []) {
        expect(declared, `${filename} must declare ${check}`).toContain(check);
      }
    }
  });

  it('keeps the Drizzle model and the physical migration in exact column agreement', () => {
    // A column-name divergence between the desired model and the migration is
    // invisible to the static gate but breaks physical congruency, so the
    // relationship edge columns are asserted explicitly.
    expect(getTableName(placeRelationship)).toBe('place_relationship');
    expect(placeRelationship.fromPlaceId.name).toBe('from_place_id');
    expect(placeRelationship.toPlaceId.name).toBe('to_place_id');
    const sqlForRelationship = migrationSql('0093_place_authority_place_relationship.sql');
    expect(sqlForRelationship).toContain('`from_place_id` varchar(40) NOT NULL');
    expect(sqlForRelationship).toContain('`to_place_id` varchar(40) NOT NULL');
    // A single column may not back two logical properties.
    const names = [placeRelationship.fromPlaceId.name, placeRelationship.toPlaceId.name];
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every declared column a distinct SQL name in the desired model', () => {
    // A logical property accidentally reusing another column's SQL name is
    // invisible to the static gate but silently diverges from the physical
    // migration, so uniqueness is asserted directly.
    const normalized = normalizedDesiredSchema(canonical);
    for (const tableName of PLACE_AUTHORITY_TABLES) {
      const table = normalized.tables.find(candidate => candidate.name === tableName);
      expect(table, tableName).toBeDefined();
      const names = (table?.columns ?? []).map(column => column.name);
      expect(new Set(names).size, `${tableName} has duplicate column names`).toBe(names.length);
    }
    // Identity succession has exactly one authority: the typed `succeeds`
    // relationship edge. `place` must therefore carry no succession column, or
    // one fact would have two independently writable authorities (D9).
    const placeColumns = (
      normalized.tables.find(table => table.name === 'place')?.columns ?? []
    ).map(column => column.name);
    expect(
      placeColumns.filter(name => /supersed|replaces?|succeed/i.test(name)),
      'place must not carry a succession field; place_relationship is the only authority',
    ).toEqual([]);
    expect(
      placeColumns.filter(name => name === 'place_id'),
      'place must declare place_id exactly once',
    ).toHaveLength(1);
  });

  it('declares string defaults as literals, not expression defaults', () => {
    // `DEFAULT ('x')` is stored by MySQL as an expression default and reported by
    // information_schema as `_utf8mb4'x'`, which never matches the desired model
    // and therefore never reaches physical congruency. The canonical baseline
    // declares string defaults as bare literals, and so must the Place Authority.
    for (const filename of MIGRATIONS) {
      const sql = migrationSql(filename);
      expect(sql, `${filename} must not use an expression string default`).not.toMatch(
        /DEFAULT \('/,
      );
    }
  });

  it('derives search scope from place type so it can never contradict classification', () => {
    // D1/D12: `province` / `metro_city` / `locality` are derived executable scopes,
    // never an independent geographic fact. A scope may be absent, but it may
    // never disagree with the Place's own classification, and a type D1 gives no
    // searchable scope may not carry one at all.
    const placeCheck = normalizedDesiredSchema(canonical)
      .tables.find(table => table.name === 'place')
      ?.checks.find(check => check.name === 'chk_place_search_scope_derived_from_type');
    expect(placeCheck, 'the scope derivation invariant must be a database CHECK').toBeDefined();
    const expression = placeCheck?.expression ?? '';

    // Every D1 mapping is stated, so a future type cannot be added without a scope
    // decision being made explicitly.
    for (const scoped of [
      "= 'province'",
      "'city','town'",
      "'township','suburb','neighbourhood','locality','village'",
      "'district_municipality','local_municipality','estate','precinct','development','other'",
    ]) {
      expect(expression, `scope derivation must state ${scoped}`).toContain(scoped);
    }
    // The three derived scopes are the only permitted values.
    expect(expression).toContain("`search_scope` = 'province'");
    expect(expression).toContain("`search_scope` = 'metro_city'");
    expect(expression).toContain("`search_scope` = 'locality'");

    // The same invariant must exist physically, not only in the desired model.
    expect(migrationSql('0091_place_authority_place.sql')).toContain(
      'chk_place_search_scope_derived_from_type',
    );
  });

  it('gives succession exactly one writable authority', () => {
    // D9 binding rule: a succession, replacement, merge or split relationship must
    // not have two independently writable authorities. `place` carries no such
    // column; `place_relationship` with type `succeeds` is the only one.
    const normalized = normalizedDesiredSchema(canonical);
    const placeColumns = (
      normalized.tables.find(table => table.name === 'place')?.columns ?? []
    ).map(column => column.name);
    expect(placeColumns.filter(name => /supersed|replaces?/i.test(name))).toEqual([]);
    expect(migrationSql('0091_place_authority_place.sql')).not.toContain('supersedes_place_id');
    // And the typed edge exists with mandatory evidence.
    expect(PLACE_RELATIONSHIP_TYPES).toContain('succeeds');
    expect(placeRelationship.evidenceSource.notNull).toBe(true);
  });

  it('defaults relationships to no search-scope effect, so a relationship is never implicit widening', () => {
    // D12: only explicitly authorized relationship types affect an executable
    // query boundary. The default must therefore be 0, not 1.
    expect(placeRelationship.searchScopeAuthorized.default).toBe(0);
    expect(placeRelationship.searchScopeAuthorized.name).toBe('search_scope_authorized');
  });

  it('requires evidence for every relationship, per D10', () => {
    expect(placeRelationship.evidenceSource.notNull).toBe(true);
    expect(placeName.evidenceSource.notNull).toBe(true);
    expect(searchAreaMember.evidenceSource.notNull).toBe(true);
  });

  it('allows an unresolved query to be evidence with no Place referent, per D11', () => {
    // place_id must be nullable: recording a search that resolved to nothing must
    // never require inventing a Place.
    expect(placeEvidence.placeId.notNull).toBeFalsy();
    expect(placeEvidence.subject.name).toBe('subject');
  });
});

describe('Place Authority: Search Area remains a separate authority', () => {
  it('uses a separate identity namespace that can never be a Place identity', () => {
    expect(getTableName(searchArea)).toBe('search_area');
    expect(searchArea.searchAreaId.primary).toBe(true);
    expect(searchArea.searchAreaId.name).toBe('search_area_id');
    // Membership references a Place, so a Search Area can enumerate Places
    // without ever being one. Asserted as a real foreign key, not by name.
    const normalized = normalizedDesiredSchema(canonical);
    const member = normalized.tables.find(table => table.name === 'search_area_member');
    const memberForeignKeys = (member?.foreignKeys ?? []).map(key => key.name);
    expect(memberForeignKeys).toContain('place_id->place.place_id');
    expect(memberForeignKeys).toContain('search_area_id->search_area.search_area_id');
    // No column anywhere may treat a Search Area id as a Place reference.
    const placeForeignKeys = (
      normalized.tables.find(table => table.name === 'place')?.foreignKeys ?? []
    ).map(key => key.name);
    expect(placeForeignKeys).toEqual([]);
  });

  it('requires explicit authorized journeys so membership can never imply a journey', () => {
    expect(searchArea.authorizedJourneys.notNull).toBe(true);
    expect(searchArea.authorizedJourneys.name).toBe('authorized_journeys');
  });

  it('defaults lifecycle to preview so a Search Area is never active by existing', () => {
    expect(searchArea.lifecycle.default).toBe('preview');
  });
});

describe('Place Authority: name-role integrity (D8)', () => {
  it('permits a name to hold several roles on one Place without duplicating identity', () => {
    // D8: roles may overlap. A name may legitimately be both common and official.
    // The uniqueness key is (place_id, name_role, name), so the same text on the
    // same Place under distinct justified roles is representable.
    const key = (
      normalizedDesiredSchema(canonical).tables.find(table => table.name === 'place_name')
        ?.indexes ?? []
    ).find(index => index.name === 'place_name_place_role_name_uq');
    expect(key?.unique).toBe(true);
    expect(key?.columns).toEqual(['place_id', 'name_role', 'name']);

    // The overlapping roles D8 names must all be expressible.
    for (const role of ['preferred_public', 'official', 'common'] as const) {
      expect(PLACE_NAME_ROLES).toContain(role);
    }
  });

  it('permits the same text on different Places, and many names on one Place', () => {
    // A name never mints a Place: the key is anchored on place_id, so identical
    // text in two different Places is not a conflict, and one Place may hold many
    // distinct assertions. This is what keeps same-name identities (Diepkloof in
    // two municipalities, Sandton as city and suburb) representable without
    // merging them.
    const columns = (
      normalizedDesiredSchema(canonical).tables.find(table => table.name === 'place_name')
        ?.columns ?? []
    ).map(c => c.name);
    expect(columns).toContain('place_id');
    // The key's first column is the identity, so place_id is the discriminator.
    expect(columns).not.toContain('place');
  });

  it('keeps ingestion order out of preferred public naming', () => {
    // D8: preferred naming is a governed selection policy over recorded name
    // assertions, never a side effect of insertion order. The table carries no
    // ordinal, sequence, priority or "is currently preferred" flag that a writer
    // could set while inserting, so ordering cannot silently decide the outcome.
    const columns = (
      normalizedDesiredSchema(canonical).tables.find(table => table.name === 'place_name')
        ?.columns ?? []
    ).map(c => c.name);
    for (const forbidden of [
      'sort_order',
      'ordinal',
      'priority',
      'sequence',
      'rank',
      'is_preferred',
      'is_current',
    ]) {
      expect(columns, `place_name must not expose ${forbidden}`).not.toContain(forbidden);
    }
    // Selection is expressed by the role, and role is part of the uniqueness key.
    expect(columns).toContain('name_role');
    expect(columns).toContain('name_state');
  });

  it('keeps assertion-level corroboration in place_evidence, not duplicated name rows', () => {
    // Two sources asserting the identical name and role collapse to one
    // `place_name` row, which is deliberate: a second identical assertion is not a
    // second name. Corroborating and contradicting evidence is recorded against
    // `place_evidence`, which is the table whose purpose it is. This is a
    // recorded design decision, not an accident.
    const nameColumns = (
      normalizedDesiredSchema(canonical).tables.find(table => table.name === 'place_name')
        ?.columns ?? []
    ).map(c => c.name);
    expect(nameColumns).toContain('evidence_source');
    const evidenceColumns = (
      normalizedDesiredSchema(canonical).tables.find(table => table.name === 'place_evidence')
        ?.columns ?? []
    ).map(c => c.name);
    expect(evidenceColumns).toContain('place_id');
    expect(evidenceColumns).toContain('evidence_kind');
    expect(evidenceColumns).toContain('provider');
  });
});

describe('Place Authority: containment authority is singular', () => {
  it('holds the authoritative containment assertion only in place_relationship', () => {
    // No convenience parent or containment field may exist anywhere else, because
    // two writable containment assertions could disagree with nothing detecting it.
    const normalized = normalizedDesiredSchema(canonical);
    for (const tableName of PLACE_AUTHORITY_TABLES) {
      const table = normalized.tables.find(candidate => candidate.name === tableName);
      const suspect = (table?.columns ?? [])
        .map(column => column.name)
        .filter(name => /^(parent|child|container|ancestor|hierarch)/i.test(name));
      expect(suspect, `${tableName} must not carry a containment column`).toEqual([]);
    }
    // Containment is expressed only as typed, evidenced edges.
    expect(PLACE_RELATIONSHIP_TYPES).toContain('administratively_contains');
    expect(PLACE_RELATIONSHIP_TYPES).toContain('settlement_within');
  });

  it('keeps administrative containment and settlement membership distinct assertions', () => {
    // D10: these are not inverses of one another. A referent may be
    // administratively within one municipality and understood as settled within
    // another, so neither may be derived from the other, and both are stored in
    // one canonical direction with the traversal inverse derived by reversal.
    const placeRelationshipSql = migrationSql('0093_place_authority_place_relationship.sql');
    expect(placeRelationshipSql).toContain('administratively_contains');
    expect(placeRelationshipSql).toContain('settlement_within');
    // A single unique edge key per (from, to, type) means neither can be inferred
    // from the other.
    expect(placeRelationshipSql).toContain('place_relationship_edge_uq');
  });
});

describe('Place Authority: Slice 1 changed no existing authority', () => {
  it('leaves the three-level runtime tables and their lifecycle vocabulary untouched', () => {
    // Slice 1 must not retire or reshape current runtime geography. Consumers
    // still resolve province/city/suburb.
    const locations = canonical as unknown as Record<string, { status?: unknown }>;
    for (const tableName of ['provinces', 'cities', 'suburbs']) {
      const table = locations[tableName] as unknown as {
        status?: { enumValues?: readonly string[] };
      };
      expect(table?.status?.enumValues, tableName).toEqual(['verified', 'provisional', 'retired']);
    }
  });

  it('holds Place references to an explicit allow-list of consumers only', () => {
    // Asserted as a real foreign
    // key into `place`, not by column-name matching: consumers legitimately keep
    // pre-existing provider columns such as `listings.place_id`, which is a
    // Google place id and must NOT be confused with Place Authority identity.
    const normalized = normalizedDesiredSchema(canonical);
    const consumers = [
      'listings',
      'properties',
      'developments',
      'land_parcels',
      'commercial_assets',
      'sl_places',
      'agents',
      'agencies',
      'service_provider_locations',
      'demand_campaigns',
      'seller_prospects',
      'agent_coverage_areas',
    ];
    // Slice 3 approved exactly one additive consumer reference: saved_searches,
    // the existing governed home of a versioned geographic query intent. It is
    // the allow-list, so a second consumer gaining a Place reference still fails.
    const APPROVED_PLACE_CONSUMERS = ['saved_searches'];
    for (const consumer of consumers) {
      const table = normalized.tables.find(candidate => candidate.name === consumer);
      if (!table) continue;
      const placeReferences = (table.foreignKeys ?? [])
        .map(key => key.name)
        .filter(name => name.includes('->place.'));
      if (APPROVED_PLACE_CONSUMERS.includes(consumer)) {
        // Exactly one reference, to the canonical identity, and nothing wider.
        expect(placeReferences, `${consumer} must hold exactly one Place reference`).toEqual([
          'place_id->place.place_id',
        ]);
        continue;
      }
      expect(placeReferences, `${consumer} must not reference Place`).toEqual([]);
    }
  });

  it('registers a digest for every new migration in the canonical manifest', () => {
    const manifest = JSON.parse(readFileSync('server/migrations/manifest.json', 'utf8')) as {
      expectedHead: string;
      migrations: { filename: string; checksum: string; kind: string }[];
    };
    for (const filename of MIGRATIONS) {
      const entry = manifest.migrations.find(item => item.filename === filename);
      expect(entry, filename).toBeDefined();
      expect(entry?.checksum).toMatch(/^[a-f0-9]{64}$/);
    }
    // The canonical head is whatever the manifest declares — not necessarily the
    // last Place migration, since later consumer slices extend the chain. It must
    // still resolve to a registered, digested entry, so a dangling head fails.
    const head = manifest.migrations.find(item => item.filename === manifest.expectedHead);
    expect(head, `canonical head ${manifest.expectedHead} must be registered`).toBeDefined();
    expect(head?.checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});
