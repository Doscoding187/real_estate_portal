import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { CITY_PROVINCE_MAP, PROVINCE_SLUGS } from '@/lib/locationUtils';
import { slugify } from '@/lib/urlUtils';

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
  onSelect?: (location: any) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  inputClassName?: string;
  showIcon?: boolean;
  clearOnSelect?: boolean;
}

export function LocationAutosuggest({ 
  onSelect, 
  placeholder = 'Search by city, suburb, or area...', 
  className = '',
  defaultValue = '',
  inputClassName = '',
  showIcon = true,
  clearOnSelect = false
}: LocationAutosuggestProps) {
  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);

  const { isLoaded } = useGoogleMaps();

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
    if (!query || query.length < 1 || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    const request = {
      input: query,
      componentRestrictions: { country: 'za' }, // Restrict to South Africa
      types: ['geocode'], // Use 'geocode' to get all geographic results (cities, suburbs, etc.) without businesses
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
    if (!clearOnSelect) {
        setQuery(mainText);
    } else {
        setQuery('');
    }
    setShowSuggestions(false);

    if (onSelect) {
      // Robust slug and type resolution
      const slug = slugify(mainText);
      let locationType = getLocationType(prediction.types);
      
      let provinceSlug: string | undefined = undefined;
      let citySlug: string | undefined = undefined;

      // 1. Check if the selection IS a known Province
      if (PROVINCE_SLUGS.includes(slug)) {
          locationType = 'province';
          provinceSlug = slug;
      }
      // 2. Check if the selection IS a known City (populates province automatically)
      else if (CITY_PROVINCE_MAP[slug]) {
          locationType = 'city';
          citySlug = slug;
          provinceSlug = CITY_PROVINCE_MAP[slug];
      }
      // 3. Fallback / Heuristics for Suburbs or minor places
      else {
          // Attempt to derive context from description (e.g., "Sandton, Johannesburg, Gauteng")
          const parts = prediction.description.split(',').map(s => slugify(s));
          
          // Check parts for known provinces
          const foundProvince = parts.find(p => PROVINCE_SLUGS.includes(p));
          if (foundProvince) provinceSlug = foundProvince;
          
          // Check parts for known cities (if not already the main slug)
          // We iterate parts to see if any is a known city
          if (!citySlug) {
              const foundCity = parts.find(p => CITY_PROVINCE_MAP[p]);
              if (foundCity) {
                  citySlug = foundCity;
                  // If we didn't find province yet, authoritative map wins
                  if (!provinceSlug) provinceSlug = CITY_PROVINCE_MAP[foundCity];
              }
          }
          
          // If we still don't have a province but have a 'city' type selection that wasn't in our map, 
          // we might just default to 'gauteng' or leave undefined (backend will handle or generic search)
          if (!provinceSlug) {
              // Heuristics for major hubs not in map or typo tolerance
              if (prediction.description.toLowerCase().includes('cape town')) provinceSlug = 'western-cape';
              else if (prediction.description.toLowerCase().includes('durban')) provinceSlug = 'kwazulu-natal';
              // else provinceSlug = 'gauteng'; // RISKY to default, better to be undefined and fall back to broad search
          }
      }

      onSelect({
        name: mainText,
        fullAddress: prediction.description,
        placeId: prediction.place_id,
        types: prediction.types,
        slug,
        type: locationType,
        provinceSlug,
        citySlug
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
    if (types.includes('administrative_area_level_1')) {
      return 'province';
    }
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
      <div className="relative h-full">
        {showIcon && <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />}
        <Input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => query.length >= 1 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className={`${showIcon ? 'pl-10' : 'pl-3'} ${inputClassName || 'bg-gray-100 border-0 rounded-lg h-11'}`}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && predictions.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
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
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">No locations found</p>
        </div>
      )}
    </div>
  );
}


