import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { assessAuditCompleteness } from '../../tools/place-admission/audit-completeness.mjs';

import { normalizedDesiredSchema } from '../_core/databaseAuthority/schemaCongruency';
import { auditTidbStructuralAdmission } from '../_core/databaseAuthority/tidbStructuralAdmission';
import * as schema from '../../drizzle/schema';
import { PLACE_RELATIONSHIP_TYPES, PLACE_TYPES } from '../../drizzle/schema/placeAuthority';
import {
  CANONICAL_PLACES_VERSION,
  canonicalPlacesExpected,
  loadCanonicalPlacePackage,
} from '../_core/databaseAuthority/dataAdapters/canonicalPlaces';
import {
  loadPlaceAdmissionTerritoryRegistry,
  resolvePlaceAdmissionCoverageBaselinePaths,
  resolvePlaceAdmissionPackagePaths,
  resolvePlaceAdmissionSourcePaths,
  selectPlaceAdmissionTerritory,
} from '../../shared/placeAdmissionTerritories';

const readJsonl = (path: string) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as Record<string, any>);

const packageRoot = process.cwd();

/**
 * The default registered territory, resolved through the admission territory
 * registry. Nothing in this file names a province's paths directly, so the same
 * contract holds for any registered territory.
 */
const registryLoad = loadPlaceAdmissionTerritoryRegistry(packageRoot);
const territory = selectPlaceAdmissionTerritory(registryLoad.registry);
const packagePaths = resolvePlaceAdmissionPackagePaths(territory);
const sourcePaths = resolvePlaceAdmissionSourcePaths(territory);
const coverageBaselinePaths = resolvePlaceAdmissionCoverageBaselinePaths(territory);

const loaded = loadCanonicalPlacePackage(packageRoot);
const places = readJsonl(packagePaths.artifacts.places);
const names = readJsonl(packagePaths.artifacts.names);
const relationships = readJsonl(packagePaths.artifacts.relationships);
const ledger = readJsonl(packagePaths.artifacts.disposition_ledger);
const parentEvidence = JSON.parse(
  readFileSync(packagePaths.artifacts.parent_evidence_classification, 'utf8'),
) as { edges: any[]; tally: any; governed_input_count: number };
const sourceManifest = JSON.parse(
  readFileSync(sourcePaths.manifest, 'utf8'),
) as { compact_artifacts: { path: string; sha256: string }[]; source_snapshot_id: string };

const placeIds = new Set(places.map(p => p.place_id));

describe('Place admission: source baseline', () => {
  it('refuses to load unless every source artifact digest matches', () => {
    // loadCanonicalPlacePackage throws on drift, so a successful load is itself
    // the proof that the forward baseline is intact.
    expect(sourceManifest.compact_artifacts.length).toBeGreaterThan(0);
    expect(loaded.manifest.generated_from.source_snapshot_id).toBe(
      sourceManifest.source_snapshot_id,
    );
  });

  it('uses the reproducible v0.2 source, not the unrecoverable v0.1 factual files', () => {
    const comparison = loaded.manifest.generated_from.comparison_baseline;
    expect(comparison.factual_identity_count).toBe(1480);
    expect(comparison.runtime_row_count).toBe(1414);
    expect(comparison.queued_count).toBe(116);
    expect(comparison.awaiting_accepted_parent_edge).toBe(11);
    expect(comparison.duplicate_natural_key_within_parent).toBe(8);
    expect(comparison.natural_key_owned_by_accepted_row).toBe(3);
    expect(comparison.co_published_natural_keys).toBe(14);
    expect(comparison.parent_evidence_inputs).toBe(103);
    // The admitted dataset is built from v0.2 identities, so the Place count is
    // deliberately not the v0.1 runtime row count.
    expect(places.length).not.toBe(comparison.runtime_row_count);
  });
});

