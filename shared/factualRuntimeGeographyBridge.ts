import { parseCanonicalLocationId, type CanonicalLocationLevel } from './locationAuthority';

/**
 * Property Listify factual geography types are intentionally open-ended. The
 * runtime currently executes only province/city/suburb scopes, but a factual
 * town, neighbourhood or locality must not be rewritten into one of those
 * scopes merely to make a query fit.
 */
export const FACTUAL_GEOGRAPHY_TYPES = [
  'province',
  'district_municipality',
  'local_municipality',
  'city',
  'town',
  'township',
  'suburb',
  'neighbourhood',
  'locality',
  'village',
  'estate/residential_development_candidate',
  'other',
] as const;

export type FactualGeographyType = string;

export const FACTUAL_RUNTIME_MAPPING_STATUSES = [
  'exact',
  'supported',
  'ambiguous',
  'conflicting',
  'unmapped',
  'unsupported_type',
] as const;

export type FactualRuntimeMappingStatus =
  (typeof FACTUAL_RUNTIME_MAPPING_STATUSES)[number];

export const RUNTIME_SEARCH_SCOPE_KINDS = ['province', 'metro_city', 'locality'] as const;

export type RuntimeSearchScopeKind = (typeof RUNTIME_SEARCH_SCOPE_KINDS)[number];

export function canonicalLevelForRuntimeSearchScopeKind(
  kind: RuntimeSearchScopeKind,
): CanonicalLocationLevel {
  if (kind === 'province') return 'province';
  if (kind === 'metro_city') return 'city';
  return 'suburb';
}

export const RUNTIME_PROJECTION_STATUSES = [
  'projection_ready',
  'ambiguous_projection',
  'unsupported_search_scope',
  'factual_geography_blocker',
  'other_material_blocker',
] as const;

export type RuntimeProjectionStatus = (typeof RUNTIME_PROJECTION_STATUSES)[number];

export const RUNTIME_REFERENCE_STATUSES = [
  'existing_reference_data',
  'reference_data_expansion_required',
] as const;

export type RuntimeReferenceStatus = (typeof RUNTIME_REFERENCE_STATUSES)[number];

export interface FactualRuntimeContextDetails {
  acceptedContextLocationId?: string;
  acceptedContextLocationName?: string;
  acceptedContextRelationship?: string;
  hierarchyState?: string;
}

export interface FactualRuntimeEvidenceProvenance {
  sourceId: string;
  sourceUrl: string;
  sourceClass: string;
  assertion: string;
  licensingNote: string;
}

/**
 * A bounded factual reconciliation note can preserve a source-level identity
 * disposition without turning it into an executable runtime mapping.
 */
export interface FactualRuntimeReconciliationDisposition {
  factualDisposition: string;
  membershipRecommendation: string;
  currentPlaceStatus: string;
  sourceIdentityInterpretation: string;
}

/**
 * This is the durable bridge contract. Numeric province/city/suburb IDs are
 * deliberately absent from the required fields because those values belong
 * to one database environment only.
 */
export interface FactualRuntimeProjectionEntry {
  factualLocationId: string;
  factualPreferredName: string;
  factualType: FactualGeographyType;
  factualContext: readonly string[];
  factualContextDetails?: FactualRuntimeContextDetails;
  runtimeSearchScopeKind?: RuntimeSearchScopeKind;
  runtimeNaturalKey?: string;
  runtimeParentNaturalKey?: string;
  runtimeParentRelationship?: string;
  projectionStatus: RuntimeProjectionStatus;
  runtimeReferenceStatus?: RuntimeReferenceStatus;
  reconciliationDisposition?: FactualRuntimeReconciliationDisposition;
  /** Optional observation for the current environment; never durable authority. */
  environmentRuntimeCompatibilityIds?: readonly string[];
  evidenceReferences: readonly string[];
  evidenceProvenance?: readonly FactualRuntimeEvidenceProvenance[];
  decisionReason: string;
  nameOnlyMatch: false;
}

export type FactualRuntimeProjectionResolution =
  | {
      status: 'resolved';
      projection: FactualRuntimeProjectionEntry;
    }
  | {
      status: 'blocked';
      factualLocationId?: string;
      runtimeNaturalKey?: string;
      projectionStatus: Exclude<RuntimeProjectionStatus, 'projection_ready'>;
      message: string;
    }
  | {
      status: 'invalid';
      message: string;
    };

