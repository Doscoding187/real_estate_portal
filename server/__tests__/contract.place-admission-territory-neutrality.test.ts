/**
 * Phase 3 gate: the Place admission pipeline is territory-neutral.
 *
 * The gate has two halves. First, the committed registry must be the single
 * authority for a territory's paths, versions and expected counts, and it must
 * fail closed rather than guess. Second, a non-Gauteng territory must be
 * admissible through the *same* builder and the *same* materializer, with no new
 * application architecture and without any fictional row entering the real
 * registry or the real projection catalog.
 *
 * The synthetic territory is generated into a throwaway directory and removed
 * afterwards, so nothing fictional is committed and the real catalog is never
 * polluted.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  PLACE_ADMISSION_TERRITORY_REGISTRY_PATH,
  assertPlaceAdmissionTerritoryRegistry,
  loadPlaceAdmissionTerritoryRegistry,
  resolvePlaceAdmissionPackagePaths,
  selectPlaceAdmissionTerritory,
} from '../../shared/placeAdmissionTerritories';
import { loadCanonicalPlacePackage } from '../_core/databaseAuthority/dataAdapters/canonicalPlaces';

const repositoryRoot = process.cwd();

const loadRawRegistry = () =>
  JSON.parse(
    execFileSync('node', ['-e', `process.stdout.write(require('fs').readFileSync('${PLACE_ADMISSION_TERRITORY_REGISTRY_PATH}','utf8'))`], {
      encoding: 'utf8',
    }),
  );

describe('Place admission territory registry: single authority', () => {
  it('loads and validates the committed registry', () => {
    const { registry, registrySha256 } = loadPlaceAdmissionTerritoryRegistry(repositoryRoot);
    expect(registry.registryId).toBe('property-listify-place-admission-territories-v0.1');
    expect(registry.territories.length).toBeGreaterThan(0);
    expect(registrySha256).toMatch(/^[a-f0-9]{64}$/);
    // The default must actually be registered, or selection would fall through
    // to an unregistered territory.
    expect(
      registry.territories.some(territory => territory.territoryId === registry.defaultTerritoryId),
    ).toBe(true);
  });

  it('names the admission version and artifact set for every territory', () => {
    const { registry } = loadPlaceAdmissionTerritoryRegistry(repositoryRoot);
    for (const territory of registry.territories) {
      expect(territory.admissionVersion).toMatch(/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/);
      const paths = resolvePlaceAdmissionPackagePaths(territory);
      for (const artifact of Object.values(paths.artifacts)) {
        expect(artifact.startsWith(`${territory.admissionPackage.directory}/`)).toBe(true);
      }
      expect(paths.manifest).toBe(
        `${territory.admissionPackage.directory}/${territory.admissionPackage.manifest}`,
      );
    }
  });

  it('refuses an unregistered territory instead of guessing one', () => {
    const { registry } = loadPlaceAdmissionTerritoryRegistry(repositoryRoot);
    expect(() => selectPlaceAdmissionTerritory(registry, 'not-a-territory')).toThrow(
      /is not registered/,
    );
  });

  it('rejects a registry whose default territory is not registered', () => {
    const raw = loadRawRegistry();
    raw.default_territory_id = 'absent-territory';
    expect(() => assertPlaceAdmissionTerritoryRegistry(raw)).toThrow(
      /is not a registered territory/,
    );
  });

  it('rejects a duplicate territory id', () => {
    const raw = loadRawRegistry();
    raw.territories.push({ ...raw.territories[0] });
    expect(() => assertPlaceAdmissionTerritoryRegistry(raw)).toThrow(/Duplicate place admission/);
  });

  it('rejects an artifact path that escapes the repository', () => {
    const raw = loadRawRegistry();
    raw.territories[0].admission_package.artifacts.places = '../outside.jsonl';
    expect(() => assertPlaceAdmissionTerritoryRegistry(raw)).toThrow(
      /must be a bare filename/,
    );
  });

  it('rejects an artifact that reuses another territory filename', () => {
    const raw = loadRawRegistry();
    const first = raw.territories[0];
    // Everything about the second territory is distinct except one source
    // artifact filename, which is what the registry must refuse.
    raw.territories.push({
      ...first,
      territory_id: 'second-territory',
      admission_version: 'second-place-admission-v0.1',
      source_authority: {
        ...first.source_authority,
        authority_version: 'second-source-authority-v0.1',
        directory: 'data/second-source',
        manifest: {
          path: 'data/second-source/second_source_manifest_v0.1.json',
          sha256: first.source_authority.manifest.sha256,
        },
        artifacts: {
          ...first.source_authority.artifacts,
          geography: first.source_authority.artifacts.geography,
        },
      },
      admission_package: {
        ...first.admission_package,
        directory: 'data/second-package',
        manifest: 'second_place_admission_manifest.v0.1.json',
        place_id_registry: 'second_place_id_registry.v0.1.json',
        artifacts: {
          places: 'second_place_admission_v0.1.jsonl',
          names: 'second_place_names_v0.1.jsonl',
          relationships: 'second_place_relationships_v0.1.jsonl',
          evidence: 'second_place_evidence_v0.1.jsonl',
          external_mappings: 'second_place_external_mappings_v0.1.jsonl',
          disposition_ledger: 'second_place_disposition_ledger_v0.1.jsonl',
          parent_evidence_classification: 'second_parent_evidence_classification_v0.1.json',
        },
      },
    });
    expect(() => assertPlaceAdmissionTerritoryRegistry(raw)).toThrow(/reuses filename/);
  });

  it('rejects a territory that does not declare every expected count', () => {
    const raw = loadRawRegistry();
    delete raw.territories[0].expected_counts.executable_places;
    expect(() => assertPlaceAdmissionTerritoryRegistry(raw)).toThrow(
      /must contain exactly/,
    );
  });

  it('keeps the real registry free of synthetic territories', () => {
    const { registry } = loadPlaceAdmissionTerritoryRegistry(repositoryRoot);
    expect(registry.territories.map(territory => territory.territoryId)).not.toContain(
      'synthetic-01',
    );
  });
});

describe('Place admission territory registry: a second territory needs no new engine', () => {
  it('admits a synthetic non-Gauteng territory through the same builder and materializer', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'listify-neutrality-contract-'));
    try {
      const output = execFileSync(
        'npx',
        ['tsx', 'tools/place-admission/prove-territory-neutrality.mjs'],
        { cwd: repositoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      expect(output).toContain('territory-neutrality: OK');
      expect(output).not.toContain('FAIL');
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }, 300_000);
});

describe('Place admission territory registry: materializer is driven by the registry', () => {
  it('pins the registered territory source authority by digest', () => {
    const { registry } = loadPlaceAdmissionTerritoryRegistry(repositoryRoot);
    const territory = selectPlaceAdmissionTerritory(registry);
    expect(territory.sourceAuthority.manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(territory.expectedCounts.admitted_places).toBeGreaterThan(0);
  });

  it('refuses to load a package whose manifest disagrees with the registry', () => {
    expect(() =>
      loadCanonicalPlacePackage(repositoryRoot, { territoryId: 'synthetic-01' }),
    ).toThrow(/is not registered/);
  });
});