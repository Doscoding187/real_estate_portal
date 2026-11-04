import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { isCanonicalPlaceId, type PlaceSearchScope } from '@shared/placeAuthority';
import type { HomeAreaSelection } from '@/contexts/HomeSearchContext';
import type { LocationNode } from '@/types/location';

function scopeFromLocation(location: LocationNode): PlaceSearchScope {
  if (location.type === 'province') return 'province';
  if (location.type === 'city') return 'metro_city';
  return 'locality';
}

function initialPlace(locations: LocationNode[]): CanonicalPlaceSelection | null {
  const location = locations[0];
  const canonicalPlaceId = location?.canonicalPlaceId;
  if (!location || !isCanonicalPlaceId(canonicalPlaceId)) return null;
  return {
    canonicalPlaceId,
    label: location.name,
    placeType: location.factualType || location.type,
    scope: scopeFromLocation(location),
    administrativeContext: location.selectionContextLabel || null,
    canonicalPath: location.canonicalPath || null,
    parentPlaceId: location.parentCanonicalPlaceId || null,
  };
}

function locationFromPlace(place: CanonicalPlaceSelection): LocationNode {
  const segments = place.canonicalPath?.split('/').filter(Boolean) || [];
  const type: LocationNode['type'] =
    place.scope === 'province' ? 'province' : place.scope === 'metro_city' ? 'city' : 'suburb';
  return {
    canonicalPlaceId: place.canonicalPlaceId,
    factualType: place.placeType,
    name: place.label,
    slug: segments[segments.length - 1] || place.canonicalPlaceId,
    type,
    ...(segments[0] ? { provinceSlug: segments[0] } : {}),
    ...(type === 'suburb' && segments.length > 2 ? { citySlug: segments[1] } : {}),
    ...(place.parentPlaceId ? { parentCanonicalPlaceId: place.parentPlaceId } : {}),
    ...(place.canonicalPath ? { canonicalPath: place.canonicalPath } : {}),
    selectionTypeLabel: place.placeType.replace(/_/g, ' '),
    ...(place.administrativeContext ? { selectionContextLabel: place.administrativeContext } : {}),
  };
}

export function HomeAreaPicker({
  open,
  onOpenChange,
  initialSelection,
  journey,
  category,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelection: HomeAreaSelection;
  journey: 'buy' | 'rent' | 'developments';
  category?: string;
  onConfirm: (selection: HomeAreaSelection) => void;
}) {
  const [selectedPlace, setSelectedPlace] = useState(() =>
    initialPlace(initialSelection.locations),
  );
  const journeyLabel =
    journey === 'rent' ? 'Rent' : journey === 'developments' ? 'New developments' : 'Buy';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-xl sm:p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">Choose a Place</DialogTitle>
          <DialogDescription className="leading-6">
            {journeyLabel}
            {category ? ` · ${category}` : ''}. Choose one admitted canonical Place.
          </DialogDescription>
        </DialogHeader>
        <CanonicalPlaceSelector
          value={selectedPlace}
          onChange={setSelectedPlace}
          purpose="search"
          label="Search a city, town, suburb or locality"
          placeholder="Start typing a place name"
          hint="The selected Place ID will be used for the search."
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedPlace}
            onClick={() => {
              if (!selectedPlace) return;
              onConfirm({ locations: [locationFromPlace(selectedPlace)] });
            }}
          >
            {selectedPlace?.scope === 'locality' ? 'Search this locality' : 'Explore areas'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