export interface FactualRuntimeMappingEntry {
  /** Durable Property Listify-owned factual identity. */
  factualLocationId: string;
  factualPreferredName: string;
  /** This is factual catalogue vocabulary, never a runtime scope alias. */
  factualType: FactualGeographyType;
  /** Environment-specific runtime candidates; never durable bridge authority. */
  runtimeCompatibilityIds: readonly string[];
  /** The executable runtime level, when a compatibility projection exists. */
  runtimeScopeLevel?: CanonicalLocationLevel;
  status: FactualRuntimeMappingStatus;
  /** Evidence references are required even for a blocked mapping decision. */
  evidenceReferences: readonly string[];
  decisionReason: string;
  /** A name-only merge is never a valid bridge record. */
  nameOnlyMatch: false;
}

export type FactualRuntimeResolution =
  | {
      direction: 'factual_to_runtime';
      status: 'resolved';
      mappingStatus: 'exact' | 'supported';
      factualLocationId: string;
      factualPreferredName: string;
      factualType: FactualGeographyType;
      runtimeCompatibilityId: string;
      runtimeScopeLevel: CanonicalLocationLevel;
    }
  | {
      direction: 'factual_to_runtime' | 'runtime_to_factual';
      status: 'blocked';
      mappingStatus: Exclude<FactualRuntimeMappingStatus, 'exact' | 'supported'>;
      factualLocationId?: string;
      factualPreferredName?: string;
      factualType?: FactualGeographyType;
      runtimeCompatibilityIds?: readonly string[];
      runtimeCompatibilityId?: string;
      message: string;
    }
  | {
      direction: 'factual_to_runtime' | 'runtime_to_factual';
      status: 'invalid';
      message: string;
    }
  | {
      direction: 'runtime_to_factual';
      status: 'resolved';
      mappingStatus: 'exact' | 'supported';
      factualLocationId: string;
      factualPreferredName: string;
      factualType: FactualGeographyType;
      runtimeCompatibilityId: string;
      runtimeScopeLevel: CanonicalLocationLevel;
    };

const FACTUAL_LOCATION_ID_PATTERN = /^pl-gp-v01-[a-f0-9]{20}$/;

export function isFactualGeographyId(value: unknown): value is string {
  return typeof value === 'string' && FACTUAL_LOCATION_ID_PATTERN.test(value);
}

export function isRuntimeResolvableMappingStatus(
  status: FactualRuntimeMappingStatus,
): status is 'exact' | 'supported' {
  return status === 'exact' || status === 'supported';
}

function invalid(
  direction: FactualRuntimeResolution['direction'],
  message: string,
): FactualRuntimeResolution {
  return { direction, status: 'invalid', message };
}

export const RUNTIME_NATURAL_KEY_PATTERN = /^[a-z0-9][a-z0-9:_/-]*$/;

export function isRuntimeNaturalKey(value: unknown): value is string {
  return typeof value === 'string' && RUNTIME_NATURAL_KEY_PATTERN.test(value);
}

