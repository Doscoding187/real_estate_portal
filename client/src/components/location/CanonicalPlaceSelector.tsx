import { useEffect, useId, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  isCanonicalPlaceId,
  normalizePlaceQuery,
  type PlaceSearchScope,
} from '@shared/placeAuthority';

export interface CanonicalPlaceSelection {
  canonicalPlaceId: string;
  label: string;
  placeType: string;
  scope: PlaceSearchScope;
  administrativeContext: string | null;
}

export interface CanonicalPlaceOption {
  placeId: string;
  preferredPublicLabel: string | null;
  placeType: string;
  searchEligible: boolean;
  searchScope: PlaceSearchScope | null;
  context: { administrativeContext: string | null };
  matchedName: string;
  isAliasMatch: boolean;
}

export interface CanonicalPlaceDiscovery {
  query: string;
  outcome: 'resolved' | 'ambiguous' | 'no_result';
  results: CanonicalPlaceOption[];
}

const factualTypeLabel = (type: string) => type.replace(/_/g, ' ');

/**
 * Display and explicit selection only. A name match never assigns identity.
 * Editing the selected text clears identity immediately, before any request.
 * Responses for an earlier query cannot provide selectable options.
 */
export function CanonicalPlaceSelectorView({
  value,
  onChange,
  query,
  onQueryChange,
  discovery,
  pending,
  error,
  label = 'Location',
  purpose = 'authoring',
  inputId: suppliedInputId,
}: {
  value: CanonicalPlaceSelection | null;
  onChange: (value: CanonicalPlaceSelection | null) => void;
  query: string;
  onQueryChange: (query: string) => void;
  discovery: CanonicalPlaceDiscovery | undefined;
  pending: boolean;
  error: boolean;
  label?: string;
  purpose?: 'authoring' | 'search';
  inputId?: string;
}) {
  const generatedId = useId();
  const inputId = suppliedInputId ?? generatedId;
  const resultsId = useId();
  const statusId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const normalized = normalizePlaceQuery(query);
  const current = Boolean(normalized && discovery?.query === normalized && !pending && !error);
  const options = current
    ? discovery!.results.filter(
        candidate =>
          candidate.searchEligible &&
          isCanonicalPlaceId(candidate.placeId) &&
          Boolean(candidate.preferredPublicLabel?.trim()) &&
          candidate.searchScope !== null,
      )
    : [];
  const choose = (index: number) => {
    const option = options[index];
    if (!option || !current) return;
    const selection = {
      canonicalPlaceId: option.placeId,
      label: option.preferredPublicLabel!,
      placeType: option.placeType,
      scope: option.searchScope!,
      administrativeContext: option.context.administrativeContext,
    };
    onChange(selection);
    onQueryChange(selection.label);
    setOpen(false);
    setActive(-1);
  };
  const status = value
    ? `${value.label} selected.`
    : error
      ? purpose === 'search'
        ? 'Location search is unavailable. Try again.'
        : 'Location search is unavailable. Try again; your address details are preserved.'
      : pending && normalized
        ? 'Searching locations…'
        : current && !options.length
          ? purpose === 'search'
            ? 'No approved location found. Try another name.'
            : 'No approved location found. Try another name. You can save an unfinished draft.'
          : current && discovery?.outcome === 'ambiguous'
            ? 'Several locations match. Select the one you mean.'
            : options.length
              ? 'Select a location from the results.'
              : 'Type a city, town, suburb or locality.';

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && options.length > 0}
        aria-controls={resultsId}
        aria-describedby={statusId}
        aria-activedescendant={
          open && active >= 0 && active < options.length ? `${resultsId}-${active}` : undefined
        }
        value={query}
        maxLength={200}
        autoComplete="off"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        onChange={event => {
          onChange(null);
          onQueryChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            setOpen(false);
            setActive(-1);
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            setActive(previous =>
              options.length
                ? previous < 0
                  ? direction === 1
                    ? 0
                    : options.length - 1
                  : (previous + direction + options.length) % options.length
                : -1,
            );
          } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            if (active >= 0) choose(active);
          }
        }}
      />
      <p id={statusId} role="status" className="text-sm text-muted-foreground">
        {status}
      </p>
      {value && (
        <p className="text-sm">
          {factualTypeLabel(value.placeType)}
          {value.administrativeContext ? ` · ${value.administrativeContext}` : ''}
        </p>
      )}
      {open && options.length > 0 && (
        <ul
          id={resultsId}
          role="listbox"
          aria-label="Matching locations"
          className="rounded-md border bg-background"
        >
          {options.map((option, index) => (
            <li key={option.placeId} role="presentation">
              <button
                type="button"
                role="option"
                aria-label={`${option.preferredPublicLabel} ${factualTypeLabel(option.placeType)}${option.context.administrativeContext ? ` · ${option.context.administrativeContext}` : ''}${option.isAliasMatch ? ` · Also known as ${option.matchedName}` : ''}`}
                id={`${resultsId}-${index}`}
                tabIndex={-1}
                aria-selected={active === index}
                onClick={() => choose(index)}
                onMouseDown={event => event.preventDefault()}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${active === index ? 'bg-accent' : ''}`}
              >
                <span className="block font-medium">{option.preferredPublicLabel}</span>
                <span className="block text-muted-foreground">
                  {factualTypeLabel(option.placeType)}
                  {option.context.administrativeContext
                    ? ` · ${option.context.administrativeContext}`
                    : ''}
                </span>
                {option.isAliasMatch && (
                  <span className="block text-muted-foreground">
                    Also known as {option.matchedName}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Approved Place selection for authoring; provider results cannot select identity. */
export function CanonicalPlaceSelector({
  value,
  onChange,
  label,
  purpose,
  inputId,
}: {
  value: CanonicalPlaceSelection | null;
  onChange: (value: CanonicalPlaceSelection | null) => void;
  label?: string;
  purpose?: 'authoring' | 'search';
  inputId?: string;
}) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (value) setQuery(value.label);
  }, [value]);
  const lookup = trpc.placeAuthority.discover.useQuery(
    { query: debounced.trim() },
    {
      enabled: Boolean(debounced.trim()) && !value,
      retry: false,
    },
  );
  return (
    <CanonicalPlaceSelectorView
      value={value}
      onChange={onChange}
      label={label}
      purpose={purpose}
      inputId={inputId}
      query={query}
      onQueryChange={setQuery}
      discovery={lookup.data}
      pending={normalizePlaceQuery(query) !== normalizePlaceQuery(debounced) || lookup.isFetching}
      error={lookup.isError && normalizePlaceQuery(query) === normalizePlaceQuery(debounced)}
    />
  );
}
