import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '../location/CanonicalPlaceSelector';
import { generateIntentUrl, type SearchIntent } from '@/lib/searchIntent';
import type { CanonicalPlaceSearchLabel } from '@shared/canonicalPlaceSearch';

export function CanonicalPlaceSearchBar({
  intent,
  context,
}: {
  intent: SearchIntent;
  context?: CanonicalPlaceSearchLabel;
}) {
  const [, navigate] = useLocation();
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
    <header className="border-b bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-start gap-4">
        <a href="/" className="pt-8 font-bold text-blue-800">
          Property Listify
        </a>
        <label className="text-sm font-medium">
          Journey
          <select
            aria-label="Search journey"
            value={transaction}
            className="mt-2 block h-10 rounded-md border px-3"
            onChange={event => setTransaction(event.target.value as typeof transaction)}
          >
            <option value="for-sale">Buy</option>
            <option value="to-rent">Rent</option>
          </select>
        </label>
        <div className="min-w-64 flex-1">
          <CanonicalPlaceSelector
            key={intent.geography.canonicalPlaceId ?? 'new-selection'}
            value={selection}
            onChange={setSelection}
            purpose="search"
            inputId="listing-navbar-location-input"
            label="City, town, suburb or locality"
          />
        </div>
        <button
          type="button"
          disabled={!selection}
          className="mt-7 rounded-md bg-blue-700 px-6 py-2 text-white disabled:opacity-50"
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
    </header>
  );
}
