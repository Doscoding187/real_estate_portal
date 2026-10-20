import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  School,
  Hospital,
  ShoppingCart,
  Bus,
  Trees,
  MapPin,
  Navigation,
  Star,
  Info,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  NEARBY_AMENITY_CATEGORIES,
  NEARBY_AMENITY_CATEGORY_CONFIG,
  NEARBY_AMENITY_DEFAULT_LIMIT,
  NEARBY_AMENITY_DEFAULT_RADIUS_METRES,
  type NearbyAmenity,
  type NearbyAmenityCategory,
} from '@shared/nearbyAmenities';
import 'leaflet/dist/leaflet.css';

interface NearbyAmenitiesMapProps {
  center?: [number, number];
  radius?: number;
  mapHeight?: number;
  showControls?: boolean;
  onAmenitySelect?: (amenity: NearbyAmenity) => void;
  className?: string;
}

const AMENITY_RADIUS_OPTIONS_KM = [2, 5, 10] as const;

const amenityIcons = {
  education: School,
  healthcare: Hospital,
  shopping: ShoppingCart,
  transport: Bus,
  lifestyle: Trees,
} satisfies Record<NearbyAmenityCategory, typeof MapPin>;

const amenityColors = {
  education: 'text-blue-600',
  healthcare: 'text-red-600',
  shopping: 'text-green-600',
  transport: 'text-purple-600',
  lifestyle: 'text-emerald-600',
} satisfies Record<NearbyAmenityCategory, string>;

const categoryLabels = Object.fromEntries(
  NEARBY_AMENITY_CATEGORY_CONFIG.map(config => [config.id, config.label]),
) as Record<NearbyAmenityCategory, string>;

