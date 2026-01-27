import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Navigation,
  Star,
  Clock,
  Phone,
  Globe,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

interface AmenityPlace {
  place_id: string;
  name: string;
  vicinity: string;
  location: { lat: number; lng: number };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types: string[];
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
    url: string;
  }>;
  distance: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  business_status?: string;
  website?: string;
  formatted_phone_number?: string;
}

interface GoogleAmenitiesMapProps {
  center?: { lat: number; lng: number };
  radius?: number; // in meters
  showControls?: boolean;
  enabledTypes?: string[];
  onAmenitySelect?: (amenity: AmenityPlace) => void;
  className?: string;
}

const AMENITY_TYPES = [
  { key: 'school', label: 'Schools', color: 'bg-blue-500' },
  { key: 'hospital', label: 'Hospitals', color: 'bg-red-500' },
  { key: 'shopping_mall', label: 'Shopping', color: 'bg-green-500' },
  { key: 'restaurant', label: 'Restaurants', color: 'bg-orange-500' },
  { key: 'bank', label: 'Banks', color: 'bg-yellow-500' },
  { key: 'gas_station', label: 'Gas Stations', color: 'bg-purple-500' },
  { key: 'pharmacy', label: 'Pharmacies', color: 'bg-teal-500' },
  { key: 'park', label: 'Parks', color: 'bg-emerald-500' },
  { key: 'gym', label: 'Gyms', color: 'bg-pink-500' },
  { key: 'supermarket', label: 'Supermarkets', color: 'bg-indigo-500' },
];