describe('Place admission: source identity is not Place identity', () => {
  it('admits fewer Places than source identities, and accounts for every difference', () => {
    const identityCount = 1488;
    const absorbed = places.reduce((sum, place) => sum + (place.source_identity_ids.length - 1), 0);
    expect(places.length + absorbed).toBe(identityCount);
    expect(places.length).toBeLessThan(identityCount);
    // Every admitted Place's member identities are distinct.
    for (const place of places) {
      expect(new Set(place.source_identity_ids).size).toBe(place.source_identity_ids.length);
      expect(place.source_identity_ids).toContain(place.primary_source_identity_id);
    }
    // Every source identity is mapped exactly once.
    const mapped = places.flatMap(place => place.source_identity_ids);
    expect(new Set(mapped).size).toBe(identityCount);
  });

  it('merges only on recorded evidence, never on a name alone', () => {
    const merged = places.filter(place => place.source_identity_ids.length > 1);
    expect(merged.length).toBeGreaterThan(0);
    for (const place of merged) {
      // Two governed bases exist, and neither is "the names matched":
      //  - a unique administrative container (a territory has one province), or
      //  - same name, same admitted administrative context, within distance.
      expect([
        'unique_administrative_container_name',
        'same_normalized_name_same_administrative_context_within_governed_distance',
      ]).toContain(place.adjudication.basis);
      if (place.adjudication.basis.startsWith('same_normalized_name')) {
        expect(place.adjudication.governed_max_merge_km).toBe(15);
        // A settlement merge carries a recorded administrative context.
        expect(place.adjudication.administrative_context).toBeTruthy();
      }
      expect(place.adjudication.member_count).toBe(place.source_identity_ids.length);
    }
    // Two province identities for the same container name are one Place, by container identity.
    const provincePlaces = places.filter(place => place.place_type === 'province');
    expect(provincePlaces).toHaveLength(1);
    expect(provincePlaces[0].source_identity_ids.length).toBe(2);
    expect(provincePlaces[0].adjudication.basis).toBe('unique_administrative_container_name');
  });

  it('gives every source candidate an explicit disposition', () => {
    expect(ledger.length).toBe(4350);
    const byDisposition = new Map<string, number>();
    for (const row of ledger)
      byDisposition.set(row.disposition, (byDisposition.get(row.disposition) ?? 0) + 1);
    expect(byDisposition.get('admitted_as_place_primary')).toBe(places.length);
    expect(byDisposition.get('quarantined_candidate')).toBe(2754);
    expect(byDisposition.get('rejected_non_independent')).toBe(108);
    for (const row of ledger) {
      expect(row.disposition).toBeTruthy();
      expect(row.disposition_reason).toBeTruthy();
      if (row.place_id) expect(placeIds.has(row.place_id)).toBe(true);
    }
    // Quarantine is visible, and a quarantined candidate never silently became a Place.
    const quarantined = ledger.filter(row => row.disposition === 'quarantined_candidate');
    expect(quarantined.every(row => row.place_id === null)).toBe(true);
  });

  it('never creates a Place from a licence-blocked or evidence-blocked candidate', () => {
    for (const name of [
      'Kyalami',
      'Khayalami',
      'Sky City',
      'Eden Park',
      'Azaadville',
      'Reiger Park',
    ]) {
      const admitted = places.filter(place =>
        place.source_identity_ids.some(
          id => id === ledger.find(row => row.preferred_name === name)?.source_identity_id,
        ),
      );
      expect(admitted, `${name} must not be admitted`).toEqual([]);
    }
  });
});

