import { readFileSync } from 'node:fs';
import type {
  RuntimeReferenceStatus,
  RuntimeSearchScopeKind,
} from '../../shared/factualRuntimeGeographyBridge';
import type {
  SearchAreaContext,
  SearchAreaDefinition,
  SearchAreaMemberDefinition,
} from './searchAreaDefinitions';

interface RawCandidateDefinition {
  search_area_id: string;
  preferred_name: string;
  description?: string;
  normalized_name: string;
  canonical_context: {
    context_type?: string;
    context_names: string[];
    primary_context_name?: string;
    is_membership_parent: false;
  };
  optional_anchor?: {
    canonical_location_id?: string | null;
  };
  production_activation: false;
}

interface RawCompatibilityMember {
  factual_location_id: string;
  factual_location_preferred_name: string;
  factual_type: string;
  projection_status: 'projection_ready' | 'ambiguous_projection' | 'unsupported_search_scope' | 'factual_geography_blocker' | 'other_material_blocker';
  runtime_reference_status?: RuntimeReferenceStatus | null;
  runtime_search_scope_kind?: RuntimeSearchScopeKind | null;
  runtime_natural_key?: string | null;
  search_area_id: string;
  blocker?: { code: string; reason: string } | null;
}

interface RawCompatibilityArea {
  search_area_id: string;
  member_count?: number;
  members: RawCompatibilityMember[];
}

interface RawCompatibilityDocument {
  production_activation: false;
  active_membership_count: number;
  search_areas: RawCompatibilityArea[];
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as unknown;
}

const definitionsDocument = readJson(
  '../../data/gauteng-search-area-candidates-v0.1/output/gauteng_search_area_definitions_v0.1.json',
) as { search_areas: RawCandidateDefinition[] };
const compatibilityDocument = readJson(
  '../../data/gauteng-canonical-runtime-convergence-v0.1/output/gauteng_search_area_runtime_compatibility_v0.1.json',
) as RawCompatibilityDocument;

function contextForDefinition(definition: RawCandidateDefinition): SearchAreaContext {
  return {
    ...(definition.canonical_context.context_type
      ? { contextType: definition.canonical_context.context_type }
      : {}),
    contextNames: definition.canonical_context.context_names,
    ...(definition.canonical_context.primary_context_name
      ? { primaryContextName: definition.canonical_context.primary_context_name }
      : {}),
    isMembershipParent: false,
  };
}

function toMemberDefinition(member: RawCompatibilityMember): SearchAreaMemberDefinition {
  if (!member.runtime_search_scope_kind) {
    throw new Error(
      `Candidate member ${member.factual_location_id} has no executable runtime scope.`,
    );
  }

  const projectionReady = member.projection_status === 'projection_ready';
  return {
    factualLocationId: member.factual_location_id,
    factualPreferredName: member.factual_location_preferred_name,
    factualType: member.factual_type,
    scopeKind: member.runtime_search_scope_kind,
    ...(projectionReady && member.runtime_natural_key
      ? { runtimeNaturalKey: member.runtime_natural_key }
      : {}),
    resolutionState: projectionReady ? 'projection_ready' : 'unresolved',
    projectionStatus: member.projection_status,
    ...(member.runtime_reference_status
      ? { runtimeReferenceStatus: member.runtime_reference_status }
      : {}),
    ...(member.blocker?.reason ? { resolutionReason: member.blocker.reason } : {}),
  };
}

function candidateDefinition(
  definition: RawCandidateDefinition,
  compatibility: RawCompatibilityArea,
): SearchAreaDefinition {
  const members = compatibility.members.map(toMemberDefinition);
  if (members.length === 0) throw new Error(`Candidate Search Area ${definition.search_area_id} is empty.`);

  return {
    searchAreaId: definition.search_area_id,
    definitionVersion: 1,
    label: definition.preferred_name,
    ...(definition.description ? { description: definition.description } : {}),
    publicSlug: definition.normalized_name.replace(/\s+/g, '-'),
    anchorFactualLocationId: definition.optional_anchor?.canonical_location_id || undefined,
    members,
    canonicalContext: contextForDefinition(definition),
    productionActivation: false,
    candidateStatus: 'candidate',
    // Each member has an exact canonical locality boundary, which Land executes
    // against parcel geography. This is explicit journey authorization, not a
    // derived consequence of ordinary Buy support.
    supportedJourneys: ['buy', 'rent', 'plot_land'],
    lifecycle: 'preview',
    boundary: { kind: 'canonical_members' },
  };
}

const compatibilityById = new Map(
  compatibilityDocument.search_areas.map(area => [area.search_area_id, area]),
);

if (
  definitionsDocument.search_areas.length !== 6 ||
  compatibilityDocument.production_activation !== false ||
  compatibilityDocument.search_areas.length !== definitionsDocument.search_areas.length ||
  definitionsDocument.search_areas.some(definition => definition.production_activation !== false) ||
  compatibilityDocument.search_areas.some(
    area => area.member_count !== undefined && area.member_count !== area.members.length,
  ) ||
    compatibilityDocument.search_areas.reduce((total, area) => total + area.members.length, 0) !== 61
) {
  throw new Error('The accepted Gauteng Search Area candidate source boundary is invalid.');
}

export const GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS: readonly SearchAreaDefinition[] =
  definitionsDocument.search_areas
    .map(definition => {
      const compatibility = compatibilityById.get(definition.search_area_id);
      if (!compatibility) {
        throw new Error(`No runtime compatibility rows for ${definition.search_area_id}.`);
      }
      return candidateDefinition(definition, compatibility);
    })
    .sort((left, right) => left.searchAreaId.localeCompare(right.searchAreaId));

if (
  GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.length !== 6 ||
  compatibilityDocument.active_membership_count !== 61
) {
  throw new Error('The accepted Gauteng Search Area candidate boundary is not six areas / 61 members.');
}
