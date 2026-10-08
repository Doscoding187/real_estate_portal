#!/usr/bin/env node
/* global console, process */
/**
 * Territory-neutrality proof (Place Authority Phase 3 gate).
 *
 * Proves the Phase 3 gate: admitting a second territory requires no new
 * application architecture. It writes a synthetic non-Gauteng territory into a
 * throwaway directory and drives the **real** admission builder and the **real**
 * Place materializer against it.
 *
 * What it proves:
 *
 *  1. the same builder admits a non-Gauteng territory with no code change;
 *  2. the admitted package is digest-pinned by its manifest and by the registry;
 *  3. regenerating is byte-identical and mints no new Place IDs;
 *  4. the real materializer loads the synthetic package, so materializing a
 *     second province needs no adapter change;
 *  5. the real territory registry and the real projection catalog are untouched,
 *     so no fictional row enters the governed catalog.
 *
 * The synthetic directory is removed afterwards. Nothing fictional is committed.
 *
 * Usage:
 *   tsx tools/place-admission/prove-territory-neutrality.mjs
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadPlaceAdmissionTerritoryRegistry,
  selectPlaceAdmissionTerritory,
} from '../../shared/placeAdmissionTerritories.ts';

import { loadCanonicalPlacePackage } from '../../server/_core/databaseAuthority/dataAdapters/canonicalPlaces.ts';

import { writeSyntheticTerritoryFixture } from './synthetic-territory-fixture.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const BUILDER = resolve(HERE, 'build-place-admission.mjs');
const REAL_REGISTRY = 'data/place-admission-territories.v0.1/territory-registry.v0.1.json';
const REAL_CATALOG = 'data/geography-coverage-v0.1/territory-catalog.v0.1.json';

const failures = [];
const check = (label, condition, detail) => {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
};

const sha256File = path => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Every file under a directory, as sorted absolute paths. */
const listFiles = directory => {
  const found = [];
  const walk = current => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) walk(full);
      else found.push(full);
    }
  };
  walk(directory);
  return found.sort();
};

const snapshotDigests = directory =>
  new Map(listFiles(directory).map(file => [file, sha256File(file)]));

