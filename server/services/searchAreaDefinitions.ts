import type {
  SearchAreaBoundaryKind,
  SearchAreaLifecycle,
  SearchJourneyId,
} from '../../shared/searchScope';
import type {
  FactualGeographyType,
  RuntimeReferenceStatus,
  RuntimeProjectionStatus,
  RuntimeSearchScopeKind,
} from '../../shared/factualRuntimeGeographyBridge';
import { GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS } from './gautengSearchAreaCandidateDefinitions';

export interface SearchAreaAlias {
  slug: string;
  redirectToSearchAreaId: string;
}

export type SearchAreaMemberResolutionState = 'projection_ready' | 'unresolved';

/**
 * Governed Search Area membership. The factual identity and runtime natural
 * key are durable inputs; a target environment supplies the numeric row only
 * while resolving the member for a query.
 */
export interface SearchAreaMemberDefinition {
  factualLocationId: string;
  factualPreferredName?: string;
  factualType?: FactualGeographyType;
  scopeKind: RuntimeSearchScopeKind;
  runtimeNaturalKey?: string;
  resolutionState: SearchAreaMemberResolutionState;
  projectionStatus?: RuntimeProjectionStatus;
  runtimeReferenceStatus?: RuntimeReferenceStatus;
  resolutionReason?: string;
}

export interface SearchAreaContext {
  contextType?: string;
  contextNames: readonly string[];
  primaryContextName?: string;
  /** Context is descriptive only and never defines the member boundary. */
  isMembershipParent: false;
}

export interface SearchAreaDefinition {
  searchAreaId: string;
  definitionVersion: number;
  label: string;
  description?: string;
  publicSlug?: string;
  /** Legacy context retained for the Sandton preview contract. */
  parentCanonicalLocationId?: string;
  anchorCanonicalLocationId?: string;
  anchorFactualLocationId?: string;
  /** New factual-ID-first member contract. */
  members?: readonly SearchAreaMemberDefinition[];
  /** Legacy numeric member contract retained only for compatibility preview. */
  memberCanonicalLocationIds?: readonly string[];
  canonicalContext?: SearchAreaContext;
  productionActivation?: boolean;
  candidateStatus?: 'candidate' | 'preview' | 'active' | 'deprecated' | 'superseded';
  supportedJourneys: readonly SearchJourneyId[];
  lifecycle: SearchAreaLifecycle;
  boundary: {
    kind: SearchAreaBoundaryKind;
  };
  aliases?: readonly SearchAreaAlias[];
}

/**
 * This is the existing private geography proof only. It is intentionally not
 * active and must not be returned as a production destination. The member is
 * retained here solely so the authority contract can be exercised against an
 * explicit canonical identity without inventing additional Sandton members.
 */
export const SANDTON_SEARCH_AREA_PREVIEW: SearchAreaDefinition = {
  searchAreaId: 'johannesburg-sandton',
  definitionVersion: 1,
  label: 'Sandton',
  description: 'Private preview Search Area contract proof.',
  publicSlug: 'sandton',
  parentCanonicalLocationId: 'city:12',
  anchorCanonicalLocationId: 'suburb:34',
  memberCanonicalLocationIds: ['suburb:34'],
  supportedJourneys: ['buy', 'rent'],
  lifecycle: 'preview',
  boundary: {
    kind: 'canonical_members',
  },
};

/**
 * One server-owned registry contains the historical private preview proof and
 * the six accepted Gauteng definitions. The accepted membership source remains
 * candidate-shaped for provenance; this runtime registry is the single
 * lifecycle transition that makes those same definitions publicly executable.
 * No member or boundary data is duplicated or changed here.
 */
export const SEARCH_AREA_DEFINITIONS: readonly SearchAreaDefinition[] = [
  SANDTON_SEARCH_AREA_PREVIEW,
  ...GAUTENG_SEARCH_AREA_CANDIDATE_DEFINITIONS.map(definition => ({
    ...definition,
    productionActivation: true,
    candidateStatus: 'active' as const,
    lifecycle: 'active' as const,
  })),
];
