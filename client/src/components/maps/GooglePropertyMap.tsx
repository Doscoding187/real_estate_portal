import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  Layers,
  Filter,
  Search,
  Star,
  Clock,
  Phone,
  Globe,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface PropertyMarker {
  id: number;
  title: string;
  price: number;
  propertyType: string;
  listingType: string;
  latitude: number;
  longitude: number;
  mainImage?: string;
  address: string;
  city: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  distance?: number;
}

interface GooglePropertyMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  properties?: PropertyMarker[];
  showControls?: boolean;
  showFilters?: boolean;
  onPropertySelect?: (property: PropertyMarker) => void;
  onBoundsChange?: (bounds: google.maps.LatLngBounds) => void;
  className?: string;
}

export function GooglePropertyMap({
  center = { lat: -26.2041, lng: 28.0473 }, // Johannesburg default
  zoom = 12,
  properties = [],
  showControls = true,
  showFilters = true,
  onPropertySelect,
  onBoundsChange,
  className,
}: GooglePropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<google.maps.Marker | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyAmenities, setNearbyAmenities] = useState<any[]>([]);

  // Google Maps API loader
  const loadGoogleMapsAPI = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve(window.google);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setIsLoaded(true);
        resolve(window.google);
      };

      script.onerror = reject;
      document.head.appendChild(script);
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsAPI();

        if (!mapRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: mapType,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
          mapTypeControl: showControls,
          streetViewControl: showControls,
          fullscreenControl: showControls,
          zoomControl: showControls,
        });

        mapInstanceRef.current = map;

        // Add bounds change listener
        map.addListener('bounds_changed', () => {
          const bounds = map.getBounds();
          if (bounds && onBoundsChange) {
            onBoundsChange(bounds);
          }
        });

        // Initialize info window
        const infoWindowInstance = new window.google.maps.InfoWindow();
        setInfoWindow(infoWindowInstance);
      } catch (error) {
        console.error('Failed to initialize Google Maps:', error);
      }
    };

    initMap();
  }, [center, zoom, mapType, showControls, loadGoogleMapsAPI, onBoundsChange]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    const newMarkers = properties.map((property, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: property.latitude, lng: property.longitude },
        map: mapInstanceRef.current,
        title: property.title,
        icon: {
          url:
            'data:image/svg+xml;charset=UTF-8,' +
            encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z" fill="#3b82f6"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <circle cx="16" cy="16" r="4" fill="#3b82f6"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40),
        },
        animation: window.google.maps.Animation.DROP,
      });

      // Add click listener
      marker.addListener('click', () => {
        if (selectedMarker) {
          selectedMarker.setAnimation(null);
        }
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
        setSelectedMarker(marker);

        showPropertyInfo(marker, property);
        onPropertySelect?.(property);
      });

      // Add marker with slight delay for animation
      setTimeout(() => {
        marker.setAnimation(window.google.maps.Animation.DROP);
      }, index * 50);

      return marker;
    });

    markersRef.current = newMarkers;

    // Fit bounds to show all properties
    if (newMarkers.length > 0 && mapInstanceRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        bounds.extend(marker.getPosition()!);
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [properties, isLoaded, selectedMarker, onPropertySelect]);

  // Show property info in info window
  const showPropertyInfo = (marker: google.maps.Marker, property: PropertyMarker) => {
    if (!infoWindow) return;

    const priceFormatted = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(property.price);

    const content = `
      <div class="p-4 max-w-sm">
        <div class="flex items-start gap-3">
          ${
            property.mainImage
              ? `
            <img 
              src="${property.mainImage}" 
              alt="${property.title}"
              class="w-16 h-16 rounded-lg object-cover"
            />
          `
              : ''
          }
          <div class="flex-1">
            <h3 class="font-semibold text-lg mb-1">${property.title}</h3>
            <div class="text-blue-600 font-bold text-lg mb-2">${priceFormatted}</div>
            <div class="text-sm text-gray-600 mb-2">${property.address}, ${property.city}</div>
            <div class="flex flex-wrap gap-2 mb-2">
              <span class="px-2 py-1 bg-gray-100 text-xs rounded capitalize">${property.propertyType}</span>
              <span class="px-2 py-1 bg-blue-100 text-xs rounded capitalize">${property.listingType}</span>
              ${property.bedrooms ? `<span class="px-2 py-1 bg-gray-100 text-xs rounded">${property.bedrooms} bed</span>` : ''}
              ${property.bathrooms ? `<span class="px-2 py-1 bg-gray-100 text-xs rounded">${property.bathrooms} bath</span>` : ''}
              ${property.area ? `<span class="px-2 py-1 bg-gray-100 text-xs rounded">${property.area} m²</span>` : ''}
            </div>
            ${property.distance ? `<div class="text-xs text-gray-500">${property.distance.toFixed(1)} km away</div>` : ''}
          </div>
        </div>
      </div>
    `;

    infoWindow.setContent(content);
    infoWindow.open(mapInstanceRef.current, marker);
  };

  // Search for places using Google Places API
  const searchPlaces = async (query: string) => {
    if (!query.trim()) return;

    try {
      const service = new window.google.maps.places.PlacesService(mapInstanceRef.current!);

      const request = {
        query,
        location: center,
        radius: 50000,
        type: 'establishment',
      };

      service.textSearch(request, (results: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          if (results[0]) {
            mapInstanceRef.current!.setCenter(results[0].geometry.location);
            mapInstanceRef.current!.setZoom(15);
          }
        }
      });
    } catch (error) {
      console.error('Place search error:', error);
    }
  };

  // Get nearby amenities using Google Places API
  const getNearbyAmenities = useCallback(async () => {
    if (!mapInstanceRef.current) return;

    try {
      const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);
      const center = mapInstanceRef.current.getCenter();
      if (!center) return;

      const request = {
        location: center,
        radius: 2000,
        type: ['school', 'hospital', 'shopping_mall', 'restaurant', 'bank', 'gas_station'],
      };

      service.nearbySearch(request, (results: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setNearbyAmenities(results.slice(0, 20)); // Limit to 20 results
        }
      });
    } catch (error) {
      console.error('Nearby search error:', error);
    }
  }, []);

  // Show nearby amenities on map
  const toggleNearbyAmenities = useCallback(() => {
    if (!showNearby) {
      getNearbyAmenities();
      setShowNearby(true);
    } else {
      setShowNearby(false);
      setNearbyAmenities([]);
    }
  }, [showNearby, getNearbyAmenities]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          mapInstanceRef.current?.setCenter(newCenter);
          mapInstanceRef.current?.setZoom(15);
        },
        error => {
          console.error('Error getting current location:', error);
        },
      );
    }
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map Controls */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Google Maps Property Finder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for places..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && searchPlaces(searchQuery)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => searchPlaces(searchQuery)}>Search</Button>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={getCurrentLocation}>
                <Navigation className="h-4 w-4 mr-1" />
                My Location
              </Button>

              <Button variant="outline" size="sm" onClick={toggleNearbyAmenities}>
                <Layers className="h-4 w-4 mr-1" />
                {showNearby ? 'Hide' : 'Show'} Nearby
              </Button>

              <select
                value={mapType}
                onChange={e => setMapType(e.target.value as any)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="roadmap">Map</option>
                <option value="satellite">Satellite</option>
                <option value="hybrid">Hybrid</option>
                <option value="terrain">Terrain</option>
              </select>
            </div>

            {/* Property Summary */}
            {properties.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Showing {properties.length} properties on map
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Nearby Amenities List */}
      {showNearby && nearbyAmenities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nearby Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {nearbyAmenities.map((place, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm">{place.name}</h4>
                  <div className="text-xs text-muted-foreground">{place.vicinity}</div>
                  {place.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs">{place.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({place.user_ratings_total} reviews)
                      </span>
                    </div>
                  )}
                  {place.opening_hours?.open_now !== undefined && (
                    <Badge
                      variant={place.opening_hours.open_now ? 'default' : 'secondary'}
                      className="text-xs mt-1"
                    >
                      {place.opening_hours.open_now ? 'Open' : 'Closed'}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={mapRef}
            className="w-full h-96 md:h-[500px] lg:h-[600px]"
            style={{ minHeight: '400px' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