function validateProjectionEntry(entry: FactualRuntimeProjectionEntry): void {
  if (!isFactualGeographyId(entry.factualLocationId)) {
    throw new Error(`Invalid factual geography identity: ${entry.factualLocationId}`);
  }
  if (!entry.factualPreferredName.trim()) {
    throw new Error(`Factual geography ${entry.factualLocationId} has no preferred name.`);
  }
  if (!entry.factualType.trim()) {
    throw new Error(`Factual geography ${entry.factualLocationId} has no factual type.`);
  }
  if (!RUNTIME_PROJECTION_STATUSES.includes(entry.projectionStatus)) {
    throw new Error(`Factual geography ${entry.factualLocationId} has an invalid projection status.`);
  }
  if (
    entry.runtimeReferenceStatus !== undefined &&
    !RUNTIME_REFERENCE_STATUSES.includes(entry.runtimeReferenceStatus)
  ) {
    throw new Error(
      `Factual geography ${entry.factualLocationId} has an invalid runtime reference-data status.`,
    );
  }
  if (entry.nameOnlyMatch !== false) {
    throw new Error(`Factual geography ${entry.factualLocationId} cannot use a name-only projection.`);
  }
  if (entry.reconciliationDisposition) {
    const disposition = entry.reconciliationDisposition;
    if (
      !disposition.factualDisposition.trim() ||
      !disposition.membershipRecommendation.trim() ||
      !disposition.currentPlaceStatus.trim() ||
      !disposition.sourceIdentityInterpretation.trim()
    ) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has incomplete reconciliation disposition metadata.`,
      );
    }
  }
  if (entry.evidenceReferences.length === 0) {
    throw new Error(`Factual geography ${entry.factualLocationId} has no projection evidence.`);
  }
  if (!entry.decisionReason.trim()) {
    throw new Error(`Factual geography ${entry.factualLocationId} has no projection decision.`);
  }
  if (entry.factualContextDetails) {
    if (
      entry.factualContextDetails.acceptedContextLocationId !== undefined &&
      !isFactualGeographyId(entry.factualContextDetails.acceptedContextLocationId)
    ) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has an invalid accepted context identity.`,
      );
    }
    if (
      entry.factualContextDetails.acceptedContextLocationId !== undefined &&
      !entry.factualContextDetails.acceptedContextLocationName?.trim()
    ) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has an accepted context identity without a name.`,
      );
    }
    if (
      entry.factualContextDetails.acceptedContextRelationship !== undefined &&
      !entry.factualContextDetails.acceptedContextRelationship.trim()
    ) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has an empty accepted context relationship.`,
      );
    }
  }
  for (const evidence of entry.evidenceProvenance ?? []) {
    if (
      !evidence.sourceId.trim() ||
      !evidence.sourceUrl.trim() ||
      !evidence.sourceClass.trim() ||
      !evidence.assertion.trim() ||
      !evidence.licensingNote.trim()
    ) {
      throw new Error(`Factual geography ${entry.factualLocationId} has incomplete evidence provenance.`);
    }
  }

  for (const runtimeId of entry.environmentRuntimeCompatibilityIds ?? []) {
    if (!parseCanonicalLocationId(runtimeId)) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has an invalid environment runtime identity ${runtimeId}.`,
      );
    }
  }

  if (entry.projectionStatus === 'projection_ready') {
    if (!entry.runtimeSearchScopeKind || !entry.runtimeNaturalKey) {
      throw new Error(
        `Projection-ready factual geography ${entry.factualLocationId} requires a scope and natural key.`,
      );
    }
    if (!RUNTIME_SEARCH_SCOPE_KINDS.includes(entry.runtimeSearchScopeKind)) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has an invalid runtime search scope.`,
      );
    }
    if (!isRuntimeNaturalKey(entry.runtimeNaturalKey)) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has an invalid runtime natural key.`,
      );
    }
    const keySegments = entry.runtimeNaturalKey.split('/');
    const expectedSegmentCount =
      entry.runtimeSearchScopeKind === 'province'
        ? 1
        : entry.runtimeSearchScopeKind === 'metro_city'
          ? 2
          : 3;
    if (
      keySegments.length !== expectedSegmentCount ||
      keySegments.some(segment => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment))
    ) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has a natural key incompatible with its runtime scope.`,
      );
    }
    const expectedParentNaturalKey = keySegments.slice(0, -1).join('/');
    if (
      (entry.runtimeSearchScopeKind === 'province' && entry.runtimeParentNaturalKey !== undefined) ||
      (entry.runtimeSearchScopeKind !== 'province' &&
        entry.runtimeParentNaturalKey !== expectedParentNaturalKey)
    ) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has an invalid runtime parent natural key.`,
      );
    }
    if (!entry.runtimeReferenceStatus) {
      throw new Error(
        `Projection-ready factual geography ${entry.factualLocationId} requires a reference-data status.`,
      );
    }
  }
}

export class FactualRuntimeProjectionAuthority {
  private readonly byFactualId = new Map<string, FactualRuntimeProjectionEntry>();

  private readonly byNaturalKey = new Map<string, FactualRuntimeProjectionEntry[]>();

  constructor(entries: readonly FactualRuntimeProjectionEntry[]) {
    for (const entry of entries) {
      validateProjectionEntry(entry);
      if (this.byFactualId.has(entry.factualLocationId)) {
        throw new Error(`Duplicate factual geography identity: ${entry.factualLocationId}`);
      }
      this.byFactualId.set(entry.factualLocationId, entry);

      if (entry.runtimeNaturalKey) {
        const candidates = this.byNaturalKey.get(entry.runtimeNaturalKey) ?? [];
        candidates.push(entry);
        this.byNaturalKey.set(entry.runtimeNaturalKey, candidates);
      }
    }
  }

  resolveFactualLocation(factualLocationId: unknown): FactualRuntimeProjectionResolution {
    if (!isFactualGeographyId(factualLocationId)) {
      return {
        status: 'invalid',
        message: 'Projection resolution requires a valid Property Listify factual identity.',
      };
    }

    const entry = this.byFactualId.get(factualLocationId);
    if (!entry) {
      return {
        status: 'blocked',
        factualLocationId,
        projectionStatus: 'factual_geography_blocker',
        message: 'No explicit factual runtime projection exists.',
      };
    }
    if (entry.projectionStatus !== 'projection_ready') {
      return {
        status: 'blocked',
        factualLocationId: entry.factualLocationId,
        runtimeNaturalKey: entry.runtimeNaturalKey,
        projectionStatus: entry.projectionStatus,
        message: entry.decisionReason,
      };
    }
    return { status: 'resolved', projection: entry };
  }

  resolveNaturalKey(runtimeNaturalKey: unknown): FactualRuntimeProjectionResolution {
    if (
      typeof runtimeNaturalKey !== 'string' ||
      !isRuntimeNaturalKey(runtimeNaturalKey)
    ) {
      return {
        status: 'invalid',
        message: 'Projection resolution requires a valid runtime natural key.',
      };
    }

    const candidates = this.byNaturalKey.get(runtimeNaturalKey) ?? [];
    if (candidates.length === 0) {
      return {
        status: 'blocked',
        runtimeNaturalKey,
        projectionStatus: 'other_material_blocker',
        message: 'No factual identity is assigned to this runtime natural key.',
      };
    }
    const factualIds = new Set(candidates.map(candidate => candidate.factualLocationId));
    if (factualIds.size !== 1) {
      return {
        status: 'blocked',
        runtimeNaturalKey,
        projectionStatus: 'ambiguous_projection',
        message: 'More than one factual identity claims this runtime natural key.',
      };
    }
    const [entry] = candidates;
    if (entry.projectionStatus !== 'projection_ready') {
      return {
        status: 'blocked',
        factualLocationId: entry.factualLocationId,
        runtimeNaturalKey,
        projectionStatus: entry.projectionStatus,
        message: entry.decisionReason,
      };
    }
    return { status: 'resolved', projection: entry };
  }

  entries(): readonly FactualRuntimeProjectionEntry[] {
    return Array.from(this.byFactualId.values());
  }
}

function validateEntry(entry: FactualRuntimeMappingEntry): void {
  if (!isFactualGeographyId(entry.factualLocationId)) {
    throw new Error(`Invalid factual geography identity: ${entry.factualLocationId}`);
  }
  if (!entry.factualPreferredName.trim()) {
    throw new Error(`Factual geography ${entry.factualLocationId} has no preferred name.`);
  }
  if (!entry.factualType.trim()) {
    throw new Error(`Factual geography ${entry.factualLocationId} has no factual type.`);
  }
  if (!FACTUAL_RUNTIME_MAPPING_STATUSES.includes(entry.status)) {
    throw new Error(`Factual geography ${entry.factualLocationId} has an invalid mapping status.`);
  }
  if (entry.nameOnlyMatch !== false) {
    throw new Error(`Factual geography ${entry.factualLocationId} cannot use a name-only mapping.`);
  }
  if (entry.evidenceReferences.length === 0) {
    throw new Error(`Factual geography ${entry.factualLocationId} has no mapping evidence.`);
  }
  if (!entry.decisionReason.trim()) {
    throw new Error(`Factual geography ${entry.factualLocationId} has no mapping decision.`);
  }

  for (const runtimeId of entry.runtimeCompatibilityIds) {
    const parsed = parseCanonicalLocationId(runtimeId);
    if (!parsed) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has an invalid runtime identity ${runtimeId}.`,
      );
    }
    if (entry.runtimeScopeLevel && parsed.level !== entry.runtimeScopeLevel) {
      throw new Error(
        `Factual geography ${entry.factualLocationId} has a runtime level mismatch.`,
      );
    }
  }

  if (isRuntimeResolvableMappingStatus(entry.status)) {
    if (entry.runtimeCompatibilityIds.length !== 1 || !entry.runtimeScopeLevel) {
      throw new Error(
        `Resolvable factual geography ${entry.factualLocationId} requires exactly one runtime identity and level.`,
      );
    }
  } else if (entry.runtimeCompatibilityIds.length > 0 && entry.status === 'unmapped') {
    throw new Error(
      `Unmapped factual geography ${entry.factualLocationId} cannot advertise runtime candidates.`,
    );
  }
}

