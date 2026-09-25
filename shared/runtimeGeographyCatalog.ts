import { isRuntimeNaturalKey } from './factualRuntimeGeographyBridge';

export const LOCATION_AUTHORITY_CATALOG_SCHEMA_VERSION = '0.1' as const;

export interface LocationAuthorityCatalogArtifact {
  path: string;
  sha256: string;
}

export interface LocationAuthorityCatalogSource {
  sourceId: string;
  rootNaturalKey: string;
  factualIdNamespaces: readonly string[];
  manifest: LocationAuthorityCatalogArtifact;
  runtimeProjection: LocationAuthorityCatalogArtifact;
  factualMapping: LocationAuthorityCatalogArtifact;
  expectedManifestVersion: string;
  expectedProjectionVersion: string;
  expectedRuntimeRows: number;
  expectedFactualEntries: number;
  expectedProjectionReadyEntries: number;
  expectedCoPublishedNaturalKeys: number;
}

export interface LocationAuthorityCatalog {
  schemaVersion: typeof LOCATION_AUTHORITY_CATALOG_SCHEMA_VERSION;
  catalogId: string;
  sources: readonly LocationAuthorityCatalogSource[];
}

interface RawLocationAuthorityCatalogSource {
  source_id: string;
  root_natural_key: string;
  factual_id_namespaces: string[];
  manifest: LocationAuthorityCatalogArtifact;
  runtime_projection: LocationAuthorityCatalogArtifact;
  factual_mapping: LocationAuthorityCatalogArtifact;
  expected_manifest_version: string;
  expected_projection_version: string;
  expected_runtime_rows: number;
  expected_factual_entries: number;
  expected_projection_ready_entries: number;
  expected_co_published_natural_keys: number;
}

interface RawLocationAuthorityCatalog {
  schema_version: typeof LOCATION_AUTHORITY_CATALOG_SCHEMA_VERSION;
  catalog_id: string;
  sources: RawLocationAuthorityCatalogSource[];
}

const TOKEN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATALOG_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

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

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function assertArtifact(
  value: unknown,
  label: string,
): asserts value is LocationAuthorityCatalogArtifact {
  const artifact = assertRecord(value, label);
  if (
    typeof artifact.path !== 'string' ||
    !artifact.path ||
    artifact.path.startsWith('/') ||
    artifact.path.includes('\\') ||
    artifact.path.split('/').includes('..')
  ) {
    throw new Error(`${label}.path must be a safe repository-relative path.`);
  }
  if (typeof artifact.sha256 !== 'string' || !SHA256_PATTERN.test(artifact.sha256)) {
    throw new Error(`${label}.sha256 must be a lowercase SHA-256 digest.`);
  }
}

export function assertLocationAuthorityCatalog(
  value: unknown,
): asserts value is RawLocationAuthorityCatalog {
  const catalog = assertRecord(value, 'Location authority catalog');
  if (catalog.schema_version !== LOCATION_AUTHORITY_CATALOG_SCHEMA_VERSION) {
    throw new Error('Location authority catalog has an unsupported schema version.');
  }
  if (typeof catalog.catalog_id !== 'string' || !CATALOG_ID_PATTERN.test(catalog.catalog_id)) {
    throw new Error('Location authority catalog catalog_id is invalid.');
  }
  if (!Array.isArray(catalog.sources) || catalog.sources.length === 0) {
    throw new Error('Location authority catalog must contain at least one source.');
  }

  const sourceIds = new Set<string>();
  const rootNaturalKeys = new Set<string>();
  const artifactPaths = new Set<string>();
  catalog.sources.forEach((value, index) => {
    const label = `Location authority catalog source ${index}`;
    const source = assertRecord(value, label);
    assertToken(source.source_id, `${label} source_id`);
    if (sourceIds.has(source.source_id)) {
      throw new Error(`Duplicate location authority source ${source.source_id}.`);
    }
    sourceIds.add(source.source_id);

    if (
      typeof source.root_natural_key !== 'string' ||
      !isRuntimeNaturalKey(source.root_natural_key) ||
      !TOKEN_PATTERN.test(source.root_natural_key)
    ) {
      throw new Error(`${label} root_natural_key must be one runtime key segment.`);
    }
    if (rootNaturalKeys.has(source.root_natural_key)) {
      throw new Error(`Duplicate location authority root ${source.root_natural_key}.`);
    }
    rootNaturalKeys.add(source.root_natural_key);

    if (!Array.isArray(source.factual_id_namespaces) || source.factual_id_namespaces.length === 0) {
      throw new Error(`${label} factual_id_namespaces must be a non-empty array.`);
    }
    const namespaces = new Set<string>();
    source.factual_id_namespaces.forEach((namespace, namespaceIndex) => {
      assertToken(namespace, `${label} factual namespace ${namespaceIndex}`);
      if (namespaces.has(namespace)) {
        throw new Error(`${label} repeats factual namespace ${namespace}.`);
      }
      namespaces.add(namespace);
    });

    for (const [field, labelPrefix] of [
      ['manifest', 'manifest'],
      ['runtime_projection', 'runtime projection'],
      ['factual_mapping', 'factual mapping'],
    ] as const) {
      assertArtifact(source[field], `${label} ${labelPrefix}`);
      const artifactPath = (source[field] as LocationAuthorityCatalogArtifact).path;
      if (artifactPaths.has(artifactPath)) {
        throw new Error(`Location authority catalog reuses artifact ${artifactPath}.`);
      }
      artifactPaths.add(artifactPath);
    }

    if (
      typeof source.expected_manifest_version !== 'string' ||
      !source.expected_manifest_version.trim()
    ) {
      throw new Error(`${label} expected_manifest_version is required.`);
    }
    if (
      typeof source.expected_projection_version !== 'string' ||
      !source.expected_projection_version.trim()
    ) {
      throw new Error(`${label} expected_projection_version is required.`);
    }
    assertPositiveInteger(source.expected_runtime_rows, `${label} expected_runtime_rows`);
    assertPositiveInteger(source.expected_factual_entries, `${label} expected_factual_entries`);
    assertPositiveInteger(
      source.expected_projection_ready_entries,
      `${label} expected_projection_ready_entries`,
    );
    assertNonNegativeInteger(
      source.expected_co_published_natural_keys,
      `${label} expected_co_published_natural_keys`,
    );
  });
}

export function toLocationAuthorityCatalog(value: unknown): LocationAuthorityCatalog {
  assertLocationAuthorityCatalog(value);
  return {
    schemaVersion: value.schema_version,
    catalogId: value.catalog_id,
    sources: value.sources.map(source => ({
      sourceId: source.source_id,
      rootNaturalKey: source.root_natural_key,
      factualIdNamespaces: [...source.factual_id_namespaces],
      manifest: source.manifest,
      runtimeProjection: source.runtime_projection,
      factualMapping: source.factual_mapping,
      expectedManifestVersion: source.expected_manifest_version,
      expectedProjectionVersion: source.expected_projection_version,
      expectedRuntimeRows: source.expected_runtime_rows,
      expectedFactualEntries: source.expected_factual_entries,
      expectedProjectionReadyEntries: source.expected_projection_ready_entries,
      expectedCoPublishedNaturalKeys: source.expected_co_published_natural_keys,
    })),
  };
}
