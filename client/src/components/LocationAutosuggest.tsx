import { useState, useEffect, useRef, useId, type Ref, type RefObject } from 'react';
import { MapPin, Loader2, X, Compass } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { PROVINCE_SLUGS, isProvinceSearch } from '@/lib/locationUtils';
import { slugify } from '@/lib/urlUtils';
import { trpc } from '@/lib/trpc';
import { LocationNode } from '@/types/location';
import { encodeCanonicalLocationId } from '../../../shared/locationAuthority';
import type { SearchDiscoveryResult } from '../../../shared/searchDiscovery';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

interface DatabaseLocationSuggestion {
  id: number;
  name: string;
  type: 'province' | 'city' | 'suburb';
  provinceId?: number;
  cityId?: number;
  provinceName?: string;
  cityName?: string;
}

function getCanonicalBuyLocationPath(location: {
  type: 'province' | 'city' | 'suburb' | 'area';
  slug: string;
  provinceSlug?: string;
  citySlug?: string;
  canonicalLocationId?: string;
}) {
  const params = new URLSearchParams();
  if (location.canonicalLocationId) params.set('locationId', location.canonicalLocationId);
  if (location.type === 'province') {
    params.set('province', location.slug);
  } else if (location.type === 'suburb' || location.type === 'area') {
    params.set('suburb', location.slug);
    if (location.citySlug) params.set('city', location.citySlug);
    if (location.provinceSlug) params.set('province', location.provinceSlug);
  } else {
    params.set('city', location.slug);
    if (location.provinceSlug) params.set('province', location.provinceSlug);
  }
  return `/property-for-sale?${params.toString()}`;
}

interface LocationAutosuggestProps {
  selectedLocations?: LocationNode[];
  onSelect?: (location: LocationNode) => void;
  onRemove?: (index: number) => void;
  // Legacy props kept/adapted
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  inputId?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  maxLocations?: number;
  renderSelectedLocations?: boolean;
  inputRef?: Ref | null;
  inputAriaDescribedBy?: string;
  // Search Discovery Engine — foundation for future smart suggestions
  discoverySuggestions?: SearchDiscoveryResult[];
  onDiscoverySelect?: (suggestion: SearchDiscoveryResult) => void;
  onDiscoveryNavigate?: (canonicalPath: string) => void;
}

export function LocationAutosuggest({
  selectedLocations = [],
  onSelect,
  onRemove,
  onChange,
  onSubmit,
  placeholder = 'Search by city, suburb, or area...',
  inputId,
  className = '',
  inputClassName = '',
  showIcon = true,
  maxLocations = 5,
  renderSelectedLocations = true,
  inputRef,
  inputAriaDescribedBy,
  discoverySuggestions,
  onDiscoverySelect,
  onDiscoveryNavigate,
}: LocationAutosuggestProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef ?? localInputRef;
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const predictionRequestSequence = useRef(0);
  const listboxId = useId();

  const { isLoaded, isLoading: isGoogleMapsLoading } = useGoogleMaps();
  const {
    data: databaseLocations,
    isLoading: isDatabaseSearchLoading,
    error: databaseSearchError,
  } = trpc.location.searchLocations.useQuery(
    {
      query: debouncedQuery,
      type: 'all',
      limit: 10,
    },
    {
      // The canonical database catalog remains searchable even when Places is
      // configured. It is the only source that can provide an authoritative
      // typed location ID for the public search contract.
      enabled: debouncedQuery.length >= 2,
    },
  );
  const databaseSuggestions: DatabaseLocationSuggestion[] =
    (databaseLocations as DatabaseLocationSuggestion[] | undefined) || [];
  const discoverySuggestionCount = discoverySuggestions?.length ?? 0;
  const databaseSuggestionOffset = discoverySuggestionCount;
  const predictionSuggestionOffset = databaseSuggestionOffset + databaseSuggestions.length;
  const suggestionCount = predictionSuggestionOffset + predictions.length;

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setDebouncedQuery('');
      return;
    }

    const timeout = window.setTimeout(() => setDebouncedQuery(trimmedQuery), 180);
    return () => window.clearTimeout(timeout);
  }, [query]);

  // Initialize autocomplete service
  useEffect(() => {
    if (isLoaded && window.google && window.google.maps && window.google.maps.places) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
    } else if (isLoaded && window.google && (!window.google.maps || !window.google.maps.places)) {
      console.warn('Google Maps Places library is missing. Autocomplete will be disabled.');
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
    const requestSequence = ++predictionRequestSequence.current;
    if (!debouncedQuery || debouncedQuery.length < 1 || !autocompleteService.current) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const request = {
      input: debouncedQuery,
      componentRestrictions: { country: 'za' }, // Restrict to South Africa
      types: ['geocode'],
    };

    autocompleteService.current.getPlacePredictions(request, (results, status) => {
      if (requestSequence !== predictionRequestSequence.current) return;
      setIsLoading(false);
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
      } else {
        setPredictions([]);
      }
    });
  }, [debouncedQuery]);

  const handlePredictionSelect = (prediction: PlacePrediction) => {
    // Check max limit
    if (selectedLocations.length >= maxLocations) {
      // Optional: Trigger a toast or visual feedback here
      return;
    }

    const mainText = prediction.structured_formatting.main_text;

    // Clear query after selection
    setQuery('');
    setSelectedIndex(-1);
    if (onChange) onChange('');

    setShowSuggestions(false);
    // Keep focus on input for rapid multi-select
    activeInputRef.current?.focus();

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
      // 2. Read only explicit hierarchy components from the Places result.
      // A static city-to-province map would silently assign inventory to the
      // wrong province when the name is duplicated or the catalog changes.
      else {
        const parts = prediction.description.split(',').map(s => slugify(s));
        const foundProvince = parts.find(p => PROVINCE_SLUGS.includes(p));
        if (foundProvince) provinceSlug = foundProvince;

        if (locationType === 'suburb' && parts.length > 1) {
          const possibleCity = parts[1];
          if (possibleCity && !PROVINCE_SLUGS.includes(possibleCity)) citySlug = possibleCity;
        } else if (locationType === 'city') {
          citySlug = slug;
        }
      }

      onSelect({
        id: prediction.place_id,
        name: mainText,
        slug,
        type: locationType as LocationNode['type'],
        provinceSlug,
        citySlug,
        canonicalPath: getCanonicalBuyLocationPath({
          type: locationType as LocationNode['type'],
          slug,
          provinceSlug,
          citySlug,
        }),
      });
    }
  };

  const handleDatabaseLocationSelect = (location: DatabaseLocationSuggestion) => {
    if (selectedLocations.length >= maxLocations) return;

    setQuery('');
    setSelectedIndex(-1);
    if (onChange) onChange('');
    setShowSuggestions(false);
    activeInputRef.current?.focus();

    if (!onSelect) return;

    const slug = slugify(location.name);
    const provinceSlug =
      location.type === 'province'
        ? slug
        : location.provinceName
          ? slugify(location.provinceName)
          : undefined;
    const citySlug =
      location.type === 'city' ? slug : location.cityName ? slugify(location.cityName) : undefined;
    const parentCanonicalLocationId =
      location.type === 'city' && Number.isInteger(location.provinceId)
        ? encodeCanonicalLocationId('province', Number(location.provinceId))
        : location.type === 'suburb' && Number.isInteger(location.cityId)
          ? encodeCanonicalLocationId('city', Number(location.cityId))
          : undefined;

    onSelect({
      id: encodeCanonicalLocationId(location.type, Number(location.id)),
      name: location.name,
      slug,
      type: location.type,
      provinceSlug,
      citySlug,
      ...(parentCanonicalLocationId ? { parentCanonicalLocationId } : {}),
      canonicalPath: getCanonicalBuyLocationPath({
        type: location.type,
        slug,
        provinceSlug,
        citySlug,
        canonicalLocationId: encodeCanonicalLocationId(location.type, Number(location.id)),
      }),
    });
  };

  const handleSuggestionSelect = (index: number) => {
    if (index < discoverySuggestionCount) {
      const suggestion = discoverySuggestions?.[index];
      if (!suggestion) return;
      if (onDiscoverySelect) {
        setQuery('');
        setSelectedIndex(-1);
        if (onChange) onChange('');
        setShowSuggestions(false);
        activeInputRef.current?.focus();
        onDiscoverySelect(suggestion);
        return;
      }
      if (suggestion.kind === 'canonical_location') {
        onDiscoveryNavigate?.(suggestion.canonicalPath);
      }
      return;
    }

    const databaseIndex = index - databaseSuggestionOffset;
    const suggestion = databaseSuggestions[databaseIndex];
    if (suggestion) {
      handleDatabaseLocationSelect(suggestion);
      return;
    }

    const predictionIndex = index - predictionSuggestionOffset;
    if (predictionIndex >= 0) handlePredictionSelect(predictions[predictionIndex]);
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
      if (showSuggestions && suggestionCount > 0 && selectedIndex >= 0) {
        handleSuggestionSelect(selectedIndex);
      } else {
        setShowSuggestions(false);
        if (onSubmit) onSubmit();
      }
      return;
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    if (!showSuggestions || suggestionCount === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestionCount - 1 ? prev + 1 : prev));
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
    activeInputRef.current?.focus();
  };

  const isLimitReached = selectedLocations.length >= maxLocations;
  const showPlaceholder = selectedLocations.length === 0;

  return (
    <div ref={wrapperRef} className={`relative z-30 group cursor-text ${className}`}>
      {/* Container simulating Input look and feel */}
      <div
        onClick={handleWrapperClick}
        className={`flex flex-wrap items-center gap-2 min-h-[44px] w-full rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-1 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 focus-within:ring-offset-0 ${inputClassName}`}
      >
        {/* Render Pills */}
        {renderSelectedLocations &&
          selectedLocations.map((loc, index) => (
            <div
              key={`${loc.id}-${index}`}
              className="flex items-center gap-1.5 bg-blue-700 text-white text-sm px-3 py-1.5 rounded-md whitespace-nowrap shadow-sm animate-in fade-in zoom-in duration-200"
              onClick={e => e.stopPropagation()}
            >
              <span className="flex min-w-0 flex-col text-left">
                <span className="font-medium truncate max-w-[150px]">{loc.name}</span>
                {loc.selectionTypeLabel ? (
                  <span className="max-w-[150px] truncate text-[10px] text-blue-100">
                    {[loc.selectionTypeLabel, loc.selectionContextLabel]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onRemove?.(index)}
                className="hover:bg-blue-800 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-300"
                aria-label={`Remove ${loc.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

        {/* The actual Input - borderless */}
        <input
          ref={activeInputRef}
          id={inputId || `${listboxId}-input`}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-label="Search by city, suburb, or area"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions}
          aria-activedescendant={
            selectedIndex >= 0 ? `${listboxId}-option-${selectedIndex}` : undefined
          }
          aria-describedby={inputAriaDescribedBy}
          aria-busy={isLoading || isDatabaseSearchLoading}
          // Disable input if limit reached (optional, P24 behavior allows typing but no selecting? Let's keep typing allowed for UX)
          // readOnly={isLimitReached}
          placeholder={
            showPlaceholder ? placeholder : isLimitReached ? 'Limit reached' : '...add more'
          }
          value={query}
          onChange={e => {
            const newValue = e.target.value;
            setQuery(newValue);
            setShowSuggestions(true);
            setSelectedIndex(-1);
            if (onChange) onChange(newValue);
          }}
          onFocus={() => query.trim().length >= 1 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[120px] h-8 !border-0 !bg-transparent text-sm !outline-none !shadow-none placeholder:text-muted-foreground focus:!border-0 focus:!outline-none focus:ring-0 focus:!shadow-none focus-visible:!border-0 focus-visible:!outline-none focus-visible:ring-0 focus-visible:!shadow-none"
        />

        {/* Right Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading || isDatabaseSearchLoading || isGoogleMapsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : showIcon ? (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          ) : null}
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {isLoading || isDatabaseSearchLoading
          ? 'Loading location suggestions'
          : databaseSearchError
            ? 'Location suggestions are unavailable. You can continue with free text.'
            : suggestionCount > 0
              ? `${suggestionCount} location suggestions available`
              : debouncedQuery.length >= 2
                ? 'No locations found'
                : ''}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions &&
        !isLimitReached &&
        (predictions.length > 0 ||
          databaseSuggestions.length > 0 ||
          (discoverySuggestions?.length ?? 0) > 0) && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Location suggestions"
            className="absolute z-[9999] top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200"
          >
            {/* Search Discovery Engine — static/fallback suggestions */}
            {discoverySuggestions && discoverySuggestions.length > 0 && (
              <>
                <div className="px-4 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Discover
                </div>
                {discoverySuggestions.map((s, index) => (
                  <div
                    key={`disc-${s.kind}-${s.kind === 'search_area' ? s.searchAreaId : s.canonicalLocationId}`}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    tabIndex={-1}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      if (onDiscoverySelect) {
                        setQuery('');
                        setSelectedIndex(-1);
                        if (onChange) onChange('');
                        setShowSuggestions(false);
                        activeInputRef.current?.focus();
                        onDiscoverySelect(s);
                        return;
                      }
                      if (s.kind === 'canonical_location') onDiscoveryNavigate?.(s.canonicalPath);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-blue-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Compass className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{s.label}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {[s.display.typeLabel, s.display.contextLabel].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                      {s.kind === 'search_area' ? 'Search Area' : 'Location'}
                    </div>
                  </div>
                ))}
                {(predictions.length > 0 || databaseSuggestions.length > 0) && (
                  <div className="mx-3 my-1 border-t border-slate-100" />
                )}
              </>
            )}

            {/* Database-backed catalog fallback when Google Places is unavailable. */}
            {databaseSuggestions.map((location, index) => {
              const suggestionIndex = databaseSuggestionOffset + index;
              const context = [location.cityName, location.provinceName].filter(Boolean).join(', ');
              return (
                <div
                  key={`database-${location.type}-${location.id}`}
                  id={`${listboxId}-option-${suggestionIndex}`}
                  role="option"
                  aria-selected={suggestionIndex === selectedIndex}
                  tabIndex={-1}
                  onClick={() => handleDatabaseLocationSelect(location)}
                  onMouseEnter={() => setSelectedIndex(suggestionIndex)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    suggestionIndex === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100">
                    <MapPin className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {location.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {[location.type, context].filter(Boolean).join(' - ')}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Google Places predictions */}
            {predictions.map((prediction, index) => {
              const locationType = getLocationType(prediction.types);
              const suggestionIndex = predictionSuggestionOffset + index;
              return (
                <div
                  key={prediction.place_id}
                  id={`${listboxId}-option-${suggestionIndex}`}
                  role="option"
                  aria-selected={suggestionIndex === selectedIndex}
                  tabIndex={-1}
                  onClick={() => handlePredictionSelect(prediction)}
                  onMouseEnter={() => setSelectedIndex(suggestionIndex)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    suggestionIndex === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      locationType === 'city' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    <MapPin
                      className={`h-4 w-4 ${
                        locationType === 'city' ? 'text-blue-600' : 'text-gray-600'
                      }`}
                    />
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
      {showSuggestions &&
        !isLoading &&
        !isDatabaseSearchLoading &&
        (predictions.length === 0 &&
        databaseSuggestions.length === 0 &&
        discoverySuggestionCount === 0 &&
        debouncedQuery.length >= 2 ? (
          <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-500 text-center">
              {databaseSearchError
                ? 'Location suggestions are unavailable. You can continue with free text.'
                : 'No locations found'}
            </p>
          </div>
        ) : null)}
    </div>
  );
}
