// Data hook for the homepage Trending rail (docs/product/homepage/trending-properties.md).
//
// The web front end and the API deploy separately, so the front end can be live while the API is
// one version behind. The enhanced call sends fields an older API does not know
// (sortOption 'trending', requirePhoto, developmentResultShape). An older API validates its input
// strictly and answers a tRPC BAD_REQUEST. When that happens we run the previous query instead
// and remember it for the rest of the session so later province clicks do not probe again.
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { hasHomePropertyPhoto } from '@shared/homePropertyPhoto';

export type TrendingRailCard = {
  kind?: string;
  id: string | number;
  title: string;
  city?: string;
  suburb?: string;
  location?: string;
  locationLabels?: string[];
  image?: string;
  href: string;
  price: number | null;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  yardSize?: number;
  parking?: { compactValue?: string | number };
  propertyType?: string;
  unitType?: {
    id: string;
    label: string;
    developmentId: number;
    developmentName: string;
    bedrooms: number | null;
    bathrooms: number | null;
    unitSizeM2: number | null;
    priceFrom: number;
    availableUnits: number | null;
  };
};

export const TRENDING_RAIL_LIMIT = 10;

/** Session flag: set once an older API has rejected the enhanced input. Lives for the page session. */
let legacyApiDetected = false;

export function isTrendingRailLegacyMode(): boolean {
  return legacyApiDetected;
}

/** Test helper: clears the remembered legacy mode. */
export function resetTrendingRailLegacyMode(): void {
  legacyApiDetected = false;
}

/** True only for a tRPC BAD_REQUEST (an older API rejecting unknown input fields). */
export function isBadRequestError(error: unknown): boolean {
  const candidate = error as {
    data?: { code?: unknown };
    shape?: { data?: { code?: unknown } };
  } | null;
  return (
    candidate?.data?.code === 'BAD_REQUEST' || candidate?.shape?.data?.code === 'BAD_REQUEST'
  );
}

type Options = {
  listingType: 'sale' | 'rent';
  canonicalPlaceId: string | undefined;
  enabled: boolean;
};

export function useTrendingRailQuery({ listingType, canonicalPlaceId, enabled }: Options) {
  const [legacy, setLegacy] = useState(legacyApiDetected);
  const active = enabled && Boolean(canonicalPlaceId);

  const enhanced = trpc.properties.searchPublicInventory.useQuery(
    {
      listingType,
      canonicalPlaceId,
      sortOption: 'trending',
      requirePhoto: true,
      developmentResultShape: 'unit_type',
      page: 0,
      pageSize: TRENDING_RAIL_LIMIT,
    },
    { enabled: active && !legacy, retry: false },
  );
  const previous = trpc.properties.searchPublicInventory.useQuery(
    {
      listingType,
      // Manual listings only: a province id would otherwise also run the development search.
      listingSource: 'manual',
      canonicalPlaceId,
      sortOption: 'date_desc',
      page: 0,
      pageSize: TRENDING_RAIL_LIMIT,
    },
    { enabled: active && legacy, retry: false },
  );

  const enhancedRejected = !legacy && enhanced.isError && isBadRequestError(enhanced.error);
  useEffect(() => {
    if (enhancedRejected) {
      legacyApiDetected = true;
      setLegacy(true);
    }
  }, [enhancedRejected]);

  if (legacy) {
    const cards = ((previous.data?.cards ?? []) as TrendingRailCard[])
      .filter(item => item.kind !== 'development' && hasHomePropertyPhoto(item.image))
      .slice(0, TRENDING_RAIL_LIMIT);
    return {
      mode: 'legacy' as const,
      cards,
      isLoading: previous.isLoading,
      isError: previous.isError,
      isFetching: previous.isFetching,
      refetch: previous.refetch,
    };
  }

  return {
    mode: 'enhanced' as const,
    cards: ((enhanced.data?.cards ?? []) as TrendingRailCard[]).slice(0, TRENDING_RAIL_LIMIT),
    // While the switch to the previous query is pending, stay in the loading state, not an error.
    isLoading: enhanced.isLoading || enhancedRejected,
    isError: enhanced.isError && !enhancedRejected,
    isFetching: enhanced.isFetching,
    refetch: enhanced.refetch,
  };
}
