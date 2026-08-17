import { readFileSync } from 'node:fs';
import {
  FactualRuntimeProjectionAuthority,
  type FactualRuntimeProjectionEntry,
  type FactualRuntimeEvidenceProvenance,
  type FactualRuntimeReconciliationDisposition,
  type RuntimeProjectionStatus,
  type RuntimeReferenceStatus,
  type RuntimeSearchScopeKind,
} from '../../shared/factualRuntimeGeographyBridge';
import {
  assertGovernedRuntimeReferenceProjection,
  type GovernedRuntimeReferenceProjection,
} from '../../shared/runtimeGeography';

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

function readJson(url: URL): unknown {
  return JSON.parse(readFileSync(url, 'utf8')) as unknown;
}

function readJsonl(url: URL): RawFactualRuntimeProjectionRow[] {
  return readFileSync(url, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line) as RawFactualRuntimeProjectionRow);
}

function toGovernedReferenceProjection(value: unknown): GovernedRuntimeReferenceProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Gauteng governed runtime reference projection is invalid.');
  }

  const raw = value as Record<string, unknown>;
  const projection = {
    schemaVersion: raw.schema_version,
    projectionVersion: raw.projection_version,
    sourceFactualProjectionArtifact: raw.source_factual_projection_artifact,
    numericRuntimeIdsAreDurableAuthority: raw.numeric_runtime_ids_are_durable_authority,
    rows: Array.isArray(raw.rows)
      ? raw.rows.map(row => {
          if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw new Error('Gauteng governed runtime reference row is invalid.');
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
  const factualContext = [
    row.factual_context?.province_slug,
    ...(row.factual_context?.administrative_context_names ?? []),
  ].filter((value): value is string => Boolean(value));
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
  const evidenceProvenance: readonly FactualRuntimeEvidenceProvenance[] = (
    row.evidence_provenance ?? []
  ).map(evidence => ({
    sourceId: evidence.source_id,
    sourceUrl: evidence.source_url,
    sourceClass: evidence.source_class,
    assertion: evidence.assertion,
    licensingNote: evidence.licensing_note,
  }));
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

const REFERENCE_PROJECTION_URL = new URL(
  '../../data/gauteng-canonical-runtime-convergence-v0.1/output/gauteng_runtime_reference_projection_v0.1.json',
  import.meta.url,
);
const FACTUAL_PROJECTION_URL = new URL(
  '../../data/gauteng-canonical-runtime-convergence-v0.1/output/gauteng_factual_runtime_mapping_v0.1.jsonl',
  import.meta.url,
);

export const GAUTENG_RUNTIME_REFERENCE_PROJECTION = toGovernedReferenceProjection(
  readJson(REFERENCE_PROJECTION_URL),
);

export const GAUTENG_FACTUAL_RUNTIME_PROJECTION_ENTRIES = Object.freeze(
  readJsonl(FACTUAL_PROJECTION_URL).map(toFactualRuntimeProjectionEntry),
);

export const gautengFactualRuntimeProjectionAuthority = new FactualRuntimeProjectionAuthority(
  GAUTENG_FACTUAL_RUNTIME_PROJECTION_ENTRIES,
);