export function GoogleAmenitiesMap({
  center = { lat: -26.2041, lng: 28.0473 }, // Johannesburg default
  radius = 2000, // 2km default
  showControls = true,
  enabledTypes = ['school', 'hospital', 'shopping_mall', 'restaurant'],
  onAmenitySelect,
  className,
}: GoogleAmenitiesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const { isLoaded, error: mapsError } = useGoogleMaps();
  const [amenities, setAmenities] = useState<AmenityPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityPlace | null>(null);
  const [currentEnabledTypes, setCurrentEnabledTypes] = useState<string[]>(enabledTypes);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);

  const error = localError || mapsError;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      mapTypeControl: showControls,
      streetViewControl: showControls,
      fullscreenControl: showControls,
      zoomControl: showControls,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    mapInstanceRef.current = map;

    // Initialize info window
    const infoWindowInstance = new window.google.maps.InfoWindow();
    setInfoWindow(infoWindowInstance);
  }, [center, isLoaded, showControls]);

  // Load amenities data using Google Places API
  const loadAmenities = useCallback(async () => {
    if (!mapInstanceRef.current || !window.google) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);
      const center = mapInstanceRef.current.getCenter();
      if (!center) return;

      const allAmenities: AmenityPlace[] = [];

      // Search for each enabled type
      for (const type of currentEnabledTypes) {
        const request = {
          location: center,
          radius: radius,
          type: type,
        };

        await new Promise<void>((resolve, reject) => {
          service.nearbySearch(request, (results: any[], status: string) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              const amenitiesForType = results.slice(0, 20).map(place => {
                const distance = calculateHaversineDistance(
                  center.lat(),
                  center.lng(),
                  place.geometry.location.lat(),
                  place.geometry.location.lng(),
                );

                return {
                  place_id: place.place_id,
                  name: place.name,
                  vicinity: place.vicinity,
                  location: {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  },
                  rating: place.rating,
                  user_ratings_total: place.user_ratings_total,
                  price_level: place.price_level,
                  types: place.types || [],
                  photos:
                    place.photos?.slice(0, 3).map((photo: any) => ({
                      photo_reference: photo.photo_reference,
                      width: photo.width,
                      height: photo.height,
                      url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=300&photoreference=${photo.photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`,
                    })) || [],
                  distance: Math.round(distance * 100) / 100,
                  opening_hours: place.opening_hours,
                  business_status: place.business_status,
                  website: place.website,
                  formatted_phone_number: place.formatted_phone_number,
                } as AmenityPlace;
              });

              allAmenities.push(...amenitiesForType);
              resolve();
            } else {
              reject(new Error(`Places search failed for type: ${type}`));
            }
          });
        });
      }

      // Sort by distance and limit total results
      const sortedAmenities = allAmenities.sort((a, b) => a.distance - b.distance).slice(0, 50);

      setAmenities(sortedAmenities);
    } catch (error) {
      console.error('Error loading amenities:', error);
      setError('Failed to load nearby amenities');
    } finally {
      setIsLoading(false);
    }
  }, [currentEnabledTypes, radius]);

  // Update markers when amenities change
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || amenities.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Group amenities by type for different icons
    const amenitiesByType = amenities.reduce(
      (acc, amenity) => {
        const primaryType =
          amenity.types.find(type => AMENITY_TYPES.find(t => t.key === type)) || amenity.types[0];
        if (!acc[primaryType]) acc[primaryType] = [];
        acc[primaryType].push(amenity);
        return acc;
      },
      {} as Record<string, AmenityPlace[]>,
    );

    // Create markers for each amenity
    const newMarkers: google.maps.Marker[] = [];

    Object.entries(amenitiesByType).forEach(([type, typeAmenities]) => {
      const typeInfo = AMENITY_TYPES.find(t => t.key === type) || AMENITY_TYPES[0];
      const color = typeInfo.color.replace('bg-', '').replace('-500', '');

      typeAmenities.forEach(amenity => {
        const marker = new window.google.maps.Marker({
          position: amenity.location,
          map: mapInstanceRef.current,
          title: amenity.name,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="white" stroke="var(--${color}-500)" stroke-width="2"/>
                <circle cx="12" cy="12" r="4" fill="var(--${color}-500)"/>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 12),
          },
          animation: window.google.maps.Animation.DROP,
        });

        // Add click listener
        marker.addListener('click', () => {
          if (selectedAmenity) {
            selectedAmenity.marker?.setAnimation(null);
          }
          marker.setAnimation(window.google.maps.Animation.BOUNCE);
          setSelectedAmenity({ ...amenity, marker });

          showAmenityInfo(marker, amenity);
          onAmenitySelect?.(amenity);
        });

        newMarkers.push(marker);
      });
    });

    markersRef.current = newMarkers;

    // Fit bounds to show all amenities
    if (newMarkers.length > 0 && mapInstanceRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        bounds.extend(marker.getPosition()!);
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [amenities, isLoaded, selectedAmenity, onAmenitySelect]);

  // Show amenity info in info window
  const showAmenityInfo = (
    marker: google.maps.Marker,
    amenity: AmenityPlace & { marker?: google.maps.Marker },
  ) => {
    if (!infoWindow) return;

    const ratingStars = amenity.rating
      ? '★'.repeat(Math.floor(amenity.rating)) + '☆'.repeat(5 - Math.floor(amenity.rating))
      : '';

    const content = `
      <div class="p-4 max-w-sm">
        <div class="space-y-3">
          <div>
            <h3 class="font-semibold text-lg mb-1">${amenity.name}</h3>
            <p class="text-sm text-gray-600">${amenity.vicinity}</p>
          </div>
          
          ${
            amenity.rating
              ? `
            <div class="flex items-center gap-2">
              <span class="text-yellow-500 text-sm">${ratingStars}</span>
              <span class="text-sm">${amenity.rating}</span>
              ${amenity.user_ratings_total ? `<span class="text-xs text-gray-500">(${amenity.user_ratings_total} reviews)</span>` : ''}
            </div>
          `
              : ''
          }
          
          <div class="flex flex-wrap gap-2">
            ${amenity.types
              .slice(0, 2)
              .map(
                type => `
              <span class="px-2 py-1 bg-gray-100 text-xs rounded capitalize">${type.replace(/_/g, ' ')}</span>
            `,
              )
              .join('')}
          </div>
          
          <div class="text-xs text-gray-500">${amenity.distance.toFixed(1)} km away</div>
          
          ${
            amenity.opening_hours
              ? `
            <div class="text-sm">
              <span class="px-2 py-1 rounded text-xs ${amenity.opening_hours.open_now ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                ${amenity.opening_hours.open_now ? 'Open' : 'Closed'}
              </span>
            </div>
          `
              : ''
          }
          
          ${
            amenity.website || amenity.formatted_phone_number
              ? `
            <div class="flex gap-2 text-sm">
              ${amenity.website ? `<a href="${amenity.website}" target="_blank" class="text-blue-600 hover:underline">Website</a>` : ''}
              ${amenity.formatted_phone_number ? `<span class="text-gray-600">${amenity.formatted_phone_number}</span>` : ''}
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;

    infoWindow.setContent(content);
    infoWindow.open(mapInstanceRef.current, marker);
  };

  // Toggle amenity type
  const toggleAmenityType = (type: string) => {
    setCurrentEnabledTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  };

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;

    navigator.geolocation.getCurrentPosition(
      position => {
        const newCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        mapInstanceRef.current!.setCenter(newCenter);
        mapInstanceRef.current!.setZoom(15);
      },
      error => {
        console.error('Error getting current location:', error);
        setError('Unable to get your current location');
      },
    );
  }, []);

  // Reset view
  const resetView = () => {
    mapInstanceRef.current?.setCenter(center);
    mapInstanceRef.current?.setZoom(15);
  };

  // Load amenities when enabled types change
  useEffect(() => {
    if (currentEnabledTypes.length > 0) {
      loadAmenities();
    } else {
      // Clear markers if no types enabled
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      setAmenities([]);
    }
  }, [currentEnabledTypes, loadAmenities]);

  // Get type info helper
  const getTypeInfo = (type: string) => {
    return AMENITY_TYPES.find(t => t.key === type) || AMENITY_TYPES[0];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Panel */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Google Places - Nearby Amenities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Controls */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={getCurrentLocation}>
                <Navigation className="h-4 w-4 mr-2" />
                My Location
              </Button>
              <Button variant="outline" size="sm" onClick={resetView}>
                <MapPin className="h-4 w-4 mr-2" />
                Reset View
              </Button>
              <Button variant="outline" size="sm" onClick={loadAmenities} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>

            {/* Radius Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Search Radius: {(radius / 1000).toFixed(1)}km
              </label>
              <input
                type="range"
                min="500"
                max="5000"
                step="500"
                value={radius}
                onChange={e => {
                  // This would need to be passed as a prop or state to update radius
                  console.log('Radius changed:', e.target.value);
                }}
                className="w-full"
              />
            </div>

            {/* Amenity Type Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amenity Types</label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITY_TYPES.map(type => (
                  <label key={type.key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentEnabledTypes.includes(type.key)}
                      onChange={() => toggleAmenityType(type.key)}
                      className="rounded"
                    />
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                      <span className="text-sm">{type.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              Found {amenities.length} amenities within {(radius / 1000).toFixed(1)}km
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div ref={mapRef} className="w-full h-96 md:h-[500px]" style={{ minHeight: '400px' }} />
        </CardContent>
      </Card>

      {/* Amenities List */}
      {amenities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nearby Amenities ({amenities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {amenities
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 20) // Limit to 20 items in list
                .map(amenity => {
                  const typeInfo = getTypeInfo(
                    amenity.types.find(t => AMENITY_TYPES.find(type => type.key === t)) ||
                      amenity.types[0],
                  );
                  return (
                    <div
                      key={amenity.place_id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAmenity?.place_id === amenity.place_id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedAmenity({ ...amenity, marker: undefined });
                        mapInstanceRef.current?.setCenter(amenity.location);
                        mapInstanceRef.current?.setZoom(16);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-3 h-3 rounded-full ${typeInfo.color}`}></div>
                            <h4 className="font-medium">{amenity.name}</h4>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">{amenity.vicinity}</p>

                          <div className="flex items-center gap-3">
                            {amenity.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-xs">{amenity.rating}</span>
                                {amenity.user_ratings_total && (
                                  <span className="text-xs text-muted-foreground">
                                    ({amenity.user_ratings_total})
                                  </span>
                                )}
                              </div>
                            )}

                            <span className="text-xs text-muted-foreground">
                              {amenity.distance.toFixed(1)}km
                            </span>

                            {amenity.opening_hours && (
                              <Badge
                                variant={amenity.opening_hours.open_now ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {amenity.opening_hours.open_now ? 'Open' : 'Closed'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {amenity.photos && amenity.photos.length > 0 && (
                          <img
                            src={amenity.photos[0].url}
                            alt={amenity.name}
                            className="w-12 h-12 rounded object-cover ml-2"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {amenities.length === 0 && !isLoading && !error && currentEnabledTypes.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Enable amenity types to see nearby places</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function for calculating Haversine distance
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