describe('Place admission: Place identity is assigned and stable', () => {
  it('assigns governed Place identities that are not derived from the source identity', () => {
    for (const place of places) {
      expect(place.place_id).toMatch(/^pl-place-01-[a-f0-9]{24}$/);
      // A Place id is not the source identity, a name, or a slug.
      expect(place.place_id).not.toContain(place.primary_source_identity_id);
    }
    expect(new Set(places.map(p => p.place_id)).size).toBe(places.length);
  });

  it('reuses the committed registry so a rebuild never mints a new id', () => {
    const registry = loaded.registry.allocated as Record<string, string>;
    for (const place of places) {
      expect(registry[place.primary_source_identity_id]).toBe(place.place_id);
    }
    expect(Object.keys(registry).length).toBe(places.length);
  });

  it('regenerates deterministically and asserts it', () => {
    expect(() =>
      execFileSync('npx', ['tsx', 'tools/place-admission/build-place-admission.mjs', '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('refuses to re-mint identities when the Place ID registry cannot be read', () => {
    // The determinism assertion above passed intermittently, and the cause was a
    // single false-negative stat: the builder chose an empty registry, re-minted
    // every Place from randomBytes, and `--check` failed with "would change". All
    // 1,466 Gauteng identities changed with zero shared.
    //
    // That failure mode is guarded by refusing rather than re-minting, so this test
    // pins the guard. It is a real failure to provoke, not a mock: a corrupt registry
    // is the cheapest faithful way to reach the same refusal path, and it must stop
    // the build instead of being reinterpreted as a first build.
    const repositoryRoot = process.cwd();
    const registryRelative =
      'data/gauteng-place-admission-v0.1/gauteng_place_id_registry.v0.1.json';
    const registryPath = join(repositoryRoot, registryRelative);
    const original = readFileSync(registryPath, 'utf8');

    try {
      writeFileSync(registryPath, '{ not json', 'utf8');
      let message = '';
      try {
        execFileSync(
          'npx',
          ['tsx', 'tools/place-admission/build-place-admission.mjs', '--territory=za-gp'],
          { cwd: repositoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
        );
      } catch (error) {
        message = `${(error as { stderr?: string }).stderr ?? ''}${(error as { stdout?: string }).stdout ?? ''}`;
      }
      expect(message).toContain('place-admission refused');
      // And it must name the reason, so an operator is not left guessing whether the
      // build failed on the registry or on geography.
      expect(message).toMatch(/Place ID registry/);
      expect(message).toMatch(/not valid JSON/);
    } finally {
      writeFileSync(registryPath, original, 'utf8');
    }

    // The registry is intact and the package still replays with zero re-minting.
    expect(readFileSync(registryPath, 'utf8')).toBe(original);
    expect(() =>
      execFileSync(
        'npx',
        ['tsx', 'tools/place-admission/build-place-admission.mjs', '--territory=za-gp'],
        { cwd: repositoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    ).not.toThrow();
  });
});

describe('Place admission: names follow a governed policy', () => {
  it('gives every Place exactly one preferred public name', () => {
    const counts = new Map<string, number>();
    for (const name of names.filter(n => n.name_role === 'preferred_public')) {
      counts.set(name.place_id, (counts.get(name.place_id) ?? 0) + 1);
    }
    expect(counts.size).toBe(places.length);
    for (const [, count] of counts) expect(count).toBe(1);
  });

  it('lets the same text belong to distinct Places and to several roles on one Place', () => {
    const diepkloof = names.filter(n => n.name === 'Diepkloof' && n.is_searchable === 1);
    expect(new Set(diepkloof.map(n => n.place_id)).size).toBe(2);
    const overlapping = new Map<string, Set<string>>();
    for (const name of names) {
      const key = `${name.place_id}|${name.normalized_name}`;
      overlapping.set(key, (overlapping.get(key) ?? new Set()).add(name.name_role));
    }
    expect([...overlapping.values()].some(roles => roles.size > 1)).toBe(true);
  });

  it('keeps identifier-like labels non-searchable provenance', () => {
    for (const name of names.filter(n => n.is_searchable === 1)) {
      expect(name.name).not.toMatch(/^q\d+$/i);
      expect(name.name).not.toMatch(/^https?:\/\//i);
    }
  });

  it('retains a historical name without making it the current name', () => {
    const historical = names.filter(n => n.name_role === 'historical');
    expect(historical.length).toBeGreaterThan(0);
    for (const name of historical) {
      expect(
        names.some(n => n.place_id === name.place_id && n.name_role === 'preferred_public'),
      ).toBe(true);
    }
  });

  it('normalizes extension surface forms as names, never as new Places', () => {
    const generated = names.filter(
      n => (n as any).generated_by === 'extension_surface_form_pattern',
    );
    expect(generated.length).toBeGreaterThan(0);
    for (const name of generated) {
      expect(placeIds.has(name.place_id)).toBe(true);
      expect(name.name_role).toBe('alternate_spelling');
      expect(name.source_name_assertion_id).toBeNull();
    }
    // No Place was created whose only support would be a name pattern.
    expect(places.some(p => p.source_identity_ids.length === 0)).toBe(false);
  });
});

describe('Place admission: relationships use only the V1 vocabulary', () => {
  it('emits only approved relationship types and no search widening', () => {
    for (const relationship of relationships) {
      expect(PLACE_RELATIONSHIP_TYPES).toContain(relationship.relationship_type);
      expect(relationship.evidence_source).toBeTruthy();
      expect(relationship.search_scope_authorized).toBe(0);
      expect(placeIds.has(relationship.from_place_id)).toBe(true);
      expect(placeIds.has(relationship.to_place_id)).toBe(true);
      expect(relationship.from_place_id).not.toBe(relationship.to_place_id);
    }
  });

  it('holds authoritative containment exactly once, as a single-parent forest', () => {
    const containment = relationships.filter(
      r => r.relationship_type === 'administratively_contains',
    );
    const parents = new Map<string, string>();
    for (const edge of containment) {
      expect(parents.has(edge.from_place_id)).toBe(false);
      parents.set(edge.from_place_id, edge.to_place_id);
    }
    expect(containment.length).toBe(places.length - 1);
    for (const start of parents.keys()) {
      const seen = new Set([start]);
      let cursor: string | undefined = parents.get(start);
      while (cursor) {
        expect(seen.has(cursor)).toBe(false);
        seen.add(cursor);
        cursor = parents.get(cursor);
      }
    }
  });

  it('does not invent settlement or market relationships the evidence does not support', () => {
    // Soweto's constituents are not linked to it: the approved source carries no
    // evidence for that containment, so no relationship is emitted.
    expect(relationships.some(r => r.relationship_type === 'settlement_within')).toBe(false);
    expect(relationships.some(r => r.relationship_type === 'market_association')).toBe(false);
    expect(relationships.some(r => r.relationship_type === 'succeeds')).toBe(false);
    expect(relationships.some(r => r.relationship_type === 'co_located_with')).toBe(false);
  });
});

describe('Place admission: governed parent evidence is classified, not promoted', () => {
  it('classifies all 103 governed inputs and every edge they contain', () => {
    expect(parentEvidence.governed_input_count).toBe(103);
    expect(parentEvidence.edges.length).toBe(parentEvidence.tally.total_edges);
    expect(parentEvidence.tally.total_edges).toBe(478);
    for (const edge of parentEvidence.edges) {
      expect(edge.relationship_classification).toBeTruthy();
      expect(edge.disposition).toBe('not_admitted_in_slice_2');
      expect(edge.disposition_reason).toBeTruthy();
      // Nothing was promoted to a Place.
      expect(edge.place_id).toBeNull();
    }
  });

  it('refuses to upgrade service, delivery and planning areas into containment', () => {
    const nonGeographic = parentEvidence.edges.filter(
      e => e.relationship_classification === 'non_geographic_relationship',
    );
    expect(nonGeographic.length).toBeGreaterThan(0);
    // The dominant class is a refuse collection area list, which is a service area.
    expect(
      nonGeographic.filter(e => /refuse_collection/.test(e.evidence_class)).length,
    ).toBeGreaterThan(100);
  });
});

describe('Place admission: schema alignment', () => {
  it('admits only Place types the schema accepts', () => {
    for (const place of places) expect(PLACE_TYPES).toContain(place.place_type);
  });

  it('emits combinations the database constraints accept', () => {
    for (const place of places) {
      if (place.verification_status === 'candidate') {
        expect(place.publication_eligible).toBe(0);
        expect(place.search_eligible).toBe(0);
      }
      if (place.place_classification === 'non_statutory')
        expect(place.verification_status).toBe('verified');
      if (place.publication_eligible === 1) expect(place.search_eligible).toBe(1);
      if (place.lifecycle_status === 'retired') {
        expect(place.publication_eligible).toBe(0);
        expect(place.search_eligible).toBe(0);
      }
    }
  });

  it('gives every scoped Place an evidenced province context', () => {
    // province / metro_city / locality are product search-scope categories, not
    // mandatory levels of the factual containment hierarchy. The only mandatory
    // ancestry requirement is a governed chain to the province, so a suburb under
    // a municipality is a legitimate locality scope with no city Place above it.
    const scopeById = new Map(places.map(p => [p.place_id, p.search_scope]));
    const parentByChild = new Map(
      relationships
        .filter(r => r.relationship_type === 'administratively_contains')
        .map(r => [r.from_place_id, r.to_place_id]),
    );
    const scopedAncestors = (placeId: string): string[] => {
      const scopes: string[] = [];
      const seen = new Set([placeId]);
      let cursor = parentByChild.get(placeId);
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        const scope = scopeById.get(cursor);
        if (scope) scopes.push(scope);
        cursor = parentByChild.get(cursor);
      }
      return scopes.reverse();
    };

    for (const place of places) {
      if (place.search_scope == null) {
        // Admitted without a scope: context-only, neither searchable nor
        // publishable, because the database forbids either without a scope.
        expect(place.search_eligible, `${place.place_id} must not be searchable`).toBe(0);
        expect(place.publication_eligible).toBe(0);
        continue;
      }
      expect(place.search_eligible, `${place.place_id} must be searchable`).toBe(1);
      if (place.search_scope === 'province') continue; // its own context
      // The root-most scoped ancestor must be the province. That is the only
      // mandatory level, and a scope without a provincial bound is unbounded.
      expect(
        scopedAncestors(place.place_id)[0],
        `${place.place_id} claims ${place.search_scope} with no evidenced province context`,
      ).toBe('province');
    }
  });

  it('introduces no artificial metro-city parent and re-types no municipality', () => {
    // The repair must make geography truthful, not reshape it to match the UI.
    const typeById = new Map(places.map(p => [p.place_id, p.place_type]));
    const parents = new Set(
      relationships
        .filter(r => r.relationship_type === 'administratively_contains')
        .map(r => r.to_place_id),
    );
    // A settlement Place is never inserted as a container to give a locality a
    // metro_city ancestor.
    for (const parentId of parents) {
      expect(
        ['city', 'town'],
        `${parentId} must not be a settlement container introduced for a search hierarchy`,
      ).not.toContain(typeById.get(parentId));
    }
    // Every municipality stays a factual context Place and never becomes a scope.
    const municipalities = places.filter(
      p => p.place_type === 'local_municipality' || p.place_type === 'district_municipality',
    );
    expect(municipalities.length).toBeGreaterThan(0);
    for (const place of municipalities) {
      expect(place.search_scope, `${place.place_id} municipality must carry no scope`).toBeNull();
      expect(place.search_eligible).toBe(0);
      expect(place.publication_eligible).toBe(0);
    }
    // metro_city remains the scope of city/town Places only, and locality the
    // scope of settlement-level Places only. The vocabulary is not redefined.
    for (const place of places) {
      if (place.search_scope === 'metro_city') expect(place.place_type).toMatch(/^(city|town)$/);
      if (place.search_scope === 'locality') {
        expect(place.place_type).toMatch(
          /^(township|suburb|neighbourhood|locality|village)$/,
        );
      }
    }
  });

  it('does not authorise any relationship-driven broad scope expansion', () => {
    // Exact Place execution and broad scope expansion are separate capabilities.
    // Nothing in this admission may turn a containment edge into a market edge.
    for (const edge of relationships) {
      expect(edge.search_scope_authorized, `${edge.from_place_id} must not widen search`).toBe(0);
    }
    const scopeEstablishment = places.filter(
      p => (p as unknown as { scope_establishment?: { established: boolean } }).scope_establishment
        ?.established === true,
    );
    expect(scopeEstablishment.length).toBeGreaterThan(0);
    // Establishment proves a province context, never a descendant set.
    for (const place of scopeEstablishment) {
      const establishment = (
        place as unknown as {
          scope_establishment: { evidenced_scoped_ancestors: string[]; required_coarser_scopes: string[] };
        }
      ).scope_establishment;
      expect(establishment.required_coarser_scopes).toEqual(
        place.search_scope === 'province' ? [] : ['province'],
      );
    }
  });

  it('leaves the three-level runtime and every consumer untouched', () => {
    const normalized = normalizedDesiredSchema(schema);
    const desiredTableNames = new Set(normalized.tables.map(t => t.name));
    // No consumer gained a Place foreign key in Slice 2.
    for (const tableName of [
      'listings',
      'properties',
      'developments',
      'land_parcels',
      'commercial_assets',
      'sl_places',
    ]) {
      const table = normalized.tables.find(t => t.name === tableName);
      expect(
        (table?.foreignKeys ?? []).filter(key => key.name.includes('->place.')).length,
        tableName,
      ).toBe(0);
    }
    // The three-level tables are still present and unchanged in shape.
    for (const tableName of ['provinces', 'cities', 'suburbs', 'locations']) {
      expect(desiredTableNames.has(tableName)).toBe(true);
    }
    const report = auditTidbStructuralAdmission(normalized);
    expect(report.admitted).toBe(false); // pre-existing reviewed interactions remain
  });

  it('publishes a stable expected-dataset description for the materializer', () => {
    const expected = canonicalPlacesExpected(packageRoot);
    expect(expected.admissionVersion).toBe(CANONICAL_PLACES_VERSION);
    expect(expected.places).toBe(places.length);
    expect(expected.names).toBe(names.length);
    expect(expected.relationships).toBe(relationships.length);
    expect(expected.dispositionLedger).toBe(ledger.length);
    expect(expected.osmOnlyPlaces).toBeGreaterThan(0);
    expect(expected.verifiedDigest).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('Place admission: the identity guard, on the failure paths that lose allocations', () => {
  const registryRelative = 'data/gauteng-place-admission-v0.1/gauteng_place_id_registry.v0.1.json';
  const placesRelative = 'data/gauteng-place-admission-v0.1/gauteng_place_admission_v0.1.jsonl';

  const runBuilder = () => {
    try {
      execFileSync('npx', ['tsx', 'tools/place-admission/build-place-admission.mjs', '--territory=za-gp'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return '';
    } catch (error) {
      const failure = error as { stderr?: string; stdout?: string };
      return `${failure.stderr ?? ''}${failure.stdout ?? ''}`;
    }
  };

  it('refuses a VALID registry whose allocation map is empty, without touching the package', () => {
    // Reading the registry correctly is not enough. A valid registry with an empty
    // allocation map reads without complaint, so every group looks unallocated and
    // every Place is re-minted. Measured before the guard: `minted=1466 reused=0`,
    // zero identities retained, exit status 0.
    const registryPath = join(process.cwd(), registryRelative);
    const placesPath = join(process.cwd(), placesRelative);
    const originalRegistry = readFileSync(registryPath, 'utf8');
    const originalPlaces = readFileSync(placesPath, 'utf8');

    try {
      const emptied = { ...JSON.parse(originalRegistry), allocated: {}, allocation_sequence: 0 };
      writeFileSync(registryPath, JSON.stringify(emptied, null, 2), 'utf8');

      const output = runBuilder();
      expect(output).toContain('place-admission refused');
      expect(output).toMatch(/already published in/);
      expect(output).toMatch(/has lost allocations/);
      // The package must be byte-identical: a refusal that rewrote the very identities
      // it was protecting would be worse than the bug.
      expect(readFileSync(placesPath, 'utf8')).toBe(originalPlaces);
    } finally {
      writeFileSync(registryPath, originalRegistry, 'utf8');
    }
  });

  it('refuses a PARTIAL allocation loss and names how many identities are unallocated', () => {
    const registryPath = join(process.cwd(), registryRelative);
    const originalRegistry = readFileSync(registryPath, 'utf8');

    try {
      const damaged = JSON.parse(originalRegistry);
      const keys = Object.keys(damaged.allocated);
      for (const key of keys.slice(0, 10)) delete damaged.allocated[key];
      writeFileSync(registryPath, JSON.stringify(damaged, null, 2), 'utf8');

      const output = runBuilder();
      expect(output).toContain('place-admission refused');
      expect(output).toMatch(/10 Place identities/);
    } finally {
      writeFileSync(registryPath, originalRegistry, 'utf8');
    }
  });

  it('leaves the registry and package reusable after every refusal', () => {
    const registryPath = join(process.cwd(), registryRelative);
    const originalRegistry = readFileSync(registryPath, 'utf8');
    expect(readFileSync(registryPath, 'utf8')).toBe(originalRegistry);
    expect(() =>
      execFileSync(
        'npx',
        ['tsx', 'tools/place-admission/build-place-admission.mjs', '--territory=za-gp'],
        { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    ).not.toThrow();
  });
});

describe('National storage proof: the audit cannot conclude safety from a target it could not read', () => {
  it('treats an unreadable ledger as unknown rather than clean', () => {
    const complete = assessAuditCompleteness([
      { database: 'a', inspected: true },
      { database: 'b', inspected: true, note: 'no migration ledger' },
    ]);
    expect(complete.complete).toBe(true);
    expect(complete.inspected).toBe(2);

    // The reported failure: an unreadable ledger was recorded with an empty migration
    // list, indistinguishable from clean, so the audit printed a clean conclusion and
    // exited zero while a target's state was unknown.
    const incomplete = assessAuditCompleteness([
      { database: 'a', inspected: true },
      { database: 'b', inspected: false, note: 'ledger present but UNREADABLE' },
      { database: 'c', inspected: false, note: 'ledger present but UNREADABLE' },
    ]);
    expect(incomplete.complete).toBe(false);
    expect(incomplete.uninspected.map(entry => entry.database)).toEqual(['b', 'c']);
    expect(incomplete.uninspected[0].reason).toMatch(/UNREADABLE/);
  });

  it('does not accept a finding that merely has no migrations recorded', () => {
    // A ledger table that is positively absent IS an established fact; a ledger that
    // exists but cannot be read is not. Only the second blocks the conclusion.
    const noLedger = assessAuditCompleteness([{ database: 'a', inspected: true, note: 'no migration ledger' }]);
    expect(noLedger.complete).toBe(true);
    const bare = assessAuditCompleteness([{ database: 'a' }]);
    expect(bare.complete).toBe(false);
  });
});
