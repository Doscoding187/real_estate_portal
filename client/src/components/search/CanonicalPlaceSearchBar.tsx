import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '../location/CanonicalPlaceSelector';
import { generateIntentUrl, type SearchIntent } from '@/lib/searchIntent';
import type { CanonicalPlaceSearchLabel } from '@shared/canonicalPlaceSearch';
import { useAuth } from '@/_core/hooks/useAuth';

export function CanonicalPlaceSearchBar({
  intent,
  context,
}: {
  intent: SearchIntent;
  context?: CanonicalPlaceSearchLabel;
}) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selection, setSelection] = useState<CanonicalPlaceSelection | null>(null);
  const [transaction, setTransaction] = useState<'for-sale' | 'to-rent'>(
    intent.transactionType === 'to-rent' ? 'to-rent' : 'for-sale',
  );
  useEffect(() => {
    setSelection(
      context && context.canonicalPlaceId === intent.geography.canonicalPlaceId
        ? { ...context, administrativeContext: context.province }
        : null,
    );
  }, [
    intent.geography.canonicalPlaceId,
    context?.canonicalPlaceId,
    context?.label,
    context?.province,
  ]);
  useEffect(() => {
    setTransaction(intent.transactionType === 'to-rent' ? 'to-rent' : 'for-sale');
  }, [intent.transactionType]);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 md:min-h-[76px] md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-6 md:py-3 lg:px-8">
        <a href="/" className="text-lg font-bold tracking-tight text-blue-800 sm:text-xl">
          Property Listify
        </a>

        <div className="col-span-2 flex min-w-0 items-center gap-2 md:col-span-1">
          <label className="sr-only" htmlFor="canonical-search-journey">
            Journey
          </label>
          <select
            id="canonical-search-journey"
            aria-label="Search journey"
            value={transaction}
            className="h-11 w-[88px] shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-600/30"
            onChange={event => setTransaction(event.target.value as typeof transaction)}
          >
            <option value="for-sale">Buy</option>
            <option value="to-rent">Rent</option>
          </select>

          <div className="min-w-0 flex-1 [&>div]:space-y-0 [&>div>label]:sr-only [&>div>p[role=status]]:sr-only [&>div>input]:h-11 [&>div>input]:rounded-lg [&>div>input]:border-slate-200 [&>div>input]:bg-slate-50">
            <CanonicalPlaceSelector
              key={intent.geography.canonicalPlaceId ?? 'new-selection'}
              value={selection}
              onChange={setSelection}
              purpose="search"
              inputId="listing-navbar-location-input"
              label="City, town, suburb or locality"
              placeholder="City, town, suburb or locality"
            />
          </div>

          <button
            type="button"
            disabled={!selection}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
            onClick={() => {
              if (!selection) return;
              navigate(
                generateIntentUrl({
                  ...intent,
                  transactionType: transaction,
                  geography: {
                    level: 'canonical_place',
                    canonicalPlaceId: selection.canonicalPlaceId,
                  },
                  resultState: { ...intent.resultState, page: 0 },
                  validation: undefined,
                }),
              );
            }}
          >
            Search
          </button>
        </div>

        <nav
          aria-label="Account and advertising"
          className="col-start-2 row-start-1 flex items-center justify-end gap-3 md:col-start-3 md:row-start-1 md:gap-5"
        >
          <a
            href="/advertise"
            className="hidden whitespace-nowrap text-sm font-semibold text-slate-600 transition hover:text-blue-700 sm:inline-flex"
          >
            Advertise / List Property
          </a>
          <a
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
          >
            {isAuthenticated ? 'Account' : 'Sign In'}
          </a>
        </nav>
      </div>
    </header>
  );
}
