import type {
  SearchAreaBoundaryKind,
  SearchAreaLifecycle,
  SearchJourneyId,
} from '../../shared/searchScope';

export interface SearchAreaAlias {
  slug: string;
  redirectToSearchAreaId: string;
}

export interface SearchAreaDefinition {
  searchAreaId: string;
  definitionVersion: number;
  label: string;
  description?: string;
  publicSlug?: string;
  parentCanonicalLocationId: string;
  anchorCanonicalLocationId?: string;
  memberCanonicalLocationIds: readonly string[];
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
 * The registry is deliberately empty of active production definitions in
 * S2B-M.1. The preview proof is the only definition and remains preview-only.
 */
export const SEARCH_AREA_DEFINITIONS: readonly SearchAreaDefinition[] = [
  SANDTON_SEARCH_AREA_PREVIEW,
];
