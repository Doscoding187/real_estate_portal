import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLoadScript } from '@react-google-maps/api';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface LocationAutosuggestProps {
  onSelect?: (location: { name: string; fullAddress: string; placeId: string; types: string[] }) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
}

const libraries: ('places')[] = ['places'];

export function LocationAutosuggest({ 
  onSelect, 
  placeholder = 'Search city or suburb...', 
  className = '',
  defaultValue = ''
}: LocationAutosuggestProps) {
  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Initialize autocomplete service
  useEffect(() => {
    if (isLoaded && window.google) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch predictions from Google Places API
  useEffect(() => {
    if (!query || query.length < 2 || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    const request = {
      input: query,
      componentRestrictions: { country: 'za' }, // Restrict to South Africa
      types: ['(cities)', 'sublocality', 'neighborhood'], // Cities and suburbs
    };

    autocompleteService.current.getPlacePredictions(request, (results, status) => {
      setIsLoading(false);
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
      } else {
        setPredictions([]);
      }
    });
  }, [query]);

  const handleSelect = (prediction: PlacePrediction) => {
    const mainText = prediction.structured_formatting.main_text;
    setQuery(mainText);
    setShowSuggestions(false);

    if (onSelect) {
      onSelect({
        name: mainText,
        fullAddress: prediction.description,
        placeId: prediction.place_id,
        types: prediction.types,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelect(predictions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getLocationType = (types: string[]) => {
    if (types.includes('locality') || types.includes('administrative_area_level_2')) {
      return 'city';
    }
    if (types.includes('sublocality') || types.includes('neighborhood')) {
      return 'suburb';
    }
    return 'location';
  };

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <Input
          type="text"
          placeholder="Loading maps..."
          disabled
          className="bg-gray-50"
        />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 bg-gray-100 border-0 rounded-lg h-11"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {predictions.map((prediction, index) => {
            const locationType = getLocationType(prediction.types);
            return (
              <div
                key={prediction.place_id}
                onClick={() => handleSelect(prediction)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  locationType === 'city' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <MapPin className={`h-4 w-4 ${
                    locationType === 'city' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
                <div className="text-xs text-gray-400 capitalize">{locationType}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* No results */}
      {showSuggestions && query.length >= 2 && !isLoading && predictions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">No locations found</p>
        </div>
      )}
    </div>
  );
}


