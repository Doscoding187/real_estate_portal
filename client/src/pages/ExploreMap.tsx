import { useMemo, useState } from 'react';
import { CanonicalPlaceSelector, type CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';
import { MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExplorePlatformBridge } from '@/components/ExplorePlatformBridge';
import { trpc } from '@/lib/trpc';

type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export default function ExploreMap() {
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [selectedPlace, setSelectedPlace] = useState<CanonicalPlaceSelection | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  const inventory = trpc.properties.searchPublicInventory.useQuery(
    {
      ...(selectedPlace ? { canonicalPlaceId: selectedPlace.canonicalPlaceId } : {}),
      listingType,
      listingSource: 'manual',
      ...(bounds || {}),
      sortOption: 'relevance',
      page: 0,
      pageSize: 50,
    },
    { retry: false, refetchOnWindowFocus: false },
  );
  const mapProperties = useMemo(
    () =>
      (inventory.data?.cards || []).flatMap(card => {
        const id = Number(card.propertyId ?? card.id);
        const latitude = Number(card.latitude);
        const longitude = Number(card.longitude);
        if (!Number.isSafeInteger(id) || id <= 0 || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return [];
        }
        return [
          {
            id,
            title: card.title,
            price: card.price,
            propertyType: card.propertyType,
            listingType: card.listingType,
            listingSource: 'manual' as const,
            identity: card.identity,
            primaryBadge: card.badges?.[0],
            latitude,
            longitude,
            mainImage: card.image,
            address: card.address || card.location,
            city: card.city,
            bedrooms: card.bedrooms,
            bathrooms: card.bathrooms,
            area: card.area,
          },
        ];
      }),
    [inventory.data?.cards],
  );

  const selectPlace = (place: CanonicalPlaceSelection | null) => {
    setSelectedPlace(place);
    if (place) {
      setBounds(null);
    }
  };

  return (
    <main className="flex h-screen flex-col bg-slate-50">
      <header className="z-20 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3">
          <ExplorePlatformBridge showExploreReturn />
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-indigo-600" />
            Explore properties on the map
          </div>
          <Select value={listingType} onValueChange={value => setListingType(value as 'sale' | 'rent')}>
            <SelectTrigger className="w-36" aria-label="Listing type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">For sale</SelectItem>
              <SelectItem value="rent">For rent</SelectItem>
            </SelectContent>
          </Select>
          <div className="min-w-64 flex-1">
            <CanonicalPlaceSelector
              value={selectedPlace}
              onChange={selectPlace}
              purpose="search"
              label="Place"
              placeholder="Search an admitted Place"
              hint="Choose one Place to narrow the map."
            />
          </div>
          <div className="text-sm text-slate-500">
            {inventory.data?.total ?? 0} listings
          </div>
        </div>
        {inventory.error ? (
          <p className="mx-auto mt-2 max-w-screen-2xl text-sm text-rose-700" role="alert">
            {inventory.error.message}
          </p>
        ) : null}
        {!selectedPlace ? (
          <p className="mx-auto mt-2 max-w-screen-2xl text-xs text-slate-500">
            Showing countrywide public listings. Choose one admitted Place to narrow the map.
          </p>
        ) : null}
      </header>

      <section className="min-h-0 flex-1 p-3 sm:p-5">
        {inventory.isLoading ? (
          <div className="flex h-full items-center justify-center rounded-xl border bg-white text-slate-500">
            Loading public listings…
          </div>
        ) : (
          <GooglePropertyMap
            properties={mapProperties}
            className="h-full"
            onBoundsChange={nextBounds => {
              const southwest = nextBounds.getSouthWest();
              const northeast = nextBounds.getNorthEast();
              setBounds({
                minLat: southwest.lat(),
                maxLat: northeast.lat(),
                minLng: southwest.lng(),
                maxLng: northeast.lng(),
              });
            }}
            onPropertySelect={propertyId => {
              window.location.assign(`/property/${propertyId}`);
            }}
            onRecoveryViewChange={() => window.location.assign('/property-for-sale')}
          />
        )}
      </section>
    </main>
  );
}
