/**
 * Place Admission Territory Registry (Place Authority Phase 3).
 *
 * This module is the single authority for *where a territory's governed
 * admission inputs live and what its admitted Place package is called*. It
 * exists because admitting a second province previously required a second
 * engine: the builder and the materializer each hardcoded a Gauteng path, a
 * Gauteng admission version and Gauteng-prefixed artifact filenames.
 *
 * The registry is deliberately **not** an extension of the Slice 1 runtime
 * projection catalog (`data/geography-coverage-v0.1/territory-catalog.v0.1.json`).
 * That catalog pins the frozen runtime natural-key projection and is registered
 * CANONICAL in geography-coverage-contract.md §10; the territory-neutrality
 * proof is required to run a synthetic non-Gauteng territory *without adding
 * fictional rows to the real catalog* (§12.7), which a single shared file could
 * not satisfy. The two files have disjoint fields, disjoint artifacts and
 * disjoint lifecycles: one pins frozen projections, this one names the admission
 * pipeline's inputs and outputs.
 *
 * What this registry does and does not decide:
 *
 * - It **names** a territory's source authority, admission version, package
 *   directory and artifact filenames. That is all a territory entry may vary.
 * - It does **not** hold geography rows, adjudicate Places, or license sources.
 *   Those remain the source authority's and the builder's governed jobs.
 * - Admitting a new province must be a new registry entry plus its governed
 *   source evidence. It must never add application architecture.
 *
 * Every field is validated and the load fails closed. A territory id is never
 * inferred from a directory name, and a package is never located by guessing.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const PLACE_ADMISSION_TERRITORY_REGISTRY_PATH =
  'data/place-admission-territories.v0.1/territory-registry.v0.1.json';

export const PLACE_ADMISSION_TERRITORY_REGISTRY_SCHEMA_VERSION = '0.1' as const;

/**
 * The source-authority artifacts the builder consumes, keyed by the role they
 * play in admission. The set is closed on purpose: adding a new source artifact
 * is a contract change to the admission pipeline, not a per-territory decision.
 */
export const PLACE_ADMISSION_SOURCE_ARTIFACT_KEYS = [
  'geography',
  'names',
  'source_links',
  'candidate_dispositions',
] as const;

/**
 * The admission-package artifacts the builder writes and the materializer
 * reads. `places`/`names`/`relationships`/`evidence`/`external_mappings` are the
 * rows loaded into the Place tables; `disposition_ledger` and
 * `parent_evidence_classification` are governance evidence that must accompany
 * the rows.
 */
export const PLACE_ADMISSION_PACKAGE_ARTIFACT_KEYS = [
  'places',
  'names',
  'relationships',
  'evidence',
  'external_mappings',
  'disposition_ledger',
  'parent_evidence_classification',
] as const;

/** Counts the builder must reproduce exactly for a territory. */
export const PLACE_ADMISSION_EXPECTED_COUNT_KEYS = [
  'source_identities',
  'admitted_places',
  'names',
  'relationships',
  'evidence_rows',
  'external_mappings',
  'disposition_ledger_rows',
  'executable_places',
] as const;

/** Counts that describe the frozen v0.1 coverage comparison baseline. */
export const PLACE_ADMISSION_COVERAGE_BASELINE_COUNT_KEYS = [
  'factual_identity_count',
  'runtime_row_count',
  'queued_count',
  'awaiting_accepted_parent_edge',
  'duplicate_natural_key_within_parent',
  'natural_key_owned_by_accepted_row',
  'co_published_natural_keys',
] as const;

export interface PlaceAdmissionArtifactPin {
  path: string;
  sha256: string;
}

export interface PlaceAdmissionTerritory {
  readonly territoryId: string;
  readonly displayName: string;
  readonly admissionVersion: string;
  readonly sourceAuthority: {
    readonly authorityVersion: string;
    readonly directory: string;
    readonly manifest: PlaceAdmissionArtifactPin;
    readonly artifacts: Readonly<Record<SourceArtifactKey, string>>;
  };
  readonly coverageBaseline: {
    readonly directory: string;
    readonly territoryManifest: string;
    readonly territoryCatalog: string;
    readonly counts: Readonly<Record<CoverageBaselineCountKey, number>>;
  };
  readonly admissionPackage: {
    readonly directory: string;
    readonly manifest: string;
    readonly placeIdRegistry: string;
    readonly artifacts: Readonly<Record<PackageArtifactKey, string>>;
  };
  readonly expectedCounts: Readonly<Record<ExpectedCountKey, number>>;
}

export interface PlaceAdmissionTerritoryRegistry {
  readonly schemaVersion: typeof PLACE_ADMISSION_TERRITORY_REGISTRY_SCHEMA_VERSION;
  readonly registryId: string;
  readonly defaultTerritoryId: string;
  readonly territories: readonly PlaceAdmissionTerritory[];
}

export type SourceArtifactKey = (typeof PLACE_ADMISSION_SOURCE_ARTIFACT_KEYS)[number];
export type PackageArtifactKey = (typeof PLACE_ADMISSION_PACKAGE_ARTIFACT_KEYS)[number];
export type ExpectedCountKey = (typeof PLACE_ADMISSION_EXPECTED_COUNT_KEYS)[number];
export type CoverageBaselineCountKey =
  (typeof PLACE_ADMISSION_COVERAGE_BASELINE_COUNT_KEYS)[number];

const TOKEN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REGISTRY_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const VERSION_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertToken(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !TOKEN_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase kebab-case token.`);
  }
}

function assertVersion(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !VERSION_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase dotted version token.`);
  }
}

/**
 * A repository-relative path that cannot escape the repository root. Rejects
 * absolute paths, backslashes and `..` segments so a registry entry cannot
 * address a file outside the reviewed tree.
 */
function assertSafeRelativePath(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.split('/').includes('..')
  ) {
    throw new Error(`${label} must be a safe repository-relative path.`);
  }
}

function assertSha256(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  }
}

function assertCount(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

/**
 * Filenames, as opposed to directories. Kept separate from
 * `assertSafeRelativePath` so an artifact can never silently become a path that
 * points outside its territory's own directory.
 */
function assertFilename(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('/') ||
    value.includes('\\') ||
    value === '.' ||
    value === '..'
  ) {
    throw new Error(`${label} must be a bare filename with no directory separator.`);
  }
}

function assertExactKeySet(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) {
    throw new Error(`${label} must contain exactly: ${expected.join(', ')}.`);
  }
}

function joinRelative(directory: string, filename: string): string {
  return `${directory.replace(/\/+$/, '')}/${filename}`;
}

function toArtifactMap<TKey extends string>(
  raw: unknown,
  keys: readonly TKey[],
  label: string,
): Record<TKey, string> {
  const record = assertRecord(raw, label);
  assertExactKeySet(record, keys, label);
  const result = {} as Record<TKey, string>;
  for (const key of keys) {
    assertFilename(record[key], `${label} ${key}`);
    result[key] = record[key];
  }
  return result;
}

function toCountMap<TKey extends string>(
  raw: unknown,
  keys: readonly TKey[],
  label: string,
): Record<TKey, number> {
  const record = assertRecord(raw, label);
  assertExactKeySet(record, keys, label);
  const result = {} as Record<TKey, number>;
  for (const key of keys) {
    assertCount(record[key], `${label} ${key}`);
    result[key] = record[key] as number;
  }
  return result;
}

export function assertPlaceAdmissionTerritoryRegistry(
  value: unknown,
): asserts value is Record<string, unknown> {
  const registry = assertRecord(value, 'Place admission territory registry');
  if (registry.schema_version !== PLACE_ADMISSION_TERRITORY_REGISTRY_SCHEMA_VERSION) {
    throw new Error('Place admission territory registry has an unsupported schema version.');
  }
  if (
    typeof registry.registry_id !== 'string' ||
    !REGISTRY_ID_PATTERN.test(registry.registry_id)
  ) {
    throw new Error('Place admission territory registry registry_id is invalid.');
  }
  assertToken(registry.default_territory_id, 'Place admission territory registry default id');
  if (!Array.isArray(registry.territories) || registry.territories.length === 0) {
    throw new Error('Place admission territory registry must contain at least one territory.');
  }

  const territoryIds = new Set<string>();
  const admissionVersions = new Set<string>();
  const packageDirectories = new Set<string>();
  const pinnedManifestPaths = new Set<string>();
  const filenames = new Set<string>();

  registry.territories.forEach((value, index) => {
    const label = `Place admission territory ${index}`;
    const territory = assertRecord(value, label);
    assertToken(territory.territory_id, `${label} territory_id`);
    if (territoryIds.has(territory.territory_id)) {
      throw new Error(`Duplicate place admission territory ${territory.territory_id}.`);
    }
    territoryIds.add(territory.territory_id);

    if (
      typeof territory.display_name !== 'string' ||
      !territory.display_name.trim()
    ) {
      throw new Error(`${label} display_name is required.`);
    }

    assertVersion(territory.admission_version, `${label} admission_version`);
    if (admissionVersions.has(territory.admission_version)) {
      throw new Error(`Duplicate place admission version ${territory.admission_version}.`);
    }
    admissionVersions.add(territory.admission_version);

    const source = assertRecord(territory.source_authority, `${label} source_authority`);
    assertVersion(source.authority_version, `${label} source authority_version`);
    assertSafeRelativePath(source.directory, `${label} source directory`);
    const sourceManifest = assertRecord(source.manifest, `${label} source manifest`);
    assertSafeRelativePath(sourceManifest.path, `${label} source manifest path`);
    assertSha256(sourceManifest.sha256, `${label} source manifest sha256`);
    if (pinnedManifestPaths.has(sourceManifest.path)) {
      throw new Error(
        `Place admission territory registry pins source manifest ${sourceManifest.path} twice.`,
      );
    }
    pinnedManifestPaths.add(sourceManifest.path);
    const sourceArtifacts = toArtifactMap(
      source.artifacts,
      PLACE_ADMISSION_SOURCE_ARTIFACT_KEYS,
      `${label} source artifacts`,
    );
    for (const filename of Object.values(sourceArtifacts)) {
      if (filenames.has(filename)) {
        throw new Error(`Place admission territory registry reuses filename ${filename}.`);
      }
      filenames.add(filename);
    }

    const baseline = assertRecord(territory.coverage_baseline, `${label} coverage_baseline`);
    assertSafeRelativePath(baseline.directory, `${label} coverage baseline directory`);
    assertFilename(baseline.territory_manifest, `${label} coverage baseline territory_manifest`);
    assertFilename(baseline.territory_catalog, `${label} coverage baseline territory_catalog`);
    toCountMap(
      baseline.counts,
      PLACE_ADMISSION_COVERAGE_BASELINE_COUNT_KEYS,
      `${label} coverage baseline counts`,
    );

    const admissionPackage = assertRecord(territory.admission_package, `${label} admission_package`);
    assertSafeRelativePath(admissionPackage.directory, `${label} admission package directory`);
    if (packageDirectories.has(admissionPackage.directory)) {
      throw new Error(
        `Duplicate place admission package directory ${admissionPackage.directory}.`,
      );
    }
    packageDirectories.add(admissionPackage.directory);
    assertFilename(admissionPackage.manifest, `${label} admission package manifest`);
    assertFilename(admissionPackage.place_id_registry, `${label} admission package place_id_registry`);
    const packageArtifacts = toArtifactMap(
      admissionPackage.artifacts,
      PLACE_ADMISSION_PACKAGE_ARTIFACT_KEYS,
      `${label} admission package artifacts`,
    );
    for (const filename of Object.values(packageArtifacts)) {
      if (filenames.has(filename)) {
        throw new Error(`Place admission territory registry reuses filename ${filename}.`);
      }
      filenames.add(filename);
    }

    toCountMap(
      territory.expected_counts,
      PLACE_ADMISSION_EXPECTED_COUNT_KEYS,
      `${label} expected_counts`,
    );
  });

  if (!territoryIds.has(registry.default_territory_id)) {
    throw new Error(
      `Place admission territory registry default ${registry.default_territory_id} is not a registered territory.`,
    );
  }
}

/** Build the resolved repository paths for one territory's admission inputs. */
export function resolvePlaceAdmissionSourcePaths(territory: PlaceAdmissionTerritory) {
  const directory = territory.sourceAuthority.directory;
  return {
    manifest: territory.sourceAuthority.manifest.path,
    artifacts: Object.fromEntries(
      Object.entries(territory.sourceAuthority.artifacts).map(([key, filename]) => [
        key,
        joinRelative(directory, filename),
      ]),
    ) as Record<SourceArtifactKey, string>,
  };
}

/** Build the resolved repository paths for one territory's admitted package. */
export function resolvePlaceAdmissionPackagePaths(territory: PlaceAdmissionTerritory) {
  const directory = territory.admissionPackage.directory;
  return {
    manifest: joinRelative(directory, territory.admissionPackage.manifest),
    placeIdRegistry: joinRelative(directory, territory.admissionPackage.placeIdRegistry),
    artifacts: Object.fromEntries(
      Object.entries(territory.admissionPackage.artifacts).map(([key, filename]) => [
        key,
        joinRelative(directory, filename),
      ]),
    ) as Record<PackageArtifactKey, string>,
  };
}

export function resolvePlaceAdmissionCoverageBaselinePaths(territory: PlaceAdmissionTerritory) {
  const directory = territory.coverageBaseline.directory;
  return {
    territoryManifest: joinRelative(directory, territory.coverageBaseline.territoryManifest),
    territoryCatalog: joinRelative(directory, territory.coverageBaseline.territoryCatalog),
  };
}

export function toPlaceAdmissionTerritoryRegistry(value: unknown): PlaceAdmissionTerritoryRegistry {
  assertPlaceAdmissionTerritoryRegistry(value);
  const registry = value as Record<string, unknown>;
  return {
    schemaVersion: PLACE_ADMISSION_TERRITORY_REGISTRY_SCHEMA_VERSION,
    registryId: registry.registry_id as string,
    defaultTerritoryId: registry.default_territory_id as string,
    territories: (registry.territories as Record<string, unknown>[]).map(raw => {
      const territory = raw as Record<string, any>;
      const source = territory.source_authority as Record<string, any>;
      const baseline = territory.coverage_baseline as Record<string, any>;
      const admissionPackage = territory.admission_package as Record<string, any>;
      return {
        territoryId: territory.territory_id as string,
        displayName: territory.display_name as string,
        admissionVersion: territory.admission_version as string,
        sourceAuthority: {
          authorityVersion: source.authority_version as string,
          directory: source.directory as string,
          manifest: {
            path: source.manifest.path as string,
            sha256: source.manifest.sha256 as string,
          },
          artifacts: { ...(source.artifacts as Record<SourceArtifactKey, string>) },
        },
        coverageBaseline: {
          directory: baseline.directory as string,
          territoryManifest: baseline.territory_manifest as string,
          territoryCatalog: baseline.territory_catalog as string,
          counts: { ...(baseline.counts as Record<CoverageBaselineCountKey, number>) },
        },
        admissionPackage: {
          directory: admissionPackage.directory as string,
          manifest: admissionPackage.manifest as string,
          placeIdRegistry: admissionPackage.place_id_registry as string,
          artifacts: {
            ...(admissionPackage.artifacts as Record<PackageArtifactKey, string>),
          },
        },
        expectedCounts: {
          ...(territory.expected_counts as Record<ExpectedCountKey, number>),
        },
      } satisfies PlaceAdmissionTerritory;
    }),
  };
}

function resolveRepositoryPath(rootDirectory: string, relativePath: string): string {
  const root = path.resolve(rootDirectory);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Place admission artifact escapes its root: ${relativePath}`);
  }
  return resolved;
}

export function readVerifiedPlaceAdmissionArtifact(
  rootDirectory: string,
  pin: PlaceAdmissionArtifactPin,
): Buffer {
  const bytes = readFileSync(resolveRepositoryPath(rootDirectory, pin.path));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== pin.sha256) {
    throw new Error(
      `Place admission artifact ${pin.path} digest ${actual} does not match ${pin.sha256}.`,
    );
  }
  return bytes;
}

export interface LoadedPlaceAdmissionTerritoryRegistry {
  readonly registry: PlaceAdmissionTerritoryRegistry;
  readonly registryPath: string;
  readonly registrySha256: string;
}

/**
 * Load, validate and digest-verify the committed registry.
 *
 * The registry's own digest is returned so a caller can record which registry
 * version produced a package, exactly as the builder already records the source
 * snapshot it read.
 */
export function loadPlaceAdmissionTerritoryRegistry(
  rootDirectory: string,
  registryPath: string = PLACE_ADMISSION_TERRITORY_REGISTRY_PATH,
): LoadedPlaceAdmissionTerritoryRegistry {
  const bytes = readFileSync(resolveRepositoryPath(rootDirectory, registryPath));
  const registrySha256 = createHash('sha256').update(bytes).digest('hex');
  return {
    registry: toPlaceAdmissionTerritoryRegistry(JSON.parse(bytes.toString('utf8'))),
    registryPath,
    registrySha256,
  };
}

export function selectPlaceAdmissionTerritory(
  registry: PlaceAdmissionTerritoryRegistry,
  territoryId?: string,
): PlaceAdmissionTerritory {
  const requestedId = territoryId ?? registry.defaultTerritoryId;
  const territory = registry.territories.find(candidate => candidate.territoryId === requestedId);
  if (!territory) {
    const known = registry.territories.map(candidate => candidate.territoryId).join(', ');
    throw new Error(
      `Place admission territory ${requestedId} is not registered. Registered territories: ${known}.`,
    );
  }
  return territory;
}