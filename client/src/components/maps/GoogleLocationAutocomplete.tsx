import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Search, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
    main_text_matched_substrings: Array<{
      length: number;
      offset: number;
    }>;
  };
  types: string[];
  matched_substrings: Array<{
    length: number;
    offset: number;
  }>;
}

interface GoogleLocationAutocompleteProps {
  onSelect: (place: {
    place_id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    formatted_address: string;
    types: string[];
    address_components?: google.maps.GeocoderAddressComponent[];
  }) => void;
  placeholder?: string;
  className?: string;
  showCurrentLocation?: boolean;
  locationBias?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // in meters
}

export function GoogleLocationAutocomplete({
  onSelect,
  placeholder = 'Search for a location...',
  className = '',
  showCurrentLocation = true,
  locationBias,
  radius = 25000, // 25km default
}: GoogleLocationAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  // Use shared Google Maps loader
  const { isLoaded, error: mapsError } = useGoogleMaps();
  const error = localError || mapsError;

  // Initialize autocomplete service when API is loaded
  useEffect(() => {
    if (!isLoaded || !window.google || !window.google.maps || !window.google.maps.places) return;

    try {
      // Initialize Places service (requires a map, but we can use a dummy div)
      const mapDiv = document.createElement('div');
      const map = new window.google.maps.Map(mapDiv);
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);

      // Initialize autocomplete service
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    } catch (err) {
      console.error('Error initializing Google Places:', err);
      setLocalError('Failed to initialize Google Places. Please try again.');
    }
  }, [isLoaded]);

  // Handle input change with autocomplete predictions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim().length > 2 && autocompleteServiceRef.current) {
      // Use the autocomplete service for predictions
      getPlacePredictions(value);
    } else {
      setPredictions([]);
      setIsOpen(false);
    }
  };

  // Get place predictions using AutocompleteService
  const getPlacePredictions = useCallback(
    (input: string) => {
      if (!autocompleteServiceRef.current || !input.trim()) return;

      setIsLoading(true);
      setLocalError(null);

      try {
        const request: any = {
          input: input,
          types: ['address'], // Focus on addresses
          componentRestrictions: { country: 'za' }, // South Africa
        };

        // Add location bias if available
        if (locationBias) {
          request.location = new window.google.maps.LatLng(
            locationBias.latitude,
            locationBias.longitude,
          );
          request.radius = radius;
        }

        autocompleteServiceRef.current.getPlacePredictions(
          request,
          (predictions: PlacePrediction[] | null, status: string) => {
            setIsLoading(false);

            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setPredictions(predictions.slice(0, 5));
              setIsOpen(true);
              setSelectedIndex(-1);
            } else {
              setPredictions([]);
              setIsOpen(false);
            }
          },
        );
      } catch (error) {
        console.error('Error getting place predictions:', error);
        setLocalError('Failed to get location suggestions');
        setIsLoading(false);
        setPredictions([]);
        setIsOpen(false);
      }
    },
    [locationBias, radius],
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          selectPrediction(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Select a prediction
  const selectPrediction = (prediction: PlacePrediction) => {
    if (!placesServiceRef.current) return;

    const request = {
      placeId: prediction.place_id,
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'address_components'],
    };

    placesServiceRef.current.getDetails(request, (place: any, status: string) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        onSelect({
          place_id: place.place_id,
          name: place.name || '',
          address: place.formatted_address || place.vicinity || '',
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          formatted_address: place.formatted_address || '',
          types: place.types || [],
          address_components: place.address_components,
        });

        setQuery(place.formatted_address || place.name || '');
        setIsOpen(false);
        setPredictions([]);
        setSelectedIndex(-1);
      }
    });
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocalError('Geolocation is not supported by this browser.');
      return;
    }

    setLocalError(null);
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get address
        if (placesServiceRef.current) {
          const request = {
            location: new window.google.maps.LatLng(latitude, longitude),
            radius: 100,
          };

          placesServiceRef.current.nearbySearch(request, (results: any[], status: string) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results &&
              results.length > 0
            ) {
              const place = results[0];
              onSelect({
                place_id: place.place_id,
                name: place.name || 'Current Location',
                address: place.vicinity || 'Current Location',
                latitude,
                longitude,
                formatted_address: place.vicinity || 'Current Location',
                types: place.types || [],
              });

              setQuery(place.vicinity || 'Current Location');
            } else {
              // Fallback to coordinates
              onSelect({
                place_id: `current_${latitude}_${longitude}`,
                name: 'Current Location',
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                latitude,
                longitude,
                formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                types: ['establishment'],
              });

              setQuery(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          });
        }
      },
      error => {
        console.error('Geolocation error:', error);
        setLocalError('Unable to get your current location. Please enable location services.');
      },
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query && predictions.length > 0 && setIsOpen(true)}
          className="pl-10 pr-10"
          disabled={!window.google}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Current Location Button */}
      {showCurrentLocation && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-8 w-8"
          disabled={!navigator.geolocation || !window.google}
        >
          <Navigation className="h-3 w-3" />
        </Button>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex items-center gap-2 z-50">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto">
          <CardContent className="p-2">
            {predictions.map((prediction, index) => (
              <div
                key={prediction.place_id}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => selectPrediction(prediction)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {prediction.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                    {prediction.types.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs px-2 py-0.5 bg-muted rounded capitalize">
                          {prediction.types[0].replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
