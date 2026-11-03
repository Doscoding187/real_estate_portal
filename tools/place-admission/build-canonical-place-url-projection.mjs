#!/usr/bin/env node
/* global console, process */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCanonicalPlaceUrlProjection,
} from '../../shared/canonicalPlaceUrlProjection.ts';
import {
  loadPlaceAdmissionTerritoryRegistry,
  resolvePlaceAdmissionPackagePaths,
  PLACE_ADMISSION_TERRITORY_REGISTRY_PATH,
} from '../../shared/placeAdmissionTerritories.ts';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const OUTPUT = 'data/place-url-projection-national-v0.1.json';
const CHECK_ONLY = process.argv.includes('--check');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJsonl(bytes, artifactPath) {
  return bytes
    .toString('utf8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(
          `canonical-place-url projection refused: invalid JSON at ${artifactPath}:${index + 1}: ${error.message}`,
        );
      }
    });
}

function readPinnedJson(relativePath, sha256Expected) {
  const bytes = readFileSync(path.resolve(ROOT, relativePath));
  const actual = sha256(bytes);
  if (actual !== sha256Expected) {
    throw new Error(
      `canonical-place-url projection refused: ${relativePath} digest ${actual} does not match ${sha256Expected}`,
    );
  }
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

function createProjection() {
  const registryLoad = loadPlaceAdmissionTerritoryRegistry(
    ROOT,
    PLACE_ADMISSION_TERRITORY_REGISTRY_PATH,
  );
  const territories = registryLoad.registry.territories.map(territory => {
    const packagePaths = resolvePlaceAdmissionPackagePaths(territory);
    const packageManifestBytes = readFileSync(path.resolve(ROOT, packagePaths.manifest));
    const packageManifest = JSON.parse(packageManifestBytes.toString('utf8'));
    if (packageManifest.admission_version !== territory.admissionVersion) {
      throw new Error(
        `canonical-place-url projection refused: ${territory.territoryId} package version does not match its registry`,
      );
    }
    const sourceManifest = readPinnedJson(
      territory.sourceAuthority.manifest.path,
      territory.sourceAuthority.manifest.sha256,
    ).value;
    if (sourceManifest.authority_version !== territory.sourceAuthority.authorityVersion) {
      throw new Error(
        `canonical-place-url projection refused: ${territory.territoryId} source authority version does not match its registry`,
      );
    }
    if (
      packageManifest.generated_from?.source_manifest_path !==
        territory.sourceAuthority.manifest.path ||
      packageManifest.generated_from?.source_manifest_sha256 !==
        territory.sourceAuthority.manifest.sha256
    ) {
      throw new Error(
        `canonical-place-url projection refused: ${territory.territoryId} package is not pinned to its registered source authority`,
      );
    }

    const artifactEntries = ['places', 'names', 'relationships'].map(key => {
      const artifactPath = packagePaths.artifacts[key];
      const bytes = readFileSync(path.resolve(ROOT, artifactPath));
      return { path: artifactPath, sha256: sha256(bytes), bytes };
    });
    const artifactByKey = new Map(
      ['places', 'names', 'relationships'].map((key, index) => [key, artifactEntries[index]]),
    );
    return {
      territory_id: territory.territoryId,
      display_name: territory.displayName,
      admission_version: territory.admissionVersion,
      package_manifest_path: packagePaths.manifest,
      package_manifest_sha256: sha256(packageManifestBytes),
      package_artifacts: artifactEntries.map(({ path: artifactPath, sha256: digest }) => ({
        path: artifactPath,
        sha256: digest,
      })),
      places: readJsonl(artifactByKey.get('places').bytes, artifactByKey.get('places').path),
      names: readJsonl(artifactByKey.get('names').bytes, artifactByKey.get('names').path),
      relationships: readJsonl(
        artifactByKey.get('relationships').bytes,
        artifactByKey.get('relationships').path,
      ),
    };
  });

  return buildCanonicalPlaceUrlProjection({
    registryPath: registryLoad.registryPath,
    registrySha256: registryLoad.registrySha256,
    territories,
  });
}

function main() {
  const result = createProjection();
  const expected = `${JSON.stringify(result, null, 2)}\n`;
  const outputPath = path.resolve(ROOT, OUTPUT);

  if (CHECK_ONLY) {
    let actual;
    try {
      actual = readFileSync(outputPath, 'utf8');
    } catch {
      throw new Error(`canonical-place-url projection is missing: ${OUTPUT}`);
    }
    if (actual !== expected) {
      throw new Error(`canonical-place-url projection is stale: ${OUTPUT}`);
    }
    console.log(
      `Canonical Place URL projection is reproducible: ${result.summary.route_entries} routes; ` +
        `${result.summary.collision_disambiguations} stable collision suffixes.`,
    );
    return;
  }

  writeFileSync(outputPath, expected, 'utf8');
  console.log(
    `Wrote ${OUTPUT}: ${result.summary.route_entries} routes; ` +
      `${result.summary.by_scope.province} provinces, ${result.summary.by_scope.metro_city} city/town scopes, ` +
      `${result.summary.by_scope.locality} localities; ${result.summary.collision_disambiguations} stable collision suffixes.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