const runBuilder = (cwd, args) =>
  execFileSync('npx', ['tsx', BUILDER, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const main = () => {
  const realRegistryBefore = sha256File(resolve(REPO_ROOT, REAL_REGISTRY));
  const realCatalogBefore = sha256File(resolve(REPO_ROOT, REAL_CATALOG));

  const scratch = mkdtempSync(join(tmpdir(), 'listify-territory-neutrality-'));
  try {
    const fixture = writeSyntheticTerritoryFixture(scratch);

    console.log(`territory-neutrality: building synthetic territory ${fixture.territoryId}`);
    const built = runBuilder(scratch, ['--registry', fixture.registryPath]);
    console.log(`  ${built}`);

    const registryLoad = loadPlaceAdmissionTerritoryRegistry(scratch, fixture.registryPath);
    const territory = selectPlaceAdmissionTerritory(registryLoad.registry, fixture.territoryId);

    check(
      'registry resolves the synthetic territory',
      territory.territoryId === fixture.territoryId,
      territory.territoryId,
    );
    check(
      'admission version comes from the registry, not from code',
      territory.admissionVersion === fixture.admissionVersion,
      territory.admissionVersion,
    );

    // The builder refuses to run at all if the manifest advertises a path it
    // never wrote, so a completed build is already proof of path coherence.
    check('builder completed and validated its own manifest paths', built.includes('built'));

    const packageDir = resolve(scratch, territory.admissionPackage.directory);
    const firstPass = snapshotDigests(packageDir);

    const checked = runBuilder(scratch, ['--registry', fixture.registryPath, '--check']);
    check('regeneration check passes byte-identically', checked.includes('check OK'), checked);

    const secondPass = snapshotDigests(packageDir);
    const stable =
      firstPass.size === secondPass.size &&
      [...firstPass].every(([file, digest]) => secondPass.get(file) === digest);
    check(
      `package is byte-identical across runs (${firstPass.size} artifacts)`,
      stable,
      stable ? '' : 'digests differ between the first and second build',
    );

    const rebuilt = runBuilder(scratch, ['--registry', fixture.registryPath]);
    check(
      `regeneration mints no Place IDs (minted=0 reused=${fixture.expected.admittedPlaces})`,
      rebuilt.includes(`minted=0 reused=${fixture.expected.admittedPlaces}`),
      rebuilt,
    );
    check(
      'the Place-ID registry is itself stable across regeneration',
      [...firstPass].every(([file, digest]) => snapshotDigests(packageDir).get(file) === digest),
    );

    const manifest = JSON.parse(
      readFileSync(resolve(packageDir, territory.admissionPackage.manifest), 'utf8'),
    );
    check(
      'manifest records the territory and the registry that produced it',
      manifest.territory?.territory_id === fixture.territoryId &&
        manifest.territory?.admission_registry_sha256 === registryLoad.registrySha256,
      JSON.stringify(manifest.territory),
    );
    check(
      `admitted ${fixture.expected.admittedPlaces} Places with ${fixture.expected.containmentEdges} containment edges`,
      manifest.counts.admitted_places === fixture.expected.admittedPlaces &&
        manifest.counts.relationships === fixture.expected.containmentEdges,
      `places=${manifest.counts.admitted_places} relationships=${manifest.counts.relationships}`,
    );
    check(
      `search scopes are derived, so only ${fixture.expected.executablePlaces} Places are executable`,
      manifest.counts.executable_places === fixture.expected.executablePlaces,
      `executable=${manifest.counts.executable_places}`,
    );
    check(
      'municipalities stay context-only and are never search levels',
      manifest.counts.scope_establishment.by_scope.locality.established ===
        fixture.expected.executablePlaces - 1,
      JSON.stringify(manifest.counts.scope_establishment.by_scope),
    );
    check(
      `every source candidate receives a disposition (${fixture.expected.quarantinedCandidates} candidates)`,
      manifest.counts.disposition_ledger_rows === fixture.expected.quarantinedCandidates &&
        manifest.counts.dispositions.quarantined_candidate ===
          fixture.expected.quarantinedCandidates,
      JSON.stringify(manifest.counts.dispositions),
    );
    check(
      'no relationship-driven search widening was introduced',
      manifest.governed_policy.search_scope_authorization_in_slice_2 === 0,
    );

    // The real materializer, unchanged, must load the synthetic package.
    const loaded = loadCanonicalPlacePackage(scratch, {
      territoryId: fixture.territoryId,
      registryPath: fixture.registryPath,
    });
    check(
      'the unchanged materializer loads the synthetic package',
      loaded.manifest.admission_version === fixture.admissionVersion &&
        loaded.rows.places.length === fixture.expected.admittedPlaces,
      `version=${loaded.manifest.admission_version} places=${loaded.rows.places.length}`,
    );
    check(
      'materializer reports the territory it loaded',
      loaded.territory.territoryId === fixture.territoryId,
      loaded.territory.territoryId,
    );
    check(
      'materializer produced a content digest over the admitted rows',
      /^[a-f0-9]{64}$/.test(loaded.verifiedDigest),
      loaded.verifiedDigest,
    );

    check(
      'an unregistered territory is refused rather than guessed',
      (() => {
        try {
          selectPlaceAdmissionTerritory(registryLoad.registry, 'za-wc');
          return false;
        } catch {
          return true;
        }
      })(),
    );

    check(
      'the real territory registry is unchanged by the proof',
      sha256File(resolve(REPO_ROOT, REAL_REGISTRY)) === realRegistryBefore,
    );
    check(
      'the real projection catalog gained no synthetic source',
      sha256File(resolve(REPO_ROOT, REAL_CATALOG)) === realCatalogBefore,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  if (failures.length) {
    throw new Error(
      `territory-neutrality proof failed:\n  ${failures.join('\n  ')}`,
    );
  }
  console.log('territory-neutrality: OK a second territory needs no new architecture');
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}