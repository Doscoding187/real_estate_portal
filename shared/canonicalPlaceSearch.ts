import type { PlaceSearchScope } from './placeAuthority';

export interface CanonicalPlaceSearchLabel {
  canonicalPlaceId: string;
  label: string;
  placeType: string;
  scope: PlaceSearchScope;
  province: string;
  city: string;
  locality: string;
}
