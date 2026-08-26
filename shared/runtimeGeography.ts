import {
  canonicalLevelForRuntimeSearchScopeKind,
  isFactualGeographyId,
  isRuntimeNaturalKey,
  RUNTIME_SEARCH_SCOPE_KINDS,
  type FactualGeographyType,
  type RuntimeSearchScopeKind,
} from './factualRuntimeGeographyBridge';
import type { CanonicalLocationLevel } from './locationAuthority';

export const GOVERNED_RUNTIME_REFERENCE_PROJECTION_SCHEMA_VERSION = '0.1' as const;

export type RuntimeReferenceStorageLevel = CanonicalLocationLevel;

/**
 * A generated row in the governed reference projection. It describes the
 * durable natural identity that the Database Authority adapter must resolve
 * in a target environment. It intentionally contains no numeric row handle.
 */
export interface GovernedRuntimeReferenceRow {
  runtimeSearchScopeKind: RuntimeSearchScopeKind;
  runtimeStorageLevel: RuntimeReferenceStorageLevel;
  runtimeNaturalKey: string;
  runtimeParentNaturalKey?: string;
  name: string;
  slug: string;
  code?: string;
  latitude?: string | number;
  longitude?: string | number;
  postalCode?: string;
  factualLocationIds: readonly string[];
  factualPreferredNames: readonly string[];
  factualTypes: readonly FactualGeographyType[];
}

export interface GovernedRuntimeReferenceProjection {
  schemaVersion: typeof GOVERNED_RUNTIME_REFERENCE_PROJECTION_SCHEMA_VERSION;
  projectionVersion: string;
  sourceFactualProjectionArtifact: string;
  numericRuntimeIdsAreDurableAuthority: false;
  rows: readonly GovernedRuntimeReferenceRow[];
}

export function runtimeStorageLevelForScopeKind(
  kind: RuntimeSearchScopeKind,
): RuntimeReferenceStorageLevel {
  return canonicalLevelForRuntimeSearchScopeKind(kind);
}

export function assertGovernedRuntimeReferenceProjection(
  value: unknown,
): asserts value is GovernedRuntimeReferenceProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Governed runtime reference projection must be an object.');
  }

  const projection = value as Partial<GovernedRuntimeReferenceProjection>;
  if (projection.schemaVersion !== GOVERNED_RUNTIME_REFERENCE_PROJECTION_SCHEMA_VERSION) {
    throw new Error('Governed runtime reference projection has an unsupported schema version.');
  }
  if (!projection.projectionVersion?.trim()) {
    throw new Error('Governed runtime reference projection has no version.');
  }
  if (projection.numericRuntimeIdsAreDurableAuthority !== false) {
    throw new Error(
      'Governed runtime reference projection must not treat numeric runtime IDs as authority.',
    );
  }
  if (!Array.isArray(projection.rows) || projection.rows.length === 0) {
    throw new Error('Governed runtime reference projection must contain rows.');
  }

  const naturalKeys = new Set<string>();
  for (const row of projection.rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('Governed runtime reference projection contains an invalid row.');
    }

    const candidate = row as GovernedRuntimeReferenceRow;
    if (!RUNTIME_SEARCH_SCOPE_KINDS.includes(candidate.runtimeSearchScopeKind)) {
      throw new Error(`Unsupported governed runtime scope ${candidate.runtimeSearchScopeKind}.`);
    }
    if (candidate.runtimeStorageLevel !== runtimeStorageLevelForScopeKind(candidate.runtimeSearchScopeKind)) {
      throw new Error(
        `Runtime storage level does not match scope ${candidate.runtimeSearchScopeKind}.`,
      );
    }
    if (!isRuntimeNaturalKey(candidate.runtimeNaturalKey)) {
      throw new Error(`Invalid governed runtime natural key ${candidate.runtimeNaturalKey}.`);
    }
    const keySegments = candidate.runtimeNaturalKey.split('/');
    const expectedSegmentCount =
      candidate.runtimeSearchScopeKind === 'province'
        ? 1
        : candidate.runtimeSearchScopeKind === 'metro_city'
          ? 2
          : 3;
    if (
      keySegments.length !== expectedSegmentCount ||
      keySegments.some(segment => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment))
    ) {
      throw new Error(
        `Governed runtime natural key does not match its scope: ${candidate.runtimeNaturalKey}.`,
      );
    }
    const expectedParentNaturalKey = keySegments.slice(0, -1).join('/');
    if (candidate.runtimeSearchScopeKind === 'province') {
      if (candidate.runtimeParentNaturalKey !== undefined) {
        throw new Error('Governed province rows must not declare a runtime parent.');
      }
    } else if (candidate.runtimeParentNaturalKey !== expectedParentNaturalKey) {
      throw new Error(
        `Governed runtime row ${candidate.runtimeNaturalKey} has an invalid parent natural key.`,
      );
    }
    if (naturalKeys.has(candidate.runtimeNaturalKey)) {
      throw new Error(
        `Duplicate governed runtime natural key ${candidate.runtimeNaturalKey}.`,
      );
    }
    naturalKeys.add(candidate.runtimeNaturalKey);
    if (!candidate.name?.trim() || !candidate.slug?.trim()) {
      throw new Error('Governed runtime reference rows require a name and slug.');
    }
    if (!Array.isArray(candidate.factualLocationIds)) {
      throw new Error('Governed runtime reference rows require factual identities.');
    }
    for (const factualLocationId of candidate.factualLocationIds) {
      if (!isFactualGeographyId(factualLocationId)) {
        throw new Error(`Invalid factual identity in runtime reference row: ${factualLocationId}.`);
      }
    }
    if (
      !Array.isArray(candidate.factualPreferredNames) ||
      !Array.isArray(candidate.factualTypes) ||
      candidate.factualPreferredNames.length !== candidate.factualLocationIds.length ||
      candidate.factualTypes.length !== candidate.factualLocationIds.length ||
      !candidate.factualPreferredNames.every(name => typeof name === 'string' && name.trim()) ||
      !candidate.factualTypes.every(type => typeof type === 'string' && type.trim())
    ) {
      throw new Error('Governed runtime reference rows require factual names and types.');
    }
  }
}
