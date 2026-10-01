import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FactualRuntimeProjectionAuthority,
  isFactualGeographyIdInNamespace,
  type FactualRuntimeEvidenceProvenance,
  type FactualRuntimeNaturalKeyCoPublication,
  type FactualRuntimeProjectionEntry,
  type FactualRuntimeReconciliationDisposition,
  type RuntimeProjectionStatus,
  type RuntimeReferenceStatus,
  type RuntimeSearchScopeKind,
} from '../shared/factualRuntimeGeographyBridge';
import {
  assertGovernedRuntimeReferenceProjection,
  type GovernedRuntimeReferenceProjection,
  type GovernedRuntimeReferenceRow,
} from '../shared/runtimeGeography';
import {
  toLocationAuthorityCatalog,
  type LocationAuthorityCatalog,
  type LocationAuthorityCatalogArtifact,
  type LocationAuthorityCatalogSource,
} from '../shared/runtimeGeographyCatalog';

export const LOCATION_AUTHORITY_CATALOG_INDEX_PATH =
  'data/geography-coverage-v0.1/territory-catalog.v0.1.json';

interface RawFactualRuntimeProjectionRow {
  factual_location_id: string;
  factual_preferred_name: string;
  factual_type: string;
  factual_context?: {
    province_slug?: string;
    administrative_context_names?: string[];
    hierarchy_state?: string;
    accepted_context_location_id?: string;
    accepted_context_location_name?: string;
    accepted_context_relationship?: string;
  };
  runtime_search_scope_kind?: RuntimeSearchScopeKind | null;
  runtime_natural_key?: string | null;
  runtime_parent_natural_key?: string | null;
  runtime_parent_relationship?: string | null;
  projection_status: RuntimeProjectionStatus;
  runtime_reference_status?: RuntimeReferenceStatus | null;
  reconciliation_disposition?: {
    factual_disposition: string;
    membership_recommendation: string;
    current_place_status: string;
    source_identity_interpretation: string;
  };
  environment_runtime_compatibility_ids?: string[];
  evidence_references: string[];
  evidence_provenance?: Array<{
    source_id: string;
    source_url: string;
    source_class: string;
    assertion: string;
    licensing_note: string;
  }>;
  decision_reason: string;
  name_only_match: false;
}

export interface LoadedLocationAuthoritySource {
  source: LocationAuthorityCatalogSource;
  manifest: Record<string, unknown>;
  projection: GovernedRuntimeReferenceProjection;
  factualEntries: readonly FactualRuntimeProjectionEntry[];
  coPublications: readonly FactualRuntimeNaturalKeyCoPublication[];
}

export interface LocationAuthorityAggregate {
  catalog: LocationAuthorityCatalog;
  sources: readonly LoadedLocationAuthoritySource[];
  runtimeReferenceProjections: readonly GovernedRuntimeReferenceProjection[];
  runtimeRows: readonly GovernedRuntimeReferenceRow[];
  factualEntries: readonly FactualRuntimeProjectionEntry[];
  coPublications: readonly FactualRuntimeNaturalKeyCoPublication[];
  projectionAuthority: FactualRuntimeProjectionAuthority;
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function resolveRepositoryPath(rootDirectory: string, relativePath: string): string {
  const root = path.resolve(rootDirectory);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Location authority artifact escapes its root: ${relativePath}`);
  }
  return resolved;
}

function readVerifiedBytes(
  rootDirectory: string,
  artifact: LocationAuthorityCatalogArtifact,
): Buffer {
  const bytes = readFileSync(resolveRepositoryPath(rootDirectory, artifact.path));
  const actual = sha256(bytes);
  if (actual !== artifact.sha256) {
    throw new Error(
      `Location authority artifact ${artifact.path} digest ${actual} does not match ${artifact.sha256}.`,
    );
  }
  return bytes;
}

function readVerifiedJson(
  rootDirectory: string,
  artifact: LocationAuthorityCatalogArtifact,
): Record<string, unknown> {
  const value = JSON.parse(readVerifiedBytes(rootDirectory, artifact).toString('utf8')) as unknown;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Location authority artifact ${artifact.path} must contain an object.`);
  }
  return value as Record<string, unknown>;
}

