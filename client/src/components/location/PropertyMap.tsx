import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MapPin,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Layers,
  Home,
  Loader2,
  Navigation,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { LocationAutocomplete } from './LocationAutocomplete';

interface Property {
  id: number;
  title: string;
  price: number;
  propertyType: string;
  listingType: string;
  bedrooms?: number;
  bathrooms?: number;
  latitude: string;
  longitude: string;
  mainImage?: string;
  city: string;
  province: string;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface PropertyMapProps {
  className?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onPropertySelect?: (property: Property) => void;
  showFilters?: boolean;
}

export function PropertyMap({
  className,
  center = { lat: -26.2041, lng: 28.0473 }, // Johannesburg default
  zoom = 10,
  height = '600px',
  onPropertySelect,
  showFilters = true,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds>({
    north: center.lat + 0.1,
    south: center.lat - 0.1,
    east: center.lng + 0.1,
    west: center.lng - 0.1,
  });

  const [filters, setFilters] = useState({
    propertyType: [] as string[],
    listingType: [] as string[],
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    bedrooms: undefined as number | undefined,
  });

  const [searchLocation, setSearchLocation] = useState('');

  // Fetch properties within map bounds
  const {
    data: properties,
    isLoading,
    refetch,
  } = trpc.location.getPropertiesOnMap.useQuery(
    {
      bounds: mapBounds,
      filters,
      limit: 100,
    },
    {
      enabled: !!mapInstance,
      refetchOnWindowFocus: false,
    },
  );

  // Initialize map (using Leaflet as it's open source and doesn't require API keys)
  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      // Fix for default markers in Leaflet with Vite
      import('leaflet/dist/leaflet.css');

      // Default icon fix
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView([center.lat, center.lng], zoom);

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Store map instance
      setMapInstance(map);

      // Handle map move end to update bounds
      map.on('moveend', () => {
        const bounds = map.getBounds();
        setMapBounds({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      });

      return () => {
        map.remove();
      };
    });
  }, []);

  // Update markers when properties change
  useEffect(() => {
    if (!mapInstance || !properties) return;

    // Clear existing markers
    markers.forEach(marker => mapInstance.removeLayer(marker));
    setMarkers([]);

    // Add new markers
    const newMarkers: any[] = [];

    properties.forEach(property => {
      if (!property.latitude || !property.longitude) return;

      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      // Create custom icon based on property type
      const iconHtml = `
        <div class="property-marker" style="
          background: ${getPropertyColor(property.propertyType)};
          border: 2px solid white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          ${property.listingType === 'sale' ? 'R' : 'L'}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([lat, lng], { icon: customIcon })
        .addTo(mapInstance)
        .on('click', () => {
          setSelectedProperty(property);
          if (onPropertySelect) {
            onPropertySelect(property);
          }
        });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [properties, mapInstance]);

  const getPropertyColor = (type: string): string => {
    const colors = {
      apartment: '#3B82F6',
      house: '#10B981',
      villa: '#8B5CF6',
      plot: '#F59E0B',
      commercial: '#EF4444',
      townhouse: '#06B6D4',
      cluster_home: '#84CC16',
      farm: '#F97316',
      shared_living: '#EC4899',
    };
    return colors[type as keyof typeof colors] || '#6B7280';
  };

  const handleLocationSelect = (location: any) => {
    if (mapInstance && location.latitude && location.longitude) {
      const lat = parseFloat(location.latitude);
      const lng = parseFloat(location.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapInstance.setView([lat, lng], 12);
        setSearchLocation(location.name);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`relative ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}
    >
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        {showFilters && (
          <Card className="w-80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Map Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LocationAutocomplete
                value={searchLocation}
                onValueChange={setSearchLocation}
                onLocationSelect={handleLocationSelect}
                placeholder="Search location..."
                type="all"
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min Price"
                  value={filters.minPrice || ''}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      minPrice: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice || ''}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      maxPrice: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                />
              </div>

              <select
                className="w-full px-3 py-1 text-sm border rounded"
                value={filters.bedrooms || ''}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    bedrooms: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
              >
                <option value="">Any Bedrooms</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4">4+ Bedrooms</option>
              </select>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map Stats */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Home className="h-4 w-4" />
              <span>{properties?.length || 0} properties</span>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Toggle */}
      <Button
        variant="outline"
        size="sm"
        className="absolute bottom-4 right-4 z-[1000]"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="rounded-lg border"
        style={{ height: isFullscreen ? 'calc(100vh - 2rem)' : height }}
      />

      {/* Property Preview Card */}
      {selectedProperty && (
        <Card className="absolute bottom-20 left-4 w-80 z-[1000]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{selectedProperty.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedProperty.propertyType}</Badge>
              <Badge variant="secondary">{selectedProperty.listingType}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                R {selectedProperty.price.toLocaleString()}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {selectedProperty.bedrooms && <span>{selectedProperty.bedrooms} bed</span>}
                {selectedProperty.bathrooms && <span>{selectedProperty.bathrooms} bath</span>}
              </div>

              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {selectedProperty.city}, {selectedProperty.province}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (onPropertySelect) {
                      onPropertySelect(selectedProperty);
                    }
                  }}
                >
                  View Details
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedProperty(null)}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
