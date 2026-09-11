import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Check, Search, UserRound, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { OwnerOption } from './types';

interface OwnerPickerProps {
  value: number | null;
  onChange: (ownerId: number | null) => void;
  disabled?: boolean;
}

export function OwnerPicker({ value, onChange, disabled = false }: OwnerPickerProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryInput = useMemo(() => {
    const ownerSearch = debouncedSearch.length >= 2 ? debouncedSearch : undefined;
    const ownerIds = value ? [value] : undefined;
    return ownerSearch || ownerIds ? { ownerSearch, ownerIds } : undefined;
  }, [debouncedSearch, value]);

  const ownerQuery = trpc.strategicPlanning.getAuthoringReferenceData.useQuery(queryInput, {
    enabled: Boolean(queryInput),
    staleTime: 30_000,
    retry: false,
  });
  const owners = ownerQuery.data?.owners ?? [];
  const selectedOwner = owners.find(owner => owner.id === value) ?? null;

  const chooseOwner = (owner: OwnerOption) => {
    onChange(owner.id);
    setSearch('');
    setFocused(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocused(true);
      setActiveIndex(index => Math.min(index + 1, owners.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0 && owners[activeIndex]) {
      event.preventDefault();
      chooseOwner(owners[activeIndex]);
    } else if (event.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative"
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
      >
        {selectedOwner ? (
          <div className="flex min-h-9 items-center gap-2 rounded-md border border-input bg-white px-3 py-1.5 text-sm">
            <UserRound className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-slate-800">
              {selectedOwner.displayName}
            </span>
            {selectedOwner.email ? (
              <span className="hidden max-w-[42%] truncate text-xs text-slate-400 sm:inline">
                {selectedOwner.email}
              </span>
            ) : null}
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => onChange(null)}
              disabled={disabled}
              aria-label="Clear accountable owner"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              onFocus={() => setFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or email"
              className="pl-9"
              disabled={disabled}
              aria-label="Search accountable owner"
              aria-autocomplete="list"
              role="combobox"
              aria-expanded={focused}
              aria-haspopup="listbox"
              aria-controls="strategic-owner-options"
            />
          </div>
        )}
        {focused && !disabled ? (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
            {debouncedSearch.length < 2 ? (
              <p className="px-3 py-2 text-xs text-slate-500">
                Type at least 2 characters to search.
              </p>
            ) : ownerQuery.isLoading ? (
              <p className="px-3 py-2 text-xs text-slate-500">Searching owners…</p>
            ) : ownerQuery.error ? (
              <p role="alert" className="px-3 py-2 text-xs text-red-600">
                Owner search is unavailable.
              </p>
            ) : owners.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500">No matching users found.</p>
            ) : (
              <ul id="strategic-owner-options" role="listbox" className="max-h-52 overflow-y-auto p-1">
                {owners.map((owner, index) => (
                  <li key={owner.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={owner.id === value}
                      className={cn(
                        'flex w-full items-start gap-2 rounded px-2 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none',
                        owner.id === value && 'bg-blue-50',
                        index === activeIndex && 'bg-slate-100',
                      )}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => chooseOwner(owner)}
                    >
                      <UserRound
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">
                          {owner.displayName}
                        </span>
                        {owner.email ? (
                          <span className="block truncate text-xs text-slate-500">
                            {owner.email}
                          </span>
                        ) : null}
                      </span>
                      {owner.id === value ? (
                        <Check className="mt-0.5 h-4 w-4 text-blue-600" aria-hidden="true" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      <p className="text-xs text-slate-400">Optional while drafting; required before activation.</p>
    </div>
  );
}