function resolved(
  direction: 'factual_to_runtime' | 'runtime_to_factual',
  entry: FactualRuntimeMappingEntry,
): FactualRuntimeResolution {
  if (!isRuntimeResolvableMappingStatus(entry.status)) {
    throw new Error(`Mapping ${entry.factualLocationId} is not runtime-resolvable.`);
  }
  const runtimeCompatibilityId = entry.runtimeCompatibilityIds[0];
  const runtimeScopeLevel = entry.runtimeScopeLevel;
  if (!runtimeCompatibilityId || !runtimeScopeLevel) {
    throw new Error(`Resolved mapping ${entry.factualLocationId} is incomplete.`);
  }

  return {
    direction,
    status: 'resolved',
    mappingStatus: entry.status,
    factualLocationId: entry.factualLocationId,
    factualPreferredName: entry.factualPreferredName,
    factualType: entry.factualType,
    runtimeCompatibilityId,
    runtimeScopeLevel,
  };
}

export class FactualRuntimeGeographyBridge {
  private readonly byFactualId = new Map<string, FactualRuntimeMappingEntry>();

  private readonly byRuntimeId = new Map<string, FactualRuntimeMappingEntry[]>();

  constructor(entries: readonly FactualRuntimeMappingEntry[]) {
    for (const entry of entries) {
      validateEntry(entry);
      if (this.byFactualId.has(entry.factualLocationId)) {
        throw new Error(`Duplicate factual geography identity: ${entry.factualLocationId}`);
      }
      this.byFactualId.set(entry.factualLocationId, entry);

      for (const runtimeId of entry.runtimeCompatibilityIds) {
        const runtimeEntries = this.byRuntimeId.get(runtimeId) ?? [];
        runtimeEntries.push(entry);
        this.byRuntimeId.set(runtimeId, runtimeEntries);
      }
    }
  }

