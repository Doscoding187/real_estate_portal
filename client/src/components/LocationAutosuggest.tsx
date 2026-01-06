import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { CITY_PROVINCE_MAP, PROVINCE_SLUGS, isProvinceSearch } from '@/lib/locationUtils';
import { slugify } from '@/lib/urlUtils';
import { LocationNode } from '@/types/location';

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
  selectedLocations?: LocationNode[];
  onSelect?: (location: LocationNode) => void;
  onRemove?: (index: number) => void;
  // Legacy props kept/adapted
  onChange?: (value: string) => void; 
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  maxLocations?: number;
}

export function LocationAutosuggest({ 
  selectedLocations = [],
  onSelect,
  onRemove,
  onChange,
  onSubmit,
  placeholder = 'Search by city, suburb, or area...', 
  className = '',
  inputClassName = '',
  showIcon = true,
  maxLocations = 5
}: LocationAutosuggestProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      types: ['geocode'],
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

  const handlePredictionSelect = (prediction: PlacePrediction) => {
    // Check max limit
    if (selectedLocations.length >= maxLocations) {
        // Optional: Trigger a toast or visual feedback here
        return;
    }

    const mainText = prediction.structured_formatting.main_text;
    
    // Clear query after selection
    setQuery('');
    if (onChange) onChange('');
    
    setShowSuggestions(false);
    // Keep focus on input for rapid multi-select
    inputRef.current?.focus();

    if (onSelect) {
      const slug = slugify(mainText);
      let locationType = getLocationType(prediction.types);
      
      let provinceSlug: string | undefined = undefined;
      let citySlug: string | undefined = undefined;

      // 1. Check if the selection IS a known Province (using fuzzy matching)
      const matchedProvince = isProvinceSearch(mainText);
      if (matchedProvince) {
          locationType = 'province';
          provinceSlug = matchedProvince;
      }
      // 2. Check if the selection IS a known City (populates province automatically)
      else if (CITY_PROVINCE_MAP[slug]) {
          locationType = 'city';
          citySlug = slug;
          provinceSlug = CITY_PROVINCE_MAP[slug];
      }
      // 3. Fallback / Heuristics for Suburbs or minor places
      else {
          const parts = prediction.description.split(',').map(s => slugify(s));
          const foundProvince = parts.find(p => PROVINCE_SLUGS.includes(p));
          if (foundProvince) provinceSlug = foundProvince;
          
          if (!citySlug) {
              const foundCity = parts.find(p => CITY_PROVINCE_MAP[p]);
              if (foundCity) {
                  citySlug = foundCity;
                  if (!provinceSlug) provinceSlug = CITY_PROVINCE_MAP[foundCity];
              }
          }
          
          if (!provinceSlug) {
              if (prediction.description.toLowerCase().includes('cape town')) provinceSlug = 'western-cape';
              else if (prediction.description.toLowerCase().includes('durban')) provinceSlug = 'kwazulu-natal';
          }
      }

      onSelect({
        id: prediction.place_id,
        name: mainText,
        slug,
        type: locationType as any,
        provinceSlug,
        citySlug
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle specific keys
    if (e.key === 'Backspace' && query === '' && selectedLocations.length > 0 && onRemove) {
        // Remove last tag on empty backspace
        onRemove(selectedLocations.length - 1);
        return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && predictions.length > 0 && selectedIndex >= 0) {
        handlePredictionSelect(predictions[selectedIndex]);
      } else {
        setShowSuggestions(false);
        if (onSubmit) onSubmit();
      }
      return;
    }
    
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }
    
    if (!showSuggestions || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    }
  };

  const getLocationType = (types: string[]) => {
    if (types.includes('administrative_area_level_1')) return 'province';
    if (types.includes('locality') || types.includes('administrative_area_level_2')) return 'city';
    if (types.includes('sublocality') || types.includes('neighborhood')) return 'suburb';
    return 'city'; // default fallback type
  };

  // Wrapper click focuses input
  const handleWrapperClick = () => {
      inputRef.current?.focus();
  };

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <Input type="text" placeholder="Loading maps..." disabled className="bg-gray-50" />
      </div>
    );
  }

  const isLimitReached = selectedLocations.length >= maxLocations;
  const showPlaceholder = selectedLocations.length === 0;

  return (
    <div ref={wrapperRef} className={`relative group cursor-text ${className}`}>
      {/* Container simulating Input look and feel */}
      <div 
        onClick={handleWrapperClick}
        className={`flex flex-wrap items-center gap-2 min-h-[44px] w-full rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-1 ${inputClassName}`}
      >
        {/* Render Pills */}
        {selectedLocations.map((loc, index) => (
            <div 
                key={`${loc.id}-${index}`}
                className="flex items-center gap-1.5 bg-blue-500 text-white text-sm px-3 py-1.5 rounded-md whitespace-nowrap shadow-sm animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()} 
            >
                <span className="font-medium truncate max-w-[150px]">{loc.name}</span>
                <button
                    type="button"
                    onClick={() => onRemove?.(index)}
                    className="hover:bg-blue-600 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-300"
                    aria-label={`Remove ${loc.name}`}
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        ))}

        {/* The actual Input - borderless */}
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          // Disable input if limit reached (optional, P24 behavior allows typing but no selecting? Let's keep typing allowed for UX)
          // readOnly={isLimitReached} 
          placeholder={showPlaceholder ? placeholder : (isLimitReached ? 'Limit reached' : '...add more')}
          value={query}
          onChange={(e) => {
            const newValue = e.target.value;
            setQuery(newValue);
            setShowSuggestions(true);
            setSelectedIndex(-1);
            if (onChange) onChange(newValue);
          }}
          onFocus={() => query.length >= 1 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-0 outline-none placeholder:text-muted-foreground min-w-[120px] h-8 text-sm"
        />
        
        {/* Right Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
             {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : 
              showIcon ? <MapPin className="h-4 w-4 text-muted-foreground" /> : null}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && predictions.length > 0 && !isLimitReached && (
        <div className="absolute z-[9999] top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
          {predictions.map((prediction, index) => {
            const locationType = getLocationType(prediction.types);
            return (
              <div
                key={prediction.place_id}
                onClick={() => handlePredictionSelect(prediction)}
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

      {/* No results or limit message */}
      {(showSuggestions && !isLoading) && (
          (predictions.length === 0 && query.length >= 2) ? (
            <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
               <p className="text-sm text-gray-500 text-center">No locations found</p>
            </div>
          ) : null
      )}
    </div>
  );
}



