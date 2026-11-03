import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { PlaceSearchScope } from '@shared/placeAuthority';
import { isCanonicalPlaceId } from '@shared/placeAuthority';

export interface CanonicalPlaceOption {
  canonicalPlaceId: string;
  name: string;
  scope: PlaceSearchScope;
  placeType: string;
  administrativeContext?: string | null;
  canonicalPath?: string;
}

interface LocationAutocompleteProps {
  value?: string;
  onValueChange: (value: string) => void;
  onLocationSelect?: (location: CanonicalPlaceOption) => void;
  placeholder?: string;
  type?: PlaceSearchScope | 'all';
  className?: string;
}

export function LocationAutocomplete({
  value = '',
  onValueChange,
  onLocationSelect,
  placeholder = 'Enter location...',
  type = 'all',
  className,
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search locations
  const { data: discovery, isLoading } = trpc.placeAuthority.discover.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length > 2,
    },
  );
  const locations = (discovery?.results || []).flatMap((candidate): CanonicalPlaceOption[] => {
    const scope = candidate.searchScope;
    if (
      !candidate.searchEligible ||
      !isCanonicalPlaceId(candidate.placeId) ||
      !scope ||
      (type !== 'all' && type !== scope)
    )
      return [];
    return [
      {
        canonicalPlaceId: candidate.placeId,
        name: candidate.preferredPublicLabel || candidate.matchedName,
        scope,
        placeType: candidate.placeType,
        administrativeContext: candidate.context.administrativeContext,
        ...(candidate.canonicalPath ? { canonicalPath: candidate.canonicalPath } : {}),
      },
    ];
  });

  const handleSelect = (location: CanonicalPlaceOption) => {
    setSearchQuery(location.name);
    onValueChange(location.name);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue);
    onValueChange(newValue);
    setOpen(newValue.trim().length > 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={`relative ${className}`}>
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
            onFocus={() => {
              if (searchQuery.length > 2) {
                setOpen(true);
              }
            }}
          />
          {(isLoading || debouncedQuery !== searchQuery) && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search locations..."
            value={searchQuery}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>
              {searchQuery.length < 3
                ? 'Type at least 3 characters to search'
                : 'No locations found'}
            </CommandEmpty>
            {locations && locations.length > 0 && (
              <CommandGroup heading="Locations">
                {locations.map(location => (
                  <CommandItem
                    key={location.canonicalPlaceId}
                    value={`${location.name}-${location.scope}`}
                    onSelect={() => handleSelect(location)}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{location.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="capitalize">
                          {location.scope === 'metro_city'
                            ? 'City'
                            : location.scope === 'locality'
                              ? 'Locality'
                              : 'Province'}
                        </span>
                        {location.administrativeContext && (
                          <>
                            <span>•</span>
                            <span>{location.administrativeContext}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
