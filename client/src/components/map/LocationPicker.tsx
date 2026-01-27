import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange?: (location: { lat: number; lng: number; address?: string }) => void;
  showAddressInput?: boolean;
}

export function LocationPicker({
  initialLat = -26.2041, // Johannesburg default
  initialLng = 28.0473,
  onLocationChange,
  showAddressInput = true,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [position, setPosition] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const initializeMap = async () => {
      // Dynamically import Leaflet to avoid SSR issues
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Fix Leaflet's default icon path
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Create map
      const newMap = L.map(mapRef.current).setView([position.lat, position.lng], 13);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(newMap);

      // Create draggable marker
      const newMarker = L.marker([position.lat, position.lng], {
        draggable: true,
      }).addTo(newMap);

      // Handle marker drag
      newMarker.on('dragend', async (e: any) => {
        const newPos = e.target.getLatLng();
        setPosition({ lat: newPos.lat, lng: newPos.lng });

        // Reverse geocode to get address
        const addressData = await reverseGeocode(newPos.lat, newPos.lng);
        if (addressData) {
          setAddress(addressData);
        }

        if (onLocationChange) {
          onLocationChange({
            lat: newPos.lat,
            lng: newPos.lng,
            address: addressData,
          });
        }
      });

      // Handle map click
      newMap.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        newMarker.setLatLng([lat, lng]);
        setPosition({ lat, lng });

        // Reverse geocode
        const addressData = await reverseGeocode(lat, lng);
        if (addressData) {
          setAddress(addressData);
        }

        if (onLocationChange) {
          onLocationChange({ lat, lng, address: addressData });
        }
      });

      setMap(newMap);
      setMarker(newMarker);
    };

    initializeMap();

    // Cleanup
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Reverse geocoding using Nominatim
  const reverseGeocode = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      );
      const data = await response.json();
      return data.display_name || undefined;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return undefined;
    }
  };

  // Forward geocoding (search address)
  const searchAddress = async () => {
    if (!searchQuery.trim() || !map) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery,
        )}&format=json&limit=1`,
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);

        // Update map and marker
        map.setView([newLat, newLng], 15);
        marker.setLatLng([newLat, newLng]);
        setPosition({ lat: newLat, lng: newLng });
        setAddress(display_name);

        if (onLocationChange) {
          onLocationChange({ lat: newLat, lng: newLng, address: display_name });
        }
      }
    } catch (error) {
      console.error('Address search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Get current location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation || !map || !marker) return;

    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        map.setView([lat, lng], 15);
        marker.setLatLng([lat, lng]);
        setPosition({ lat, lng });

        const addressData = await reverseGeocode(lat, lng);
        if (addressData) {
          setAddress(addressData);
        }

        if (onLocationChange) {
          onLocationChange({ lat, lng, address: addressData });
        }
      },
      error => {
        console.error('Geolocation error:', error);
      },
    );
  };

  return (
    <Card className="rounded-xl border-gray-100 shadow-soft overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 mb-3">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Pin Location on Map</h3>
        </div>

        {showAddressInput && (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search address or area..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && searchAddress()}
                className="pl-10 rounded-xl border-gray-100"
              />
            </div>
            <Button
              onClick={searchAddress}
              disabled={isSearching}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-soft rounded-xl"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
            <Button
              onClick={handleCurrentLocation}
              variant="outline"
              className="rounded-xl border-gray-100"
              title="Use current location"
            >
              <Navigation className="w-4 h-4" />
            </Button>
          </div>
        )}

        {address && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Selected:</span> {address}
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        <div ref={mapRef} className="h-96 w-full" />

        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-soft border border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">Coordinates:</span>
              <code className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </code>
            </div>
            <div className="text-gray-500 text-xs">Drag pin or click map to set location</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