  resolveFactualLocation(factualLocationId: unknown): FactualRuntimeResolution {
    if (!isFactualGeographyId(factualLocationId)) {
      return invalid(
        'factual_to_runtime',
        'Factual geography resolution requires a valid Property Listify factual identity.',
      );
    }

    const entry = this.byFactualId.get(factualLocationId);
    if (!entry) {
      return {
        direction: 'factual_to_runtime',
        status: 'blocked',
        mappingStatus: 'unmapped',
        factualLocationId,
        message: 'No explicit factual-to-runtime mapping exists.',
      };
    }

    if (isRuntimeResolvableMappingStatus(entry.status)) {
      return resolved('factual_to_runtime', entry);
    }

    return {
      direction: 'factual_to_runtime',
      status: 'blocked',
      mappingStatus: entry.status,
      factualLocationId: entry.factualLocationId,
      factualPreferredName: entry.factualPreferredName,
      factualType: entry.factualType,
      runtimeCompatibilityIds: entry.runtimeCompatibilityIds,
      message: entry.decisionReason,
    };
  }

  resolveRuntimeLocation(runtimeCompatibilityId: unknown): FactualRuntimeResolution {
    const parsed = parseCanonicalLocationId(runtimeCompatibilityId);
    if (!parsed) {
      return invalid(
        'runtime_to_factual',
        'Runtime resolution requires a valid province:, city: or suburb: identity.',
      );
    }

    const normalizedRuntimeId = `${parsed.level}:${parsed.id}`;
    const entries = this.byRuntimeId.get(normalizedRuntimeId) ?? [];
    if (entries.length === 0) {
      return {
        direction: 'runtime_to_factual',
        status: 'blocked',
        mappingStatus: 'unmapped',
        runtimeCompatibilityId: normalizedRuntimeId,
        message: 'No explicit runtime-to-factual mapping exists.',
      };
    }

    const uniqueFactualIds = new Set(entries.map(entry => entry.factualLocationId));
    if (uniqueFactualIds.size !== 1) {
      return {
        direction: 'runtime_to_factual',
        status: 'blocked',
        mappingStatus: 'ambiguous',
        runtimeCompatibilityId: normalizedRuntimeId,
        runtimeCompatibilityIds: entries.map(entry => entry.factualLocationId),
        message: 'A runtime identity has more than one factual candidate and cannot auto-resolve.',
      };
    }

    const entry = entries[0];
    if (!isRuntimeResolvableMappingStatus(entry.status)) {
      return {
        direction: 'runtime_to_factual',
        status: 'blocked',
        mappingStatus: entry.status,
        factualLocationId: entry.factualLocationId,
        factualPreferredName: entry.factualPreferredName,
        factualType: entry.factualType,
        runtimeCompatibilityId: normalizedRuntimeId,
        message: entry.decisionReason,
      };
    }

    return resolved('runtime_to_factual', entry);
  }

  getEntry(factualLocationId: string): FactualRuntimeMappingEntry | undefined {
    return this.byFactualId.get(factualLocationId);
  }

  entries(): readonly FactualRuntimeMappingEntry[] {
    return Array.from(this.byFactualId.values());
  }
}
