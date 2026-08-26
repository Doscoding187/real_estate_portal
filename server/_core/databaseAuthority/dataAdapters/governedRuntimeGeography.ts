import { readFileSync } from 'node:fs';
import {
  assertGovernedRuntimeReferenceProjection,
  type GovernedRuntimeReferenceProjection,
} from '../../../../shared/runtimeGeography';

function loadProjection(): GovernedRuntimeReferenceProjection {
  const value = JSON.parse(
    readFileSync(
      new URL(
        '../../../../data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;

  const rawRows = Array.isArray(value.rows) ? value.rows : [];
  const projection = {
    schemaVersion: value.schema_version,
    projectionVersion: value.projection_version,
    sourceFactualProjectionArtifact: value.source_factual_projection_artifact,
    numericRuntimeIdsAreDurableAuthority: value.numeric_runtime_ids_are_durable_authority,
    checkpoints: value.checkpoints,
    rows: rawRows.map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error('Governed runtime reference projection contains an invalid row.');
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
    }),
  } as unknown;

  assertGovernedRuntimeReferenceProjection(projection);
  return projection;
}

export const GOVERNED_RUNTIME_REFERENCE_PROJECTION = loadProjection();
export const GOVERNED_RUNTIME_REFERENCE_ROWS = GOVERNED_RUNTIME_REFERENCE_PROJECTION.rows;
export const GOVERNED_RUNTIME_REFERENCE_VERSION =
  GOVERNED_RUNTIME_REFERENCE_PROJECTION.projectionVersion;
