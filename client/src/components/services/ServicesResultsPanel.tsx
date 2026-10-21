import { useEffect, useState } from 'react';
import { BadgeCheck, Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { servicesUi } from '@/features/services/design';
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/features/services/catalog';
import { ProviderShowcaseRow } from './ProviderShowcaseCard';
import type { ProviderDirectoryItem } from './ProviderCard';

export type ServicesResultFilters = {
  category: ServiceCategory;
  location: string;
};

type ServicesResultsPanelProps = {
  filters: ServicesResultFilters;
  onApply: (filters: ServicesResultFilters) => void;
  onReset: () => void;
  providers: ProviderDirectoryItem[];
  isLoading: boolean;
  error: boolean;
  emptyMessage: string;
  /** Builds the profile path for a provider, carrying the journey context. */
  profileHref: (provider: ProviderDirectoryItem) => string;
  /** Starts a request with a provider. */
  onContact: (providerId: number) => void;
  /** The result count line shown under the heading. */
  summary: string;
  /** The deterministic ordering note. */
  orderingNote?: string;
};

/**
 * The Services discovery surface: a refine rail beside the provider results.
 *
 * Every control here maps to a filter the directory actually supports —
 * service category, listed area, and free text. The approved visual blueprint
 * also shows price range and availability filters. The platform has no
 * availability field and no server-side price filter, so presenting those
 * controls would be a control that silently does nothing. They are recorded
 * as proposed capability in the Services V2 contract instead.
 *
 * Results are ordered by provider name. The Services contract forbids
 * relevance ranking, so the surface states the ordering rather than offering a
 * "most relevant" control that the backend cannot honour.
 */
export function ServicesResultsPanel({
  filters,
  onApply,
  onReset,
  providers,
  isLoading,
  error,
  emptyMessage,
  profileHref,
  onContact,
  summary,
  orderingNote = 'Ordered by provider name',
}: ServicesResultsPanelProps) {
  const [draft, setDraft] = useState<ServicesResultFilters>(filters);
  const [isRailOpen, setIsRailOpen] = useState(false);

  // The URL is the single source of truth for the active filters, so the rail
  // re-syncs whenever the route or query string changes.
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  function apply(event: React.FormEvent) {
    event.preventDefault();
    onApply(draft);
    setIsRailOpen(false);
  }

  const rail = (
    <form onSubmit={apply} className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-[#0B1B2A]">Refine your search</h2>
        <button
          type="button"
          onClick={() => {
            const cleared = { category: filters.category, location: '' };
            setDraft(cleared);
            onReset();
          }}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#168363]"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Clear all
        </button>
      </div>

      <label className="block">
        <span className="block text-[12px] font-semibold text-[#4B5C6B]">Service category</span>
        <select
          aria-label="Service category"
          value={draft.category}
          onChange={event =>
            setDraft(current => ({ ...current, category: event.target.value as ServiceCategory }))
          }
          className="mt-2 h-11 w-full rounded-xl border border-[#E3EBF0] bg-white px-3 text-sm text-[#0B1B2A] outline-none transition focus:border-[#168363]"
        >
          {SERVICE_CATEGORIES.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-[12px] font-semibold text-[#4B5C6B]">Location</span>
        <div className="mt-2 flex h-11 items-center rounded-xl border border-[#E3EBF0] px-3 transition focus-within:border-[#168363]">
          <Search className="mr-2 h-4 w-4 shrink-0 text-[#A8B4BF]" aria-hidden="true" />
          <input
            aria-label="Location"
            value={draft.location}
            onChange={event => setDraft(current => ({ ...current, location: event.target.value }))}
            placeholder="Suburb, city or province"
            className="w-full bg-transparent text-sm text-[#0B1B2A] outline-none placeholder:text-[#A8B4BF]"
          />
        </div>
      </label>

      <div>
        <span className="block text-[12px] font-semibold text-[#4B5C6B]">Verification</span>
        <label className="mt-2 flex items-start gap-2.5 rounded-xl border border-[#E3EBF0] bg-[#F7FAFB] p-3">
          <input
            type="checkbox"
            checked
            readOnly
            disabled
            aria-label="Platform verified only"
            className="mt-0.5 h-4 w-4 rounded border-[#CBD8E0] text-[#168363]"
          />
          <span>
            <span className="block text-[13px] font-semibold text-[#0B1B2A]">
              Platform verified only
            </span>
            <span className="mt-0.5 block text-[11px] leading-5 text-[#6B7C8A]">
              Every provider in this directory is platform verified. This filter cannot be turned
              off.
            </span>
          </span>
        </label>
      </div>

      <button type="submit" className={`${servicesUi.action} w-full`}>
        <Filter className="h-4 w-4" aria-hidden="true" />
        Apply filters
      </button>
    </form>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      {/* Rail: always visible on desktop, collapsible on mobile. */}
      <aside className="lg:sticky lg:top-24">
        <button
          type="button"
          onClick={() => setIsRailOpen(open => !open)}
          aria-expanded={isRailOpen}
          className={`${servicesUi.actionNeutral} w-full justify-between lg:hidden`}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </span>
          {isRailOpen ? <span className="text-[#168363]">Hide</span> : null}
        </button>
        <div
          className={`${servicesUi.surface} mt-3 p-5 ${isRailOpen ? 'block' : 'hidden'} lg:mt-0 lg:block`}
        >
          {rail}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <p className="text-sm text-[#4B5C6B]">{summary}</p>
          <p className="inline-flex items-center gap-1.5 text-[12px] text-[#8A99A6]">
            <BadgeCheck className="h-3.5 w-3.5 text-[#168363]" aria-hidden="true" />
            {orderingNote}
          </p>
        </div>

        <div className="space-y-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`services-result-skeleton-${index}`}
                className="h-36 animate-pulse rounded-2xl bg-[#E9F0F4]"
              />
            ))}

          {!isLoading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              We could not load the provider directory. Please try again.
            </div>
          )}

          {!isLoading && !error && providers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#CBD8E0] bg-white p-8 text-sm leading-6 text-[#4B5C6B]">
              {emptyMessage}
            </div>
          )}

          {!isLoading &&
            !error &&
            providers.map(provider => (
              <ProviderShowcaseRow
                key={provider.providerId}
                provider={provider}
                profileHref={profileHref(provider)}
                onContact={onContact}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
