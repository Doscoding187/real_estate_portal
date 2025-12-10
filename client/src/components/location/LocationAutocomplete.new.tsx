/**
 * LocationAutocomplete Component
 * 
 * A Google Places autocomplete component with South Africa bias, debouncing,
 * keyboard navigation, and mobile responsiveness.
 * 
 * Requirements:
 * - 1.1-1.5: Google Places autocomplete with South Africa bias
 * - 5.1: Debounced input handling (300ms)
 * - 8.1-8.5: Mobile responsiveness (44px touch targets)
 * - 13.1-13.5: Keyboard navigation support
 * 
 * Features:
 * - Real-time autocomplete suggestions from Google Places API
 * - Debounced input (300ms delay)
 * - Session token management
 * - Loading and error states
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Mobile-optimized touch targets (44px minimum)
 * - Recent searches display
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertCircle, Clock, X } from 'lucide-react';

export interface LocationData {
  place_id: string;
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  address_components?: {
    province?: string;
    city?: string;
    suburb?: string;
    street_address?: string;
  };
  viewport?: {
    ne_lat: number;
    ne_lng: number;
    sw_lat: number;
    sw_lng: number;
  };
  gps_accuracy?: 'accurate' | 'manual'; // Requirement 7.5: Mark GPS accuracy
}

export interface LocationAutocompleteProps {
  value: string;
  onChange: (location: LocationData) => void;
  placeholder?: string;
  required?: boolean;
  showMapPreview?: boolean;
  allowManualEntry?: boolean;
  className?: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const DEBOUNCE_DELAY = 300; // 300ms as per requirement 5.1
const MIN_INPUT_LENGTH = 3; // Minimum 3 characters as per requirement 1.2
const MAX_SUGGESTIONS = 5; // Display up to 5 suggestions as per requirement 1.3
const TOUCH_TARGET_HEIGHT = 44; // 44px minimum for mobile as per requirement 8.1

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a location...',
  required = false,
  showMapPreview = false,
  allowManualEntry = true,
  className = '',
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<PlacePrediction[]>([]);
  const [isManualMode, setIsManualMode] = useState(false); // Requirement 7.1: Manual text entry mode
  const [isGeocoding, setIsGeocoding] = useState(false); // Loading state for geocoding

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Places services
  useEffect(() => {
    if (!window.google?.maps?.places) {
      // Requirement 11.1: Fall back to manual entry when API unavailable
      if (allowManualEntry) {
        setError('Location autocomplete temporarily unavailable. You can enter the address manually.');
        setIsManualMode(true);
      } else {
        setError('Google Maps API not loaded');
      }
      return;
    }

    try {
      // Initialize autocomplete service
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();

      // Initialize places service (requires a map element)
      const mapDiv = document.createElement('div');
      const map = new google.maps.Map(mapDiv);
      placesServiceRef.current = new google.maps.places.PlacesService(map);

      // Initialize session token
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

      // Load recent searches from localStorage
      const stored = localStorage.getItem('recentLocationSearches');
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored).slice(0, 5));
        } catch (e) {
          console.error('Failed to parse recent searches:', e);
        }
      }
    } catch (err) {
      console.error('Failed to initialize Google Places:', err);
      // Requirement 11.1: Fall back to manual entry on initialization failure
      if (allowManualEntry) {
        setError('Failed to initialize location services. You can enter the address manually.');
        setIsManualMode(true);
      } else {
        setError('Failed to initialize location services');
      }
    }
  }, [allowManualEntry]);

  // Debounced autocomplete fetch
  const fetchSuggestions = useCallback((query: string) => {
    if (!autocompleteServiceRef.current || !sessionTokenRef.current) {
      return;
    }

    if (query.length < MIN_INPUT_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const request: google.maps.places.AutocompletionRequest = {
      input: query,
      componentRestrictions: { country: 'za' }, // South Africa restriction (requirement 2.1)
      sessionToken: sessionTokenRef.current,
    };

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (predictions, status) => {
        setIsLoading(false);

        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Limit to MAX_SUGGESTIONS (requirement 1.3)
          setSuggestions(predictions.slice(0, MAX_SUGGESTIONS));
          setIsOpen(true);
          setSelectedIndex(-1);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSuggestions([]);
          setIsOpen(false);
        } else {
          console.error('Autocomplete error:', status);
          
          // Requirement 11.1-11.3: Handle API errors with fallback to manual entry
          if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
            setError('API key invalid. Please enter location manually.');
          } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
            setError('Too many requests. Please enter location manually.');
          } else {
            setError('Failed to fetch suggestions. You can enter the address manually.');
          }
          
          setSuggestions([]);
          setIsOpen(false);
          
          // Enable manual mode if allowed
          if (allowManualEntry) {
            setIsManualMode(true);
          }
        }
      }
    );
  }, []);

  // Handle input change with debouncing (requirement 5.1)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for 300ms debounce
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, DEBOUNCE_DELAY);
  };

  // Handle keyboard navigation (requirement 13.1-13.5)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      // Show recent searches on focus if no suggestions
      if (e.key === 'ArrowDown' && recentSearches.length > 0 && !suggestions.length) {
        setIsOpen(true);
        setSelectedIndex(0);
        e.preventDefault();
      }
      return;
    }

    const items = suggestions.length > 0 ? suggestions : recentSearches;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          selectPrediction(items[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Select a prediction and fetch place details
  const selectPrediction = (prediction: PlacePrediction) => {
    if (!placesServiceRef.current) {
      return;
    }

    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: prediction.place_id,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'geometry',
        'address_components',
      ],
      sessionToken: sessionTokenRef.current!,
    };

    placesServiceRef.current.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        // Extract address components
        const addressComponents = extractAddressComponents(place.address_components || []);

        // Extract viewport bounds
        const viewport = place.geometry?.viewport
          ? {
              ne_lat: place.geometry.viewport.getNorthEast().lat(),
              ne_lng: place.geometry.viewport.getNorthEast().lng(),
              sw_lat: place.geometry.viewport.getSouthWest().lat(),
              sw_lng: place.geometry.viewport.getSouthWest().lng(),
            }
          : undefined;

        const locationData: LocationData = {
          place_id: place.place_id!,
          name: place.name || '',
          formatted_address: place.formatted_address || '',
          latitude: place.geometry!.location!.lat(),
          longitude: place.geometry!.location!.lng(),
          address_components: addressComponents,
          viewport,
        };

        // Update input value
        setInputValue(place.formatted_address || place.name || '');
        setIsOpen(false);
        setSuggestions([]);
        setSelectedIndex(-1);

        // Save to recent searches
        saveToRecentSearches(prediction);

        // Terminate session token (requirement 5.3)
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

        // Call onChange callback
        onChange(locationData);
      } else {
        setError('Failed to fetch place details');
      }
    });
  };

  // Extract address components from Google Places response
  const extractAddressComponents = (
    components: google.maps.GeocoderAddressComponent[]
  ) => {
    const result: {
      province?: string;
      city?: string;
      suburb?: string;
      street_address?: string;
    } = {};

    for (const component of components) {
      // Province (requirement 3.2)
      if (component.types.includes('administrative_area_level_1')) {
        result.province = component.long_name;
      }
      // City (requirement 3.3)
      else if (component.types.includes('locality')) {
        result.city = component.long_name;
      } else if (!result.city && component.types.includes('administrative_area_level_2')) {
        result.city = component.long_name;
      }
      // Suburb (requirement 3.4)
      else if (component.types.includes('sublocality_level_1')) {
        result.suburb = component.long_name;
      } else if (!result.suburb && component.types.includes('neighborhood')) {
        result.suburb = component.long_name;
      }
      // Street address (requirement 3.5)
      else if (component.types.includes('route')) {
        const streetNumber = components.find(c => c.types.includes('street_number'));
        result.street_address = streetNumber
          ? `${streetNumber.long_name} ${component.long_name}`
          : component.long_name;
      }
    }

    return result;
  };

  // Save to recent searches (requirement 14.1)
  const saveToRecentSearches = (prediction: PlacePrediction) => {
    const updated = [
      prediction,
      ...recentSearches.filter(s => s.place_id !== prediction.place_id),
    ].slice(0, 5);

    setRecentSearches(updated);
    localStorage.setItem('recentLocationSearches', JSON.stringify(updated));
  };

  // Clear recent searches (requirement 14.4)
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentLocationSearches');
    setIsOpen(false);
  };

  /**
   * Geocode manual address entry
   * Requirements 7.3, 7.4: Geocode manual entries and populate coordinates
   * Requirements 7.5: Mark GPS accuracy as "manual"
   */
  const geocodeManualEntry = async () => {
    if (!inputValue.trim()) {
      setError('Please enter an address');
      return;
    }

    setIsGeocoding(true);
    setError(null);

    try {
      // Call backend geocoding service using tRPC
      const response = await fetch('/api/trpc/location.geocodeAddress?input=' + encodeURIComponent(JSON.stringify({ address: inputValue })));
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      const result = data.result?.data;

      if (result?.success && result.result) {
        // Extract address components from geocoding result
        const addressComponents = extractAddressComponentsFromGeocode(result.result.addressComponents);

        const locationData: LocationData = {
          place_id: result.result.placeId,
          name: inputValue,
          formatted_address: result.result.formattedAddress,
          latitude: result.result.geometry.location.lat,
          longitude: result.result.geometry.location.lng,
          address_components: addressComponents,
          viewport: result.result.geometry.viewport ? {
            ne_lat: result.result.geometry.viewport.northeast.lat,
            ne_lng: result.result.geometry.viewport.northeast.lng,
            sw_lat: result.result.geometry.viewport.southwest.lat,
            sw_lng: result.result.geometry.viewport.southwest.lng,
          } : undefined,
          gps_accuracy: 'manual', // Requirement 7.5: Mark as manual entry
        };

        // Update input with formatted address
        setInputValue(result.result.formattedAddress);
        setIsManualMode(false);
        setIsOpen(false);

        // Call onChange callback
        onChange(locationData);
      } else {
        // Requirement 7.5: Allow user to proceed with manual entry even if geocoding fails
        setError('Could not find exact coordinates for this address. You can still proceed with manual entry.');
        
        // Create a basic location data object without coordinates
        const locationData: LocationData = {
          place_id: '', // No place ID for failed geocoding
          name: inputValue,
          formatted_address: inputValue,
          latitude: 0, // Default coordinates
          longitude: 0,
          address_components: {},
          gps_accuracy: 'manual',
        };

        // Still allow the user to proceed
        onChange(locationData);
        setIsManualMode(false);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      // Requirement 7.5: Handle geocoding failures gracefully
      setError('Unable to geocode address. You can still proceed with manual entry.');
      
      // Allow user to proceed even with geocoding failure
      const locationData: LocationData = {
        place_id: '',
        name: inputValue,
        formatted_address: inputValue,
        latitude: 0,
        longitude: 0,
        address_components: {},
        gps_accuracy: 'manual',
      };

      onChange(locationData);
      setIsManualMode(false);
    } finally {
      setIsGeocoding(false);
    }
  };

  /**
   * Extract address components from geocoding result
   */
  const extractAddressComponentsFromGeocode = (components: any[]) => {
    const result: {
      province?: string;
      city?: string;
      suburb?: string;
      street_address?: string;
    } = {};

    for (const component of components) {
      // Province
      if (component.types.includes('administrative_area_level_1')) {
        result.province = component.longName;
      }
      // City
      else if (component.types.includes('locality')) {
        result.city = component.longName;
      } else if (!result.city && component.types.includes('administrative_area_level_2')) {
        result.city = component.longName;
      }
      // Suburb
      else if (component.types.includes('sublocality_level_1')) {
        result.suburb = component.longName;
      } else if (!result.suburb && component.types.includes('neighborhood')) {
        result.suburb = component.longName;
      }
      // Street address
      else if (component.types.includes('route')) {
        const streetNumber = components.find(c => c.types.includes('street_number'));
        result.street_address = streetNumber
          ? `${streetNumber.longName} ${component.longName}`
          : component.longName;
      }
    }

    return result;
  };

  /**
   * Enable manual entry mode
   * Requirement 7.1: Allow manual text entry without forcing selection
   */
  const enableManualMode = () => {
    setIsManualMode(true);
    setIsOpen(false);
    setSuggestions([]);
    setError(null);
  };

  // Handle focus to show recent searches
  const handleFocus = () => {
    if (inputValue.length < MIN_INPUT_LENGTH && recentSearches.length > 0) {
      setIsOpen(true);
    } else if (inputValue.length >= MIN_INPUT_LENGTH && suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const displayItems = suggestions.length > 0 ? suggestions : (isOpen ? recentSearches : []);
  const showRecentLabel = suggestions.length === 0 && recentSearches.length > 0 && isOpen;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          required={required}
          className="pl-10 pr-10"
          aria-label="Location search"
          aria-autocomplete="list"
          aria-controls="location-suggestions"
          aria-expanded={isOpen}
          role="combobox"
          disabled={isGeocoding}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Manual Entry Confirmation Button - Requirement 7.2 */}
      {isManualMode && allowManualEntry && inputValue.trim() && !isGeocoding && (
        <div className="mt-2">
          <Button
            type="button"
            onClick={geocodeManualEntry}
            className="w-full"
            variant="default"
            disabled={isGeocoding}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Use this address
          </Button>
        </div>
      )}

      {/* Geocoding Loading State */}
      {isGeocoding && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          Geocoding address...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex items-center gap-2 z-50">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          {/* Show manual entry option when API fails - Requirement 11.1 */}
          {allowManualEntry && !isManualMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={enableManualMode}
              className="ml-auto text-xs hover:text-red-700"
            >
              Enter manually
            </Button>
          )}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && displayItems.length > 0 && (
        <Card
          id="location-suggestions"
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto"
          role="listbox"
        >
          <CardContent className="p-2">
            {showRecentLabel && (
              <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecentSearches();
                  }}
                  className="h-6 px-2 text-xs hover:text-destructive"
                  aria-label="Clear recent searches"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}
            {displayItems.map((item, index) => (
              <div
                key={item.place_id}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => selectPrediction(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
                style={{ minHeight: `${TOUCH_TARGET_HEIGHT}px` }} // Mobile touch target (requirement 8.1)
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {item.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.structured_formatting.secondary_text}
                    </div>
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
