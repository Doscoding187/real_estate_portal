import type { LocationNode } from '@/types/location';
import { buildLocationDiscoveryPath, hasCanonicalLocationIdentity } from './locationDiscovery';
import {
  buildTransactionalGeographyHref,
  createCanonicalSearchLocation,
  type GeographySearchContext,
} from './geographySearchHandoff';
import { generateIntentUrl, type SearchIntent } from './searchIntent';
import { createMultiLocationSearchScope, type SearchScope } from '../../../shared/searchScope';
import { sanitizeBuySearchFilters } from '../../../shared/buySearchContract';
import type { ProvincialJourneyId } from '../../../shared/provincialDiscovery';

export interface ProvincialJourneyFilters {
  propertyType?: unknown;
  maxPrice?: unknown;
}

export interface ProvincialSearchHandoffInput {
  journey: ProvincialJourneyId;
  province: LocationNode;
  selectedLocations?: readonly LocationNode[];
  filters?: ProvincialJourneyFilters;
}

interface ProvincialScopeSelection {
  scope: SearchScope;
  context: GeographySearchContext;
  locations: readonly LocationNode[];
}

function contextForDevelopmentScope(
  scope: SearchScope,
  context: GeographySearchContext,
): SearchIntent['geography'] {
  if (scope.kind === 'province') {
    return {
      level: 'province',
      locationId: scope.canonicalLocationId,
      province: context.province,
    };
  }

  if (scope.kind === 'metro_city') {
    return {
      level: 'city',
      locationId: scope.canonicalLocationId,
      province: context.province,
      city: context.city,
    };
  }

  if (scope.kind === 'locality') {
    return {
      level: 'suburb',
      locationId: scope.canonicalLocationId,
      province: context.province,
      city: context.city,
      suburb: context.suburb,
    };
  }

  return {
    level: 'multi_location',
    ...(scope.members[0]?.kind === 'search_area'
      ? { searchAreaIds: scope.members.map(member => member.searchAreaId) }
      : {
          locationIds: scope.members.map(member => member.canonicalLocationId),
        }),
  };
}

function createScopeSelection(
  province: LocationNode,
  selectedLocations: readonly LocationNode[],
): ProvincialScopeSelection | undefined {
  const locations = selectedLocations.length > 0 ? selectedLocations : [province];
  if (locations.some(location => !hasCanonicalLocationIdentity(location))) return undefined;

  const provinceSlug = String(province.provinceSlug || province.slug || '')
    .trim()
    .toLowerCase();
  if (
    locations.some(
      location =>
        location.type !== 'province' &&
        location.provinceSlug &&
        location.provinceSlug.trim().toLowerCase() !== provinceSlug,
    )
  ) {
    return undefined;
  }

  const canonicalLocations = locations
    .map(location => createCanonicalSearchLocation(location))
    .filter((location): location is NonNullable<typeof location> => Boolean(location));
  if (canonicalLocations.length !== locations.length) return undefined;

  if (canonicalLocations.length === 1) {
    return {
      scope: canonicalLocations[0].scope,
      context: canonicalLocations[0].context,
      locations,
    };
  }

  const scope = createMultiLocationSearchScope(canonicalLocations.map(location => location.scope));
  if (!scope) return undefined;

  return { scope, context: {}, locations };
}

/**
 * Province composition adapter. It owns no search rules: canonical scope,
 * transaction URL serialization and validation remain in the shared handoff
 * and intent authorities.
 */
export function buildProvincialJourneyHref(
  input: ProvincialSearchHandoffInput,
): string | undefined {
  const selection = createScopeSelection(input.province, input.selectedLocations || []);
  if (!selection) return undefined;

  if (input.journey === 'explore') {
    return selection.locations.length === 1
      ? buildLocationDiscoveryPath(selection.locations[0])
      : undefined;
  }

  if (input.journey !== 'buy' && input.journey !== 'rent' && input.journey !== 'developments') {
    return undefined;
  }

  const filters = sanitizeBuySearchFilters({
    propertyType: input.filters?.propertyType,
    maxPrice: input.filters?.maxPrice,
  });

  if (input.journey === 'buy' || input.journey === 'rent') {
    return buildTransactionalGeographyHref({
      journey: input.journey,
      scope: selection.scope,
      context: selection.context,
      filters,
      resultState: { sort: 'relevance', page: 0 },
    });
  }

  return generateIntentUrl({
    transactionType: 'developments',
    geography: contextForDevelopmentScope(selection.scope, selection.context),
    filters: {},
    resultState: { sort: 'relevance', page: 0 },
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
    routeMode: 'results',
  });
}
