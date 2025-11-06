import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { School, Hospital, ShoppingCart, Car, MapPin, Navigation, Star, Info } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import 'leaflet/dist/leaflet.css';

interface Amenity {
  id: number;
  name: string;
  type:
    | 'school'
    | 'hospital'
    | 'shopping'
    | 'transport'
    | 'restaurant'
    | 'bank'
    | 'park'
    | 'university';
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  rating?: number;
}

interface NearbyAmenitiesMapProps {
  center?: [number, number];
  radius?: number;
  showControls?: boolean;
  onAmenitySelect?: (amenity: Amenity) => void;
  className?: string;
}

const amenityIcons = {
  school: School,
  hospital: Hospital,
  shopping: ShoppingCart,
  transport: Car,
  restaurant: MapPin,
  bank: MapPin,
  park: MapPin,
  university: School,
};

const amenityColors = {
  school: 'text-blue-600',
  hospital: 'text-red-600',
  shopping: 'text-green-600',
  transport: 'text-purple-600',
  restaurant: 'text-orange-600',
  bank: 'text-yellow-600',
  park: 'text-emerald-600',
  university: 'text-indigo-600',
};

export function NearbyAmenitiesMap({
  center = [-26.2041, 28.0473], // Johannesburg default
  radius = 2,
  showControls = true,
  onAmenitySelect,
  className,
}: NearbyAmenitiesMapProps) {
  const [mapCenter, setMapCenter] = useState(center);
  const [searchRadius, setSearchRadius] = useState(radius);
  const [enabledTypes, setEnabledTypes] = useState<Record<string, boolean>>({
    school: true,
    hospital: true,
    shopping: true,
    transport: true,
    restaurant: false,
    bank: false,
    park: false,
    university: false,
  });
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);

  const getNearbyAmenities = trpc.location.getNearbyAmenities.useQuery({
    latitude: mapCenter[0],
    longitude: mapCenter[1],
    radius: searchRadius,
    types: Object.entries(enabledTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type),
    limit: 50,
  });

  // Handle map move
  const handleMapMove = useCallback((newCenter: [number, number]) => {
    setMapCenter(newCenter);
  }, []);

  // Update enabled types
  const toggleAmenityType = useCallback((type: string) => {
    setEnabledTypes(prev => ({
      ...prev,
      [type]: !prev[type],
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

  // Get icon component for amenity type
  const getAmenityIcon = (type: string) => {
    const IconComponent = amenityIcons[type as keyof typeof amenityIcons] || MapPin;
    return <IconComponent className="h-4 w-4" />;
  };

  // Get color class for amenity type
  const getAmenityColor = (type: string) => {
    return amenityColors[type as keyof typeof amenityColors] || 'text-gray-600';
  };

  useEffect(() => {
    if (getNearbyAmenities.data) {
      setAmenities(getNearbyAmenities.data);
    }
  }, [getNearbyAmenities.data]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Panel */}
      {showControls && (
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

            {/* Radius Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Search Radius</Label>
                <span className="text-sm text-muted-foreground">{searchRadius}km</span>
              </div>
              <Slider
                value={[searchRadius]}
                onValueChange={([value]) => updateRadius(value)}
                max={10}
                min={0.5}
                step={0.5}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Amenity Type Filters */}
            <div className="space-y-3">
              <Label>Amenity Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(enabledTypes).map(([type, enabled]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleAmenityType(type)}
                      id={`amenity-${type}`}
                    />
                    <Label
                      htmlFor={`amenity-${type}`}
                      className="text-sm flex items-center gap-2 capitalize"
                    >
                      {getAmenityIcon(type)}
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              Found {amenities.length} amenities within {searchRadius}km
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '500px', width: '100%' }}
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
                      <span className={getAmenityColor(amenity.type)}>
                        {getAmenityIcon(amenity.type)}
                      </span>
                      <h3 className="font-semibold">{amenity.name}</h3>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">{amenity.address}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                          {amenity.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {amenity.distance}km away
                        </span>
                      </div>

                      {amenity.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs">{amenity.rating.toFixed(1)}</span>
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
            {amenities
              .sort((a, b) => a.distance - b.distance)
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
                        <span className={getAmenityColor(amenity.type)}>
                          {getAmenityIcon(amenity.type)}
                        </span>
                        <h4 className="font-medium">{amenity.name}</h4>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">{amenity.address}</p>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {amenity.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{amenity.distance}km</span>
                        {amenity.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-xs">{amenity.rating.toFixed(1)}</span>
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
      {amenities.length === 0 && getNearbyAmenities.isSuccess && (
        <Card>
          <CardContent className="p-6 text-center">
            <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No amenities found within {searchRadius}km of this location.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try increasing the search radius or enabling more amenity types.
            </p>
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
