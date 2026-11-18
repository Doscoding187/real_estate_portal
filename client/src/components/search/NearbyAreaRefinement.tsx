import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { generateIntentUrl, type SearchIntent } from '@/lib/searchIntent';
import { addAreaToIntent, selectedPlaceIds } from '@/lib/searchAreaSelection';
import { MULTI_LOCATION_MAX } from '@shared/searchScope';

const MAX_VISIBLE_NEARBY_AREAS = 5;

/**
 * Nearby-area chooser for Buy/Rent results. Lists the searchable suburbs of the same city
 * nearest to the selected suburbs and adds the chosen one to the URL (repeated
 * canonicalPlaceId, up to MULTI_LOCATION_MAX), so a reload keeps the selection and filters.
 * It renders nothing when the server has no nearby suburbs for the selection.
 */
export function NearbyAreaRefinement({ intent }: { intent: SearchIntent }) {
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [areaQuery, setAreaQuery] = useState('');
  const selectedIds = useMemo(() => selectedPlaceIds(intent), [intent]);
  const isTransactional = intent.transactionType === 'for-sale' || intent.transactionType === 'to-rent';
  const nearbyQuery = trpc.placeAuthority.getNearbyPlaces.useQuery(
    { canonicalPlaceIds: selectedIds },
    {
      enabled: isTransactional && selectedIds.length > 0 && !intent.validation,
      retry: false,
      staleTime: 300_000,
    },
  );
  const areas = nearbyQuery.data ?? [];
  const atLimit = selectedIds.length >= MULTI_LOCATION_MAX;

  if (!areas.length) return null;

  const normalizedQuery = areaQuery.trim().toLocaleLowerCase();
  const visibleAreas = isExpanded
    ? areas
        .filter(area => area.name.toLocaleLowerCase().includes(normalizedQuery))
        .slice(0, MAX_VISIBLE_NEARBY_AREAS)
    : areas.slice(0, MAX_VISIBLE_NEARBY_AREAS);

  const addAreaToSearch = (placeId: string) => {
    const next = addAreaToIntent(intent, placeId);
    if (next === intent) return;
    setLocation(generateIntentUrl(next));
  };

  return (
    <section
      className="mb-5 rounded-xl border border-blue-100 bg-white px-4 py-4 shadow-sm sm:px-5 lg:mb-0 lg:px-4 lg:py-4"
      aria-labelledby="nearby-area-refinement-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="nearby-area-refinement-title" className="text-sm font-bold text-slate-900">
            Nearby areas
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Add a nearby suburb to include its listings in these results.
          </p>
        </div>
        {!atLimit ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg border-blue-200 px-4 font-semibold text-blue-700 hover:bg-blue-50"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(open => !open)}
          >
            {isExpanded ? 'Show nearby areas' : 'Explore other areas'}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <p className="text-xs font-medium text-slate-500">
            You’ve reached the {MULTI_LOCATION_MAX}-area limit.
          </p>
        )}
      </div>

      {isExpanded && !atLimit ? (
        <label className="relative mt-4 block max-w-lg">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            value={areaQuery}
            onChange={event => setAreaQuery(event.target.value)}
            placeholder="Search nearby suburbs"
            aria-label="Search nearby suburbs"
            className="h-11 rounded-lg pl-9"
          />
        </label>
      ) : null}

      {!atLimit ? (
        <div className="mt-3 flex flex-wrap gap-2 lg:flex-col" aria-label="Available nearby areas">
          {visibleAreas.map(area => (
            <button
              key={area.placeId}
              type="button"
              onClick={() => addAreaToSearch(area.placeId)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 lg:justify-start lg:rounded-lg"
              aria-label={`Add ${area.name} to this search, ${area.distanceKm.toFixed(1)} kilometres away`}
            >
              <MapPin className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              {area.name}
              <span className="font-normal text-slate-500">{area.distanceKm.toFixed(1)} km</span>
            </button>
          ))}
          {!visibleAreas.length ? (
            <p className="py-2 text-sm text-slate-500">No nearby suburbs match that search.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