export function NearbyAmenitiesMap({
  center = [-26.2041, 28.0473], // Johannesburg default
  radius = NEARBY_AMENITY_DEFAULT_RADIUS_METRES / 1000,
  mapHeight = 500,
  showControls = true,
  onAmenitySelect,
  className,
}: NearbyAmenitiesMapProps) {
  const [mapCenter, setMapCenter] = useState(center);
  const [searchRadius, setSearchRadius] = useState(radius);
  const [enabledCategories, setEnabledCategories] = useState<
    Record<NearbyAmenityCategory, boolean>
  >(
    () =>
      Object.fromEntries(NEARBY_AMENITY_CATEGORIES.map(category => [category, true])) as Record<
        NearbyAmenityCategory,
        boolean
      >,
  );
  const [amenities, setAmenities] = useState<NearbyAmenity[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState<NearbyAmenity | null>(null);

  const selectedCategories = NEARBY_AMENITY_CATEGORIES.filter(
    category => enabledCategories[category],
  );

  const getNearbyAmenities = trpc.location.getNearbyAmenities.useQuery(
    {
      latitude: mapCenter[0],
      longitude: mapCenter[1],
      radius: searchRadius * 1000,
      categories: selectedCategories,
      limit: NEARBY_AMENITY_DEFAULT_LIMIT,
    },
    { retry: false, enabled: selectedCategories.length > 0 },
  );

  // Handle map move
  const handleMapMove = useCallback((newCenter: [number, number]) => {
    setMapCenter(newCenter);
  }, []);

  // Update enabled categories
  const toggleAmenityType = useCallback((category: NearbyAmenityCategory) => {
    setEnabledCategories(previous => ({
      ...previous,
      [category]: !previous[category],
    }));
  }, []);

  // Update search radius
  const updateRadius = useCallback((newRadius: number) => {
    setSearchRadius(newRadius);
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const newCenter: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMapCenter(newCenter);
        },
        error => {
          console.error('Error getting current location:', error);
        },
      );
    }
  }, []);

  // Get icon component for amenity category
  const getAmenityIcon = (category: NearbyAmenityCategory) => {
    const IconComponent = amenityIcons[category] || MapPin;
    return <IconComponent className="h-4 w-4" />;
  };

  // Get color class for amenity category
  const getAmenityColor = (category: NearbyAmenityCategory) => {
    return amenityColors[category] || 'text-gray-600';
  };

  const radiusOptions = (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Search radius">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Radius
      </span>
      {AMENITY_RADIUS_OPTIONS_KM.map(option => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={searchRadius === option ? 'default' : 'outline'}
          aria-pressed={searchRadius === option}
          onClick={() => updateRadius(option)}
        >
          {option} km
        </Button>
      ))}
    </div>
  );

  const categoryChips = (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Amenity categories">
      {NEARBY_AMENITY_CATEGORIES.map(category => {
        const enabled = enabledCategories[category];
        return (
          <button
            key={category}
            type="button"
            aria-pressed={enabled}
            onClick={() => toggleAmenityType(category)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              enabled
                ? 'border-primary/30 bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
            }`}
          >
            <span className={enabled ? getAmenityColor(category) : 'text-muted-foreground'}>
              {getAmenityIcon(category)}
            </span>
            {categoryLabels[category]}
          </button>
        );
      })}
    </div>
  );

  useEffect(() => {
    if (getNearbyAmenities.data) {
      setAmenities(getNearbyAmenities.data);
    }
  }, [getNearbyAmenities.data]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Panel */}
      {showControls ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Nearby Amenities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Controls */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={getCurrentLocation} className="flex-1">
                <Navigation className="h-4 w-4 mr-2" />
                My Location
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMapCenter(center)}
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Reset View
              </Button>
            </div>

            {radiusOptions}

            <Separator />

            {/* Amenity Type Filters */}
            <div className="space-y-3">
              <Label>Amenity Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {NEARBY_AMENITY_CATEGORIES.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Switch
                      checked={enabledCategories[category]}
                      onCheckedChange={() => toggleAmenityType(category)}
                      id={`amenity-${category}`}
                    />
                    <Label
                      htmlFor={`amenity-${category}`}
                      className="text-sm flex items-center gap-2"
                    >
                      {getAmenityIcon(category)}
                      {categoryLabels[category]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              {selectedCategories.length === 0
                ? 'Select at least one amenity type.'
                : `Found ${amenities.length} places within ${searchRadius}km`}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          {radiusOptions}
          <div className="text-sm text-muted-foreground">
            {selectedCategories.length === 0
              ? 'Select at least one category.'
              : `${amenities.length} places within ${searchRadius} km`}
          </div>
        </div>
      )}

      {!showControls ? categoryChips : null}

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: `${mapHeight}px`, width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Map move handler */}
            <MapEventHandler onMove={handleMapMove} />

            {/* Amenity markers */}
            {amenities.map(amenity => (
              <Marker
                key={amenity.id}
                position={[amenity.latitude, amenity.longitude]}
                eventHandlers={{
                  click: () => {
                    setSelectedAmenity(amenity);
                    onAmenitySelect?.(amenity);
                  },
                }}
              >
                <Popup className="amenity-popup">
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={getAmenityColor(amenity.category)}>
                        {getAmenityIcon(amenity.category)}
                      </span>
                      <h3 className="font-semibold">{amenity.name}</h3>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">{amenity.address}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {categoryLabels[amenity.category]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {amenity.distance} away
                        </span>
                      </div>

                      {amenity.rating !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs">{amenity.rating.toFixed(1)}</span>
                          {amenity.userRatingsTotal !== null ? (
                            <span className="text-xs text-muted-foreground">
                              ({amenity.userRatingsTotal.toLocaleString('en-ZA')})
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </CardContent>
      </Card>

      {/* Amenities List */}
      {amenities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nearby Amenities ({amenities.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {[...amenities]
              .sort((a, b) => a.distanceValue - b.distanceValue)
              .map(amenity => (
                <div
                  key={amenity.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAmenity?.id === amenity.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedAmenity(amenity);
                    setMapCenter([amenity.latitude, amenity.longitude]);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={getAmenityColor(amenity.category)}>
                          {getAmenityIcon(amenity.category)}
                        </span>
                        <h4 className="font-medium">{amenity.name}</h4>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">{amenity.address}</p>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[amenity.category]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{amenity.distance}</span>
                        {amenity.rating !== null && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-xs">{amenity.rating.toFixed(1)}</span>
                            {amenity.userRatingsTotal !== null ? (
                              <span className="text-xs text-muted-foreground">
                                ({amenity.userRatingsTotal.toLocaleString('en-ZA')})
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {selectedCategories.length > 0 && amenities.length === 0 && getNearbyAmenities.isSuccess && (
        <Card>
          <CardContent className="p-6 text-center">
            <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No qualifying places found within {searchRadius}km of this location.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a wider radius or enabling more amenity categories.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedCategories.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Turn on at least one category to see nearby places.
            </p>
          </CardContent>
        </Card>
      )}

      {getNearbyAmenities.isError && (
        <Card role="alert">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Info className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Nearby places are unavailable right now.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The map still shows the area, but we couldn’t load amenity details. Please try again
                shortly.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => getNearbyAmenities.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {getNearbyAmenities.isLoading && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Searching for nearby amenities...</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Places data © Google. Only established, highly rated places are shown; results are measured
        from the map centre and may sit outside the suburb boundary.
      </p>
    </div>
  );
}

// Helper component to handle map events
function MapEventHandler({ onMove }: { onMove: (center: [number, number]) => void }) {
  useMapEvents({
    moveend: e => {
      const center = e.target.getCenter();
      onMove([center.lat, center.lng]);
    },
  });
  return null;
}
