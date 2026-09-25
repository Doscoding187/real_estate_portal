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
    for (const type of [
      'administratively_contains',
      'settlement_within',
      'market_association',
      'succeeds',
      'preceded_by',
    ] as const) {
      expect(PLACE_RELATIONSHIP_TYPES).toContain(type);
    }
    expect(PLACE_RELATIONSHIP_TYPES).not.toContain('parent');
    expect(PLACE_RELATIONSHIP_TYPES).not.toContain('related_to');
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
    expect(sqlForRelationship).toContain('`from_place_id` varchar(32) NOT NULL');
    expect(sqlForRelationship).toContain('`to_place_id` varchar(32) NOT NULL');
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
    // The continuity reference must be its own column, never a second place_id.
    const placeColumns = normalized.tables
      .find(table => table.name === 'place')
      ?.columns.map(column => column.name);
    expect(placeColumns).toContain('supersedes_place_id');
    expect(
      placeColumns?.filter(name => name === 'place_id'),
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

  it('adds no Place reference to any product consumer table', () => {
    // No consumer migration is authorised in Slice 1. Asserted as a real foreign
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
      'saved_searches',
      'agent_coverage_areas',
    ];
    for (const consumer of consumers) {
      const table = normalized.tables.find(candidate => candidate.name === consumer);
      if (!table) continue;
      const placeReferences = (table.foreignKeys ?? [])
        .map(key => key.name)
        .filter(name => name.includes('->place.'));
      expect(placeReferences, `${consumer} must not reference Place in Slice 1`).toEqual([]);
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
    expect(manifest.expectedHead).toBe(MIGRATIONS[MIGRATIONS.length - 1]);
  });
});
