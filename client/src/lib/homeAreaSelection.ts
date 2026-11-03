import type { LocationNode } from '@/types/location';
import type { HomeAreaSelection } from '@/contexts/HomeSearchContext';

export function isBroadHomeLocation(location: LocationNode) {
  // Province and city scopes are broad enough to ask the user to choose one Place.
  return location.type === 'province' || location.type === 'city';
}
export function needsHomeAreaClarification(selection: HomeAreaSelection) {
  return (
    (selection.locations.length === 0 ||
      (selection.locations.length === 1 && isBroadHomeLocation(selection.locations[0])))
  );
}
