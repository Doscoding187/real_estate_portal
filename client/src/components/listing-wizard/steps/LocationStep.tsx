/**
 * Step 5: Location Picker with Map
 * Implements Google Maps integration with pin drop and reverse geocoding
 */

import React, { useState, useEffect, useRef } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const LocationStep: React.FC = () => {
  const { location, setLocation } = useListingWizardStore();
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        // Check if API key is available
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setMapError(
            'Google Maps API key is missing. Please configure VITE_GOOGLE_MAPS_API_KEY in your environment.',
          );
          reject(new Error('Missing API key'));
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;

        window.initMap = () => {
          setIsMapLoaded(true);
          resolve();
        };

        script.onerror = () => {
          setMapError(
            'Failed to load Google Maps. Please check your API key and internet connection.',
          );
          reject(new Error('Failed to load Google Maps'));
        };

        document.head.appendChild(script);
      });
    };

    loadGoogleMapsAPI().catch(error => {
      console.error('Google Maps loading error:', error);
    });
  }, []);

  // Initialize map when API is loaded
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    try {
      // Default center (Johannesburg, South Africa)
      const defaultCenter = { lat: -26.2041, lng: 28.0473 };
      const initialCenter =
        location?.latitude && location?.longitude
          ? { lat: location.latitude, lng: location.longitude }
          : defaultCenter;

      // Initialize map
      const map = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: location?.latitude && location?.longitude ? 15 : 10,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Initialize geocoder
      geocoderRef.current = new window.google.maps.Geocoder();

      // Add click listener to place marker
      map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          placeMarker(event.latLng);
          reverseGeocode(event.latLng);
        }
      });

      // If we have existing location data, place marker
      if (location?.latitude && location?.longitude) {
        const latLng = new window.google.maps.LatLng(location.latitude, location.longitude);
        placeMarker(latLng);
      }
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map. Please try again.');
    }
  }, [isMapLoaded, location]);

  // Place marker on map
  const placeMarker = (latLng: google.maps.LatLng) => {
    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Create new marker
    const marker = new window.google.maps.Marker({
      position: latLng,
      map: mapInstanceRef.current,
      draggable: true,
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
    });

    markerRef.current = marker;

    // Add drag end listener
    marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        reverseGeocode(event.latLng);
      }
    });

    // Center map on marker
    mapInstanceRef.current?.panTo(latLng);
  };

  // Reverse geocode to get address details
  const reverseGeocode = (latLng: google.maps.LatLng) => {
    if (!geocoderRef.current) return;

    setIsGeocoding(true);
    setMapError(null);

    geocoderRef.current.geocode(
      { location: latLng },
      (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        setIsGeocoding(false);

        if (status === 'OK' && results && results[0]) {
          const addressComponents = results[0].address_components;
          const formattedAddress = results[0].formatted_address;
          const placeId = results[0].place_id;

          // Extract address components
          let streetNumber = '';
          let route = '';
          let city = '';
          let suburb = '';
          let province = '';
          let postalCode = '';

          addressComponents.forEach(component => {
            const types = component.types;
            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            } else if (types.includes('route')) {
              route = component.long_name;
            } else if (types.includes('locality')) {
              city = component.long_name;
            } else if (types.includes('sublocality')) {
              suburb = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              province = component.long_name;
            } else if (types.includes('postal_code')) {
              postalCode = component.long_name;
            }
          });

          const fullAddress = streetNumber ? `${streetNumber} ${route}` : route;

          // Update location in store
          setLocation({
            address: fullAddress || formattedAddress,
            latitude: latLng.lat(),
            longitude: latLng.lng(),
            city: city || location?.city || '',
            suburb: suburb || location?.suburb || '',
            province: province || location?.province || '',
            postalCode: postalCode || location?.postalCode || '',
            placeId: placeId,
          });
        } else {
          console.error('Geocoder failed due to: ' + status);
          setMapError(
            'Could not determine address for this location. Please enter address details manually.',
          );
        }
      },
    );
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError('Geolocation is not supported by your browser.');
      return;
    }

    setMapError(null);
    navigator.geolocation.getCurrentPosition(
      position => {
        const latLng = new window.google.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude,
        );
        mapInstanceRef.current?.setCenter(latLng);
        mapInstanceRef.current?.setZoom(15);
        placeMarker(latLng);
        reverseGeocode(latLng);
      },
      error => {
        console.error('Geolocation error:', error);
        setMapError(
          'Unable to get your current location. Please enable location services or enter address manually.',
        );
      },
    );
  };

  // Handle manual address input changes
  const handleAddressChange = (field: keyof typeof location, value: string) => {
    console.log('Updating location field:', field, 'with value:', value);
    console.log('Current location state:', location);
    if (location) {
      const newLocation = { ...location, [field]: value };
      console.log('New location state:', newLocation);
      setLocation(newLocation);
    } else {
      // Initialize location object if it doesn't exist
      const newLocation = {
        address: '',
        latitude: 0,
        longitude: 0,
        city: '',
        province: '',
        [field]: value,
      } as any;
      console.log('Initializing location state:', newLocation);
      setLocation(newLocation);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Property Location</h3>

      {/* Map Container */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Click on the map to place a marker or drag the existing marker to set the property
            location
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={!isMapLoaded || isGeocoding}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Use Current Location
          </Button>
        </div>

        {/* Map */}
        <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
          {!isMapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center p-4">
                <p className="text-red-500 font-medium">{mapError}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please ensure you have configured your Google Maps API key in the environment
                  variables.
                </p>
              </div>
            </div>
          )}

          <div
            ref={mapRef}
            className="w-full h-full"
            style={{ display: isMapLoaded && !mapError ? 'block' : 'none' }}
          />
        </div>

        {isGeocoding && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Determining address...
          </div>
        )}
      </div>

      {/* Manual address input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Full Address *</Label>
          <Input
            placeholder="Street address"
            value={location?.address || ''}
            onChange={e => handleAddressChange('address', e.target.value)}
          />
        </div>
        <div>
          <Label>City *</Label>
          <Input
            value={location?.city || ''}
            onChange={e => handleAddressChange('city', e.target.value)}
          />
        </div>
        <div>
          <Label>Suburb</Label>
          <Input
            value={location?.suburb || ''}
            onChange={e => handleAddressChange('suburb', e.target.value)}
          />
        </div>
        <div>
          <Label>Province *</Label>
          <Input
            value={location?.province || ''}
            onChange={e => handleAddressChange('province', e.target.value)}
          />
        </div>
        <div>
          <Label>Postal Code</Label>
          <Input
            value={location?.postalCode || ''}
            onChange={e => handleAddressChange('postalCode', e.target.value)}
          />
        </div>
      </div>
    </Card>
  );
};

export default LocationStep;
