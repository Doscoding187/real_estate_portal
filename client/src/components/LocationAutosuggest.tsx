import { useState, useEffect, useRef, useId, type RefObject } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { LocationNode } from '@/types/location';
import { isCanonicalPlaceId } from '../../../shared/placeAuthority';

interface CanonicalPlaceSuggestion {
  name: string;
  type: 'province' | 'city' | 'suburb';
  slug: string;
  provinceName?: string;
  cityName?: string;
  provinceSlug: string;
  citySlug?: string;
  canonicalPlaceId: string;
  parentCanonicalPlaceId?: string;
  canonicalPath?: string;
  selectionTypeLabel?: string;
  selectionContextLabel?: string;
}

interface LocationAutosuggestProps {
  selectedLocations?: LocationNode[];
  onSelect?: (location: LocationNode) => void;
  onRemove?: (index: number) => void;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  inputId?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  maxLocations?: number;
  renderSelectedLocations?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputAriaDescribedBy?: string;
}

export function LocationAutosuggest({
  selectedLocations = [],
  onSelect,
  onRemove,
  onChange,
  onSubmit,
  placeholder = 'Search a city, town, suburb, or locality',
  inputId,
  className = '',
  inputClassName = '',
  showIcon = true,
  maxLocations = 5,
  renderSelectedLocations = true,
  inputRef,
  inputAriaDescribedBy,
}: LocationAutosuggestProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef ?? localInputRef;
  const listboxId = useId();

  const {
    data: placeDiscovery,
    isLoading: isPlaceDiscoveryLoading,
    error: placeDiscoveryError,
  } = trpc.placeAuthority.discover.useQuery(
    { query: debouncedQuery },
    {
      // Canonical Place discovery is the only source of selectable geography.
      enabled: debouncedQuery.length >= 2,
    },
  );
  const placeSuggestions: CanonicalPlaceSuggestion[] = (placeDiscovery?.results || [])
    .filter(candidate => candidate.searchEligible && isCanonicalPlaceId(candidate.placeId))
    .flatMap(candidate => {
      const path = candidate.canonicalPath || undefined;
      const segments = path?.split('/').filter(Boolean) || [];
      const type =
        candidate.searchScope === 'province'
          ? 'province'
          : candidate.searchScope === 'metro_city'
            ? 'city'
            : candidate.searchScope === 'locality'
              ? 'suburb'
              : null;
      if (!type) return [];
      return [
        {
          name: candidate.preferredPublicLabel || candidate.matchedName,
          type,
          slug: segments[segments.length - 1] || candidate.placeId,
          provinceSlug: segments[0] || '',
          citySlug: segments.length > 2 ? segments[1] : undefined,
          canonicalPlaceId: candidate.placeId,
          parentCanonicalPlaceId:
            candidate.context.cityPlaceId || candidate.context.provincePlaceId || undefined,
          ...(path ? { canonicalPath: path } : {}),
          selectionTypeLabel: candidate.placeType.replace(/_/g, ' '),
          selectionContextLabel: candidate.context.administrativeContext || undefined,
        },
      ];
    });
  const suggestionCount = placeSuggestions.length;

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setDebouncedQuery('');
      return;
    }

    const timeout = window.setTimeout(() => setDebouncedQuery(trimmedQuery), 180);
    return () => window.clearTimeout(timeout);
  }, [query]);

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

  const handlePlaceSelect = (location: CanonicalPlaceSuggestion) => {
    if (selectedLocations.length >= maxLocations) return;
    if (!onSelect || !isCanonicalPlaceId(location.canonicalPlaceId)) return;
    if (
      location.canonicalPath &&
      (!location.canonicalPath.startsWith('/') ||
        location.canonicalPath.includes('?') ||
        location.canonicalPath.includes('#'))
    )
      return;

    setQuery('');
    setSelectedIndex(-1);
    if (onChange) onChange('');
    setShowSuggestions(false);
    activeInputRef.current?.focus();

    onSelect({
      canonicalPlaceId: location.canonicalPlaceId,
      name: location.name,
      slug: location.slug,
      type: location.type,
      provinceSlug: location.provinceSlug,
      ...(location.citySlug ? { citySlug: location.citySlug } : {}),
      ...(location.parentCanonicalPlaceId
        ? { parentCanonicalPlaceId: location.parentCanonicalPlaceId }
        : {}),
      ...(location.canonicalPath ? { canonicalPath: location.canonicalPath } : {}),
      ...(location.selectionTypeLabel ? { selectionTypeLabel: location.selectionTypeLabel } : {}),
      ...(location.selectionContextLabel
        ? { selectionContextLabel: location.selectionContextLabel }
        : {}),
    });
  };

  const handleSuggestionSelect = (index: number) => {
    const suggestion = placeSuggestions[index];
    if (suggestion) {
      handlePlaceSelect(suggestion);
      return;
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
              key={`${loc.canonicalPlaceId}-${index}`}
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
          aria-label="Search admitted places"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions}
          aria-activedescendant={
            selectedIndex >= 0 ? `${listboxId}-option-${selectedIndex}` : undefined
          }
          aria-describedby={inputAriaDescribedBy}
          aria-busy={isPlaceDiscoveryLoading}
          placeholder={
            showPlaceholder
              ? placeholder
              : isLimitReached
                ? 'Place limit reached'
                : 'Search another place'
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
          {isPlaceDiscoveryLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : showIcon ? (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          ) : null}
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {isPlaceDiscoveryLoading
          ? 'Loading Place suggestions'
          : placeDiscoveryError
            ? 'Canonical Place suggestions are unavailable.'
          : suggestionCount > 0
              ? `${suggestionCount} Place suggestions available`
              : debouncedQuery.length >= 2
                ? 'No locations found'
                : ''}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && !isLimitReached && placeSuggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Location suggestions"
          className="absolute z-[9999] top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {/* Canonical Place results from the admitted Place Authority. */}
          {placeSuggestions.map((location, index) => {
            const suggestionIndex = index;
            const context = location.selectionContextLabel ||
              [location.cityName, location.provinceName].filter(Boolean).join(', ');
            return (
              <div
                key={`place-${location.canonicalPlaceId}`}
                id={`${listboxId}-option-${suggestionIndex}`}
                role="option"
                aria-selected={suggestionIndex === selectedIndex}
                tabIndex={-1}
                onClick={() => handlePlaceSelect(location)}
                onMouseEnter={() => setSelectedIndex(suggestionIndex)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  suggestionIndex === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100">
                  <MapPin className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{location.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {[location.type, context].filter(Boolean).join(' - ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No results or limit message */}
      {showSuggestions &&
        !isPlaceDiscoveryLoading &&
        (placeSuggestions.length === 0 && debouncedQuery.length >= 2 ? (
          <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-500 text-center">
              {placeDiscoveryError
                ? 'Canonical Place suggestions are unavailable.'
                : 'No locations found'}
            </p>
          </div>
        ) : null)}
    </div>
  );
}
