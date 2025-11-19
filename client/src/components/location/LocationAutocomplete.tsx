import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface LocationOption {
  id: number;
  name: string;
  type: 'province' | 'city' | 'suburb';
  latitude?: string;
  longitude?: string;
  provinceName?: string;
  cityName?: string;
  postalCode?: string;
  isMetro?: number;
}

interface LocationAutocompleteProps {
  value?: string;
  onValueChange: (value: string) => void;
  onLocationSelect?: (location: LocationOption) => void;
  placeholder?: string;
  type?: 'province' | 'city' | 'suburb' | 'address' | 'all';
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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search locations
  const { data: locations, isLoading } = trpc.location.searchLocations.useQuery(
    {
      query: debouncedQuery,
      type,
      limit: 10,
    },
    {
      enabled: debouncedQuery.length > 2,
    },
  );

  const handleSelect = (location: LocationOption) => {
    console.log('Location selected:', location);
    setSearchQuery(location.name);
    onValueChange(location.name);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    console.log('LocationAutocomplete input changed:', newValue);
    setSearchQuery(newValue);
    onValueChange(newValue);
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
            onValueChange={setSearchQuery}
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
                    key={`${location.type}-${location.id}`}
                    value={`${location.name}-${location.type}`}
                    onSelect={() => handleSelect(location)}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{location.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="capitalize">{location.type}</span>
                        {location.provinceName && (
                          <>
                            <span>•</span>
                            <span>{location.provinceName}</span>
                          </>
                        )}
                        {location.cityName && location.type !== 'city' && (
                          <>
                            <span>•</span>
                            <span>{location.cityName}</span>
                          </>
                        )}
                        {location.postalCode && (
                          <>
                            <span>•</span>
                            <span>{location.postalCode}</span>
                          </>
                        )}
                        {location.isMetro === 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Metro
                          </span>
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
