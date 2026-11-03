import type { CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';
import type { PlaceSearchScope } from '@shared/placeAuthority';

export type ResolvedSearchPlace = {
  placeId: string;
  label: string;
  placeType: string;
  searchScope: PlaceSearchScope;
  administrativeContext: string | null;
  canonicalPath: string | null;
  cityPlaceId: string | null;
  provincePlaceId: string | null;
};

export function canonicalPlaceSelectionFromResolved(
  value: ResolvedSearchPlace | null | undefined,
): CanonicalPlaceSelection | null {
  if (!value) return null;
  return {
    canonicalPlaceId: value.placeId,
    label: value.label,
    placeType: value.placeType,
    scope: value.searchScope,
    administrativeContext: value.administrativeContext,
    canonicalPath: value.canonicalPath,
    parentPlaceId: value.cityPlaceId || value.provincePlaceId || null,
  };
}
