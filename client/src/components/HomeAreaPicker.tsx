import { useEffect, useId, useState } from 'react';
import { ArrowRight, Building2, Compass, MapPin, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { homeAreaFromDiscovery, isBroadHomeLocation } from '@/lib/homeAreaSelection';
import { buildLocationDiscoveryPath } from '@/lib/locationDiscovery';
import type { HomeAreaSelection } from '@/contexts/HomeSearchContext';
import type { LocationNode } from '@/types/location';
import type { SearchDiscoveryResult } from '@shared/searchDiscovery';

export function HomeAreaPicker({
  open,
  onOpenChange,
  initialSelection,
  cityHint = '',
  journey,
  category,
  onConfirm,
  onExplore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelection: HomeAreaSelection;
  cityHint?: string;
  journey: 'buy' | 'rent' | 'developments';
  category?: string;
  onConfirm: (selection: HomeAreaSelection) => void;
  onExplore: (href: string) => void;
}) {
  const inputId = useId();
  const [returnFocusTo] = useState(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const [query, setQuery] = useState('');
  const [broad, setBroad] = useState<LocationNode | null>(() =>
    initialSelection.locations.length === 1 && isBroadHomeLocation(initialSelection.locations[0])
      ? initialSelection.locations[0]
      : null,
  );
  const [active, setActive] = useState(-1);
  const lookupQuery = query.trim() || broad?.name || cityHint;
  const [debouncedQuery, setDebouncedQuery] = useState(lookupQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(lookupQuery), 180);
    return () => clearTimeout(timer);
  }, [lookupQuery]);
  const lookup = trpc.location.searchDiscoverySuggestions.useQuery(
    { query: debouncedQuery, limit: 8, journey },
    { enabled: open && debouncedQuery.length >= 2, retry: false },
  );
  const pending = lookup.isFetching || lookupQuery !== debouncedQuery;
  const results = (lookup.data || []) as SearchDiscoveryResult[];
  // Only an unambiguous, exact, server-resolved city may power a city-wide action.
  const exactCities = results.filter(
    result =>
      result.kind === 'canonical_location' &&
      result.factualLevel === 'city' &&
      result.label.toLocaleLowerCase() === cityHint.toLocaleLowerCase(),
  );
  const hinted =
    exactCities.length === 1 ? homeAreaFromDiscovery(exactCities[0], journey)?.locations[0] : null;
  const broadLocation = broad || (!query.trim() && !pending && !lookup.isError ? hinted : null);
  const contextName = broadLocation?.name || cityHint;
  const choices = results.flatMap(result => {
    const selection = homeAreaFromDiscovery(result, journey);
    return selection ? [{ result, selection }] : [];
  });
  const marketChoices = choices.filter(choice => choice.selection.searchArea);
  const localityChoices = choices.filter(
    choice => !choice.selection.searchArea && !isBroadHomeLocation(choice.selection.locations[0]),
  );
  const broadChoices = choices.filter(
    choice => !choice.selection.searchArea && isBroadHomeLocation(choice.selection.locations[0]),
  );
  // Market regions come from the governed service. Never fabricate clusters from city names.
  const browsingRegions = !query.trim() && Boolean(contextName) && marketChoices.length > 0;
  const ordered = browsingRegions
    ? marketChoices
    : [...marketChoices, ...localityChoices, ...broadChoices].filter(
        choice =>
          query.trim() || !broadLocation || choice.selection.locations[0]?.id !== broadLocation.id,
      );
  const choose = (index: number) => {
    const choice = ordered[index];
    if (!choice || pending || lookup.isError) return;
    if (choice.selection.searchArea || !isBroadHomeLocation(choice.selection.locations[0])) {
      onConfirm(choice.selection);
      return;
    }
    setBroad(choice.selection.locations[0]);
    setQuery('');
    setActive(-1);
  };
  const exploreHref = broadLocation ? buildLocationDiscoveryPath(broadLocation) : undefined;
  const emptyQuery = lookupQuery.length < 2;
  useEffect(() => {
    if (active >= 0 && !pending && !lookup.isError) {
      document.getElementById(`${inputId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [active, inputId, pending, lookup.isError]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={event => {
          if (returnFocusTo?.isConnected) {
            event.preventDefault();
            returnFocusTo.focus();
          }
        }}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-xl sm:p-6"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">
            {contextName ? `Which part of ${contextName}?` : 'Where would you like to look?'}
          </DialogTitle>
          <DialogDescription className="leading-6">
            {journey === 'rent' ? 'Rent' : journey === 'developments' ? 'New developments' : 'Buy'}
            {category ? ` · ${category}` : ''}. Choose a suburb or area to see properties where you
            want them.
          </DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor={inputId} className="mb-2 block text-sm font-semibold">
            Search a suburb, city or area
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id={inputId}
              value={query}
              autoComplete="off"
              maxLength={200}
              placeholder="Type an area you have in mind"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={!emptyQuery && ordered.length > 0 && !pending && !lookup.isError}
              aria-controls={`${inputId}-results`}
              aria-activedescendant={
                !pending && !lookup.isError && active >= 0 && active < ordered.length
                  ? `${inputId}-${active}`
                  : undefined
              }
              className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
              onChange={e => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive(previous =>
                    ordered.length
                      ? previous < 0
                        ? e.key === 'ArrowDown'
                          ? 0
                          : ordered.length - 1
                        : (previous + (e.key === 'ArrowDown' ? 1 : -1) + ordered.length) %
                          ordered.length
                      : -1,
                  );
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (active >= 0) choose(active);
                }
              }}
            />
          </div>
        </div>
        {browsingRegions && !pending && !lookup.isError && (
          <div>
            <p className="text-sm font-semibold">Start with a market area</p>
            <p className="mt-1 text-xs text-muted-foreground">Or search a specific suburb above.</p>
          </div>
        )}
        {lookup.isError ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
          >
            <p>We couldn’t load areas. Your search choices are still here.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void lookup.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : pending ? (
          <p role="status" className="py-4 text-sm text-muted-foreground">
            Finding areas…
          </p>
        ) : emptyQuery ? (
          <p className="rounded-lg bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
            Start with a city or an area you know. We’ll show its location context so you can choose
            the right place.
          </p>
        ) : ordered.length === 0 ? (
          <p role="status" className="py-3 text-sm leading-6 text-muted-foreground">
            {broadLocation && !query.trim()
              ? 'Search a suburb or more specific area above, or choose to browse the full selected area below.'
              : 'No selectable areas found. Try another name; your search hasn’t been expanded.'}
          </p>
        ) : (
          <div
            className="rounded-xl border border-border"
            id={`${inputId}-results`}
            role="listbox"
            aria-label="Areas to search"
          >
            {ordered.map(({ result, selection }, index) => (
              <button
                key={
                  result.kind === 'search_area' ? result.searchAreaId : result.canonicalLocationId
                }
                id={`${inputId}-${index}`}
                type="button"
                role="option"
                aria-selected={active === index}
                onClick={() => choose(index)}
                className={`flex w-full items-center gap-3 border-b border-border p-3 text-left text-sm last:border-b-0 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active === index ? 'bg-primary/5' : ''}`}
              >
                {selection.searchArea ? (
                  <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{result.label}</span>
                  <span className="block text-xs text-foreground/80">
                    {result.display.typeLabel}
                    {result.display.contextLabel ? ` · ${result.display.contextLabel}` : ''}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        {broadLocation && (
          <div className="space-y-3 border-t border-border pt-4">
            <Button
              variant="outline"
              className="min-h-11 h-auto w-full whitespace-normal py-2"
              onClick={() => onConfirm({ locations: [broadLocation], searchArea: null })}
            >
              Browse all {broadLocation.name}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              This includes the full selected{' '}
              {broadLocation.type === 'province'
                ? 'province'
                : broadLocation.factualType === 'town'
                  ? 'town'
                  : broadLocation.factualType === 'township'
                    ? 'township'
                    : 'city'}{' '}
              search area. Choose a more specific area above if you want a closer match.
            </p>
            {exploreHref && (
              <button
                type="button"
                onClick={() => onExplore(exploreHref)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-primary hover:underline"
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                Not sure? Explore {broadLocation.name}
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