function readVerifiedJsonl(
  rootDirectory: string,
  artifact: LocationAuthorityCatalogArtifact,
): RawFactualRuntimeProjectionRow[] {
  return readVerifiedBytes(rootDirectory, artifact)
    .toString('utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const value = JSON.parse(line) as unknown;
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Location authority artifact ${artifact.path} contains an invalid row.`);
      }
      return value as RawFactualRuntimeProjectionRow;
    });
}

function toGovernedReferenceProjection(value: unknown): GovernedRuntimeReferenceProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Governed runtime reference projection is invalid.');
  }

  const raw = value as Record<string, unknown>;
  const projection = {
    schemaVersion: raw.schema_version,
    projectionVersion: raw.projection_version,
    sourceFactualProjectionArtifact: raw.source_factual_projection_artifact,
    numericRuntimeIdsAreDurableAuthority: raw.numeric_runtime_ids_are_durable_authority,
    checkpoints: raw.checkpoints,
    rows: Array.isArray(raw.rows)
      ? raw.rows.map(row => {
          if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw new Error('Governed runtime reference row is invalid.');
          }
          const item = row as Record<string, unknown>;
          return {
            runtimeSearchScopeKind: item.runtime_search_scope_kind,
            runtimeStorageLevel: item.runtime_storage_level,
            runtimeNaturalKey: item.runtime_natural_key,
            ...(item.runtime_parent_natural_key
              ? { runtimeParentNaturalKey: item.runtime_parent_natural_key }
              : {}),
            name: item.name,
            slug: item.slug,
            ...(item.code ? { code: item.code } : {}),
            ...(item.latitude !== undefined ? { latitude: item.latitude } : {}),
            ...(item.longitude !== undefined ? { longitude: item.longitude } : {}),
            ...(item.postal_code ? { postalCode: item.postal_code } : {}),
            ...(Array.isArray(item.searchable_aliases)
              ? { searchableAliases: item.searchable_aliases }
              : {}),
            ...(item.publication_status ? { publicationStatus: item.publication_status } : {}),
            ...(item.licensing_classification
              ? { licensingClassification: item.licensing_classification }
              : {}),
            factualLocationIds: item.factual_location_ids,
            factualPreferredNames: item.factual_preferred_names,
            factualTypes: item.factual_types,
          };
        })
      : raw.rows,
  } as unknown;

  assertGovernedRuntimeReferenceProjection(projection);
  return projection;
}

function toFactualRuntimeProjectionEntry(
  row: RawFactualRuntimeProjectionRow,
): FactualRuntimeProjectionEntry {
  for (const [field, value] of [
    ['runtime_search_scope_kind', row.runtime_search_scope_kind],
    ['runtime_natural_key', row.runtime_natural_key],
    ['runtime_parent_natural_key', row.runtime_parent_natural_key],
    ['runtime_parent_relationship', row.runtime_parent_relationship],
    ['runtime_reference_status', row.runtime_reference_status],
  ] as const) {
    if (value !== undefined && value !== null && (typeof value !== 'string' || !value.trim())) {
      throw new Error(`Factual geography ${row.factual_location_id} has invalid ${field}.`);
    }
  }
  const rawContext = row.factual_context;
  if (
    rawContext !== undefined &&
    (!rawContext || typeof rawContext !== 'object' || Array.isArray(rawContext))
  ) {
    throw new Error(`Factual geography ${row.factual_location_id} has invalid context.`);
  }
  if (
    rawContext?.province_slug !== undefined &&
    (typeof rawContext.province_slug !== 'string' || !rawContext.province_slug.trim())
  ) {
    throw new Error(`Factual geography ${row.factual_location_id} has invalid province context.`);
  }
  if (
    rawContext?.administrative_context_names !== undefined &&
    (!Array.isArray(rawContext.administrative_context_names) ||
      rawContext.administrative_context_names.some(
        value => typeof value !== 'string' || !value.trim(),
      ))
  ) {
    throw new Error(
      `Factual geography ${row.factual_location_id} has invalid administrative context.`,
    );
  }
  const factualContext = [
    rawContext?.province_slug,
    ...(rawContext?.administrative_context_names ?? []),
  ].filter((value): value is string => typeof value === 'string');
  const factualContextDetails = row.factual_context
    ? {
        ...(row.factual_context.hierarchy_state
          ? { hierarchyState: row.factual_context.hierarchy_state }
          : {}),
        ...(row.factual_context.accepted_context_location_id
          ? { acceptedContextLocationId: row.factual_context.accepted_context_location_id }
          : {}),
        ...(row.factual_context.accepted_context_location_name
          ? { acceptedContextLocationName: row.factual_context.accepted_context_location_name }
          : {}),
        ...(row.factual_context.accepted_context_relationship
          ? { acceptedContextRelationship: row.factual_context.accepted_context_relationship }
          : {}),
      }
    : undefined;
  if (
    row.environment_runtime_compatibility_ids !== undefined &&
    !Array.isArray(row.environment_runtime_compatibility_ids)
  ) {
    throw new Error(
      `Factual geography ${row.factual_location_id} has invalid environment runtime identities.`,
    );
  }
  if (
    row.reconciliation_disposition !== undefined &&
    row.reconciliation_disposition !== null &&
    (typeof row.reconciliation_disposition !== 'object' ||
      Array.isArray(row.reconciliation_disposition))
  ) {
    throw new Error(
      `Factual geography ${row.factual_location_id} has invalid reconciliation disposition.`,
    );
  }
  if (row.evidence_provenance !== undefined && !Array.isArray(row.evidence_provenance)) {
    throw new Error(
      `Factual geography ${row.factual_location_id} has invalid evidence provenance.`,
    );
  }
  const evidenceProvenance: readonly FactualRuntimeEvidenceProvenance[] = (
    row.evidence_provenance ?? []
  ).map((evidence, index) => {
    if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
      throw new Error(
        `Factual geography ${row.factual_location_id} has invalid evidence provenance at index ${index}.`,
      );
    }
    return {
      sourceId: evidence.source_id,
      sourceUrl: evidence.source_url,
      sourceClass: evidence.source_class,
      assertion: evidence.assertion,
      licensingNote: evidence.licensing_note,
    };
  });
  const reconciliationDisposition: FactualRuntimeReconciliationDisposition | undefined =
    row.reconciliation_disposition
      ? {
          factualDisposition: row.reconciliation_disposition.factual_disposition,
          membershipRecommendation: row.reconciliation_disposition.membership_recommendation,
          currentPlaceStatus: row.reconciliation_disposition.current_place_status,
          sourceIdentityInterpretation:
            row.reconciliation_disposition.source_identity_interpretation,
        }
      : undefined;

  return {
    factualLocationId: row.factual_location_id,
    factualPreferredName: row.factual_preferred_name,
    factualType: row.factual_type,
    factualContext,
    ...(factualContextDetails && Object.keys(factualContextDetails).length > 0
      ? { factualContextDetails }
      : {}),
    ...(row.runtime_search_scope_kind
      ? { runtimeSearchScopeKind: row.runtime_search_scope_kind }
      : {}),
    ...(row.runtime_natural_key ? { runtimeNaturalKey: row.runtime_natural_key } : {}),
    ...(row.runtime_parent_natural_key
      ? { runtimeParentNaturalKey: row.runtime_parent_natural_key }
      : {}),
    ...(row.runtime_parent_relationship
      ? { runtimeParentRelationship: row.runtime_parent_relationship }
      : {}),
    projectionStatus: row.projection_status,
    ...(row.runtime_reference_status
      ? { runtimeReferenceStatus: row.runtime_reference_status }
      : {}),
    ...(reconciliationDisposition ? { reconciliationDisposition } : {}),
    ...(row.environment_runtime_compatibility_ids
      ? { environmentRuntimeCompatibilityIds: row.environment_runtime_compatibility_ids }
      : {}),
    evidenceReferences: row.evidence_references,
    ...(evidenceProvenance.length > 0 ? { evidenceProvenance } : {}),
    decisionReason: row.decision_reason,
    nameOnlyMatch: row.name_only_match,
  };
}

function validateManifest(
  manifest: Record<string, unknown>,
  source: LocationAuthorityCatalogSource,
): void {
  if (manifest.manifest_version !== source.expectedManifestVersion) {
    throw new Error(
      `Location authority source ${source.sourceId} manifest version ${String(manifest.manifest_version)} does not match ${source.expectedManifestVersion}.`,
    );
  }
  const territory = manifest.territory;
  if (!territory || typeof territory !== 'object' || Array.isArray(territory)) {
    throw new Error(`Location authority source ${source.sourceId} manifest has no territory.`);
  }
  const territoryRecord = territory as Record<string, unknown>;
  if (territoryRecord.province_slug !== source.rootNaturalKey) {
    throw new Error(
      `Location authority source ${source.sourceId} manifest root does not match its catalog root.`,
    );
  }
  const outputs = manifest.outputs;
  if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) {
    throw new Error(`Location authority source ${source.sourceId} manifest has no outputs.`);
  }
  const outputRecord = outputs as Record<string, unknown>;
  if (
    outputRecord.projection !== source.runtimeProjection.path.split('/').slice(-1)[0] ||
    outputRecord.mapping !== source.factualMapping.path.split('/').slice(-1)[0]
  ) {
    throw new Error(
      `Location authority source ${source.sourceId} manifest outputs do not match its catalog artifacts.`,
    );
  }
}

function validateProjectionHierarchy(
  source: LocationAuthorityCatalogSource,
  projection: GovernedRuntimeReferenceProjection,
): void {
  const rowsByNaturalKey = new Map(
    projection.rows.map(row => [row.runtimeNaturalKey, row] as const),
  );
  const root = rowsByNaturalKey.get(source.rootNaturalKey);
  if (!root || root.runtimeSearchScopeKind !== 'province' || root.runtimeParentNaturalKey) {
    throw new Error(`Location authority source ${source.sourceId} has no valid runtime root row.`);
  }

  let previousKey = '';
  for (const row of projection.rows) {
    if (row.runtimeNaturalKey.localeCompare(previousKey) < 0) {
      throw new Error(
        `Location authority source ${source.sourceId} projection rows are not sorted.`,
      );
    }
    previousKey = row.runtimeNaturalKey;
    if (
      row.runtimeNaturalKey !== source.rootNaturalKey &&
      !row.runtimeNaturalKey.startsWith(`${source.rootNaturalKey}/`)
    ) {
      throw new Error(
        `Location authority source ${source.sourceId} row ${row.runtimeNaturalKey} is outside its root.`,
      );
    }
    if (row.runtimeSearchScopeKind === 'province') {
      if (row.runtimeNaturalKey !== source.rootNaturalKey || row.runtimeParentNaturalKey) {
        throw new Error(
          `Location authority source ${source.sourceId} has an invalid province row ${row.runtimeNaturalKey}.`,
        );
      }
      continue;
    }
    if (!row.runtimeParentNaturalKey) {
      throw new Error(
        `Location authority source ${source.sourceId} row ${row.runtimeNaturalKey} has no parent.`,
      );
    }
    const parent = rowsByNaturalKey.get(row.runtimeParentNaturalKey);
    if (!parent || parent.runtimeStorageLevel === 'suburb') {
      throw new Error(
        `Location authority source ${source.sourceId} row ${row.runtimeNaturalKey} has invalid parent closure.`,
      );
    }
  }
}

function validateSource(
  source: LocationAuthorityCatalogSource,
  manifest: Record<string, unknown>,
  projection: GovernedRuntimeReferenceProjection,
  factualEntries: readonly FactualRuntimeProjectionEntry[],
): LoadedLocationAuthoritySource {
  validateManifest(manifest, source);
  validateProjectionHierarchy(source, projection);
  if (projection.projectionVersion !== source.expectedProjectionVersion) {
    throw new Error(
      `Location authority source ${source.sourceId} projection version ${projection.projectionVersion} does not match ${source.expectedProjectionVersion}.`,
    );
  }
  if (projection.sourceFactualProjectionArtifact !== source.factualMapping.path) {
    throw new Error(
      `Location authority source ${source.sourceId} projection does not reference its factual mapping.`,
    );
  }
  if (projection.rows.length !== source.expectedRuntimeRows) {
    throw new Error(
      `Location authority source ${source.sourceId} runtime row count does not match its catalog.`,
    );
  }
  if (factualEntries.length !== source.expectedFactualEntries) {
    throw new Error(
      `Location authority source ${source.sourceId} factual entry count does not match its catalog.`,
    );
  }

  const factualById = new Map<string, FactualRuntimeProjectionEntry>();
  for (const entry of factualEntries) {
    if (factualById.has(entry.factualLocationId)) {
      throw new Error(
        `Location authority source ${source.sourceId} repeats factual identity ${entry.factualLocationId}.`,
      );
    }
    if (
      !source.factualIdNamespaces.some(namespace =>
        isFactualGeographyIdInNamespace(entry.factualLocationId, namespace),
      )
    ) {
      throw new Error(
        `Location authority source ${source.sourceId} contains unregistered factual identity ${entry.factualLocationId}.`,
      );
    }
    factualById.set(entry.factualLocationId, entry);
  }

  const rowsByNaturalKey = new Map(
    projection.rows.map(row => [row.runtimeNaturalKey, row] as const),
  );
  const readyEntries = factualEntries.filter(
    entry => entry.projectionStatus === 'projection_ready',
  );
  if (readyEntries.length !== source.expectedProjectionReadyEntries) {
    throw new Error(
      `Location authority source ${source.sourceId} projection-ready count does not match its catalog.`,
    );
  }
  for (const entry of readyEntries) {
    const row = entry.runtimeNaturalKey ? rowsByNaturalKey.get(entry.runtimeNaturalKey) : undefined;
    if (
      !row ||
      !entry.runtimeSearchScopeKind ||
      row.runtimeSearchScopeKind !== entry.runtimeSearchScopeKind ||
      row.runtimeParentNaturalKey !== entry.runtimeParentNaturalKey ||
      !row.factualLocationIds.includes(entry.factualLocationId)
    ) {
      throw new Error(
        `Location authority source ${source.sourceId} factual entry ${entry.factualLocationId} does not match its runtime row.`,
      );
    }
  }

  const projectedFactualIds = new Set<string>();
  for (const row of projection.rows) {
    const rowFactualIds = new Set<string>();
    if (row.factualLocationIds.length > 0 && row.name !== row.factualPreferredNames[0]) {
      throw new Error(
        `Location authority source ${source.sourceId} row ${row.runtimeNaturalKey} has a preferred-name mismatch.`,
      );
    }
    for (const [index, factualLocationId] of row.factualLocationIds.entries()) {
      if (rowFactualIds.has(factualLocationId) || projectedFactualIds.has(factualLocationId)) {
        throw new Error(
          `Location authority source ${source.sourceId} repeats projected factual identity ${factualLocationId}.`,
        );
      }
      rowFactualIds.add(factualLocationId);
      projectedFactualIds.add(factualLocationId);
      const entry = factualById.get(factualLocationId);
      if (
        !entry ||
        entry.projectionStatus !== 'projection_ready' ||
        entry.runtimeNaturalKey !== row.runtimeNaturalKey
      ) {
        throw new Error(
          `Location authority source ${source.sourceId} row ${row.runtimeNaturalKey} has no ready matching factual entry.`,
        );
      }
      if (
        entry.factualPreferredName !== row.factualPreferredNames[index] ||
        entry.factualType !== row.factualTypes[index]
      ) {
        throw new Error(
          `Location authority source ${source.sourceId} row ${row.runtimeNaturalKey} has factual metadata that does not match ${factualLocationId}.`,
        );
      }
    }
  }

  const coPublications = projection.rows
    .filter(row => row.factualLocationIds.length > 1)
    .map(row => ({
      runtimeNaturalKey: row.runtimeNaturalKey,
      factualLocationIds: [...row.factualLocationIds],
    }));
  if (coPublications.length !== source.expectedCoPublishedNaturalKeys) {
    throw new Error(
      `Location authority source ${source.sourceId} co-publication count does not match its catalog.`,
    );
  }

  return { source, manifest, projection, factualEntries, coPublications };
}

export function loadLocationAuthorityCatalog(input: {
  rootDirectory: string;
  catalog: unknown;
}): LocationAuthorityAggregate {
  const catalog = toLocationAuthorityCatalog(input.catalog);
  const sources: LoadedLocationAuthoritySource[] = [];
  const runtimeRows: GovernedRuntimeReferenceRow[] = [];
  const factualEntries: FactualRuntimeProjectionEntry[] = [];
  const coPublications: FactualRuntimeNaturalKeyCoPublication[] = [];
  const naturalKeys = new Set<string>();
  const factualIds = new Set<string>();

  for (const source of catalog.sources) {
    const manifest = readVerifiedJson(input.rootDirectory, source.manifest);
    const projection = toGovernedReferenceProjection(
      readVerifiedJson(input.rootDirectory, source.runtimeProjection),
    );
    const entries = readVerifiedJsonl(input.rootDirectory, source.factualMapping).map(
      toFactualRuntimeProjectionEntry,
    );
    const loaded = validateSource(source, manifest, projection, entries);
    sources.push(loaded);

    for (const row of projection.rows) {
      if (naturalKeys.has(row.runtimeNaturalKey)) {
        throw new Error(
          `Location authority aggregate repeats runtime natural key ${row.runtimeNaturalKey}.`,
        );
      }
      naturalKeys.add(row.runtimeNaturalKey);
      runtimeRows.push(row);
    }
    for (const entry of entries) {
      if (factualIds.has(entry.factualLocationId)) {
        throw new Error(
          `Location authority aggregate repeats factual identity ${entry.factualLocationId}.`,
        );
      }
      factualIds.add(entry.factualLocationId);
      factualEntries.push(entry);
    }
    coPublications.push(...loaded.coPublications);
  }

  runtimeRows.sort((left, right) => left.runtimeNaturalKey.localeCompare(right.runtimeNaturalKey));
  factualEntries.sort((left, right) =>
    left.factualLocationId.localeCompare(right.factualLocationId),
  );
  coPublications.sort((left, right) =>
    left.runtimeNaturalKey.localeCompare(right.runtimeNaturalKey),
  );

  return {
    catalog,
    sources,
    runtimeReferenceProjections: sources.map(source => source.projection),
    runtimeRows,
    factualEntries,
    coPublications,
    projectionAuthority: new FactualRuntimeProjectionAuthority(factualEntries, coPublications),
  };
}

const ROOT_DIRECTORY = fileURLToPath(new URL('../', import.meta.url));
const CATALOG_INDEX_URL = new URL(`../${LOCATION_AUTHORITY_CATALOG_INDEX_PATH}`, import.meta.url);
const CATALOG_INDEX_BYTES = readFileSync(CATALOG_INDEX_URL);

export const LOCATION_AUTHORITY_CATALOG_SHA256 = sha256(CATALOG_INDEX_BYTES);
export const LOCATION_AUTHORITY_CATALOG = loadLocationAuthorityCatalog({
  rootDirectory: ROOT_DIRECTORY,
  catalog: JSON.parse(CATALOG_INDEX_BYTES.toString('utf8')) as unknown,
});
export const LOCATION_AUTHORITY_RUNTIME_PROJECTIONS =
  LOCATION_AUTHORITY_CATALOG.runtimeReferenceProjections;
export const LOCATION_AUTHORITY_RUNTIME_ROWS = LOCATION_AUTHORITY_CATALOG.runtimeRows;
export const LOCATION_AUTHORITY_FACTUAL_ENTRIES = LOCATION_AUTHORITY_CATALOG.factualEntries;
export const LOCATION_AUTHORITY_COPUBLICATIONS = LOCATION_AUTHORITY_CATALOG.coPublications;
export const locationAuthorityProjectionAuthority = LOCATION_AUTHORITY_CATALOG.projectionAuthority;
