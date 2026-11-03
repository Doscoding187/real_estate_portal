import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Building2, MapPin, Search, ArrowRight } from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  CanonicalPlaceSelector,
  type CanonicalPlaceSelection,
} from '@/components/location/CanonicalPlaceSelector';
import { trpc } from '@/lib/trpc';
import { developerDiscoveryHref, readDeveloperPlace } from '@shared/developerDiscovery';

const PAGE_SIZE = 24;
export default function DeveloperDirectoryPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const scope = readDeveloperPlace(search);
  const [placeSelection, setPlaceSelection] = useState<CanonicalPlaceSelection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'national' | 'regional' | 'boutique'>('all');
  const [page, setPage] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 200);
    return () => clearTimeout(timeout);
  }, [searchQuery]);
  useEffect(() => setPage(0), [debouncedSearch, tierFilter, scope.canonicalPlaceId, scope.invalid]);
  const query = trpc.cataloguePublisher.listPublishers.useQuery(
    {
      search: debouncedSearch || undefined,
      brandTier: tierFilter === 'all' ? undefined : tierFilter,
      canonicalPlaceId: scope.canonicalPlaceId,
      limit: PAGE_SIZE + 1,
      offset: page * PAGE_SIZE,
    },
    { enabled: !scope.invalid, retry: false },
  );
  const pending = query.isLoading || query.isFetching || searchQuery.trim() !== debouncedSearch;
  const profiles = query.data?.slice(0, PAGE_SIZE) ?? [];
  const hasMore = (query.data?.length ?? 0) > PAGE_SIZE;
  const clearFilters = () => {
    setSearchQuery('');
    setTierFilter('all');
    setPage(0);
  };
  const changePlace = (selection: CanonicalPlaceSelection | null) => {
    setPlaceSelection(selection);
    setPage(0);
    setLocation(developerDiscoveryHref('/developers', selection?.canonicalPlaceId));
  };
  const clearPlace = () => {
    setPlaceSelection(null);
    setLocation('/developers');
  };
  const retry = () => void query.refetch();
  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <div className="bg-gradient-to-b from-indigo-900 to-indigo-800 pb-8 pt-24 text-white">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-3 text-3xl font-bold md:text-4xl">Developer directory</h1>
            <p className="mb-6 text-base leading-relaxed text-indigo-100">
              {scope.canonicalPlaceId
                ? 'Discover developers with published projects assigned to this canonical Place.'
                : 'Explore developer profiles and their published projects across South Africa.'}
            </p>
            <div className="grid gap-3 text-left sm:grid-cols-[minmax(0,1fr)_12rem_9rem]">
              <div>
                <label
                  htmlFor="developer-name-search"
                  className="mb-1.5 block text-xs font-semibold"
                >
                  Developer name
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500"
                    aria-hidden="true"
                  />
                  <Input
                    id="developer-name-search"
                    placeholder="Search developers"
                    maxLength={200}
                    value={searchQuery}
                    onChange={event => {
                      setSearchQuery(event.target.value);
                      setPage(0);
                    }}
                    className="min-h-[44px] border-slate-300 bg-white pl-9 text-slate-900 placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div>
                <CanonicalPlaceSelector
                  value={placeSelection}
                  onChange={changePlace}
                  purpose="search"
                  label="Project Place"
                  placeholder="Search approved Places"
                  hint="Only projects with this exact reviewed Place assignment match."
                />
                {scope.canonicalPlaceId && !placeSelection && !scope.invalid ? (
                  <Button type="button" variant="ghost" size="sm" onClick={clearPlace}>
                    Clear selected Place
                  </Button>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor="developer-brand-tier"
                  className="mb-1.5 block text-xs font-semibold"
                >
                  Developer reach
                </label>
                <select
                  id="developer-brand-tier"
                  value={tierFilter}
                  onChange={event => {
                    setTierFilter(event.target.value as typeof tierFilter);
                    setPage(0);
                  }}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                >
                  <option value="all">All developers</option>
                  <option value="national">National</option>
                  <option value="regional">Regional</option>
                  <option value="boutique">Boutique</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container py-8">
        {scope.invalid ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"
          >
            <h2 className="font-semibold text-slate-900">Choose a canonical Place</h2>
            <p className="mt-2 text-sm text-slate-600">
              This location link is invalid or uses the retired province filter. Select an approved
              Place above to continue.
            </p>
          </div>
        ) : query.isError ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"
          >
            <h2 className="font-semibold text-slate-900">
              Developer directory could not be loaded
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your filters are still here. Please try again.
            </p>
            <Button
              variant="outline"
              disabled={query.isFetching}
              onClick={retry}
              className="mt-4 min-h-[44px] bg-white"
            >
              {query.isFetching ? 'Trying again…' : 'Try again'}
            </Button>
          </div>
        ) : pending ? (
          <div role="status" aria-label="Loading developer profiles">
            <p className="mb-4 text-sm text-slate-600">Finding developers…</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map(index => (
                <Skeleton key={index} className="h-64 rounded-xl" />
              ))}
            </div>
          </div>
        ) : profiles.length ? (
          <>
            <p className="mb-4 text-sm text-slate-600" aria-live="polite">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + profiles.length} developers
              {scope.canonicalPlaceId ? ' with projects at the selected Place' : ''}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {profiles.map(profile => {
                const href = developerDiscoveryHref(
                  `/developer/${profile.slug}`,
                  scope.canonicalPlaceId,
                );
                return (
                  <Card
                    key={profile.id}
                    className="h-full rounded-xl border-slate-200 bg-white transition-colors hover:border-indigo-300 hover:shadow-md"
                  >
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {profile.logoUrl ? (
                            <img
                              src={profile.logoUrl}
                              alt={`${profile.brandName} logo`}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold leading-snug text-slate-900">
                            <Link href={href} className="hover:text-indigo-700 hover:underline">
                              {profile.brandName}
                            </Link>
                          </h2>
                          {profile.brandTier && (
                            <Badge className="mt-2 border-0 bg-indigo-50 text-xs capitalize text-indigo-700">
                              {profile.brandTier}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {profile.headOfficeLocation && (
                        <p className="mb-3 flex items-start gap-1.5 text-sm text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Head office: {profile.headOfficeLocation}</span>
                        </p>
                      )}
                      {profile.about && (
                        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
                          {profile.about}
                        </p>
                      )}
                      {Array.isArray(profile.propertyFocus) && profile.propertyFocus.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {profile.propertyFocus
                            .filter((focus: unknown): focus is string => typeof focus === 'string')
                            .slice(0, 3)
                            .map((focus: string) => (
                              <Badge
                                key={focus}
                                variant="secondary"
                                className="border-0 bg-slate-100 text-xs capitalize text-slate-600"
                              >
                                {focus.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                        </div>
                      )}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <Link
                          href={developerDiscoveryHref(
                            `/developer/${profile.slug}`,
                            scope.canonicalPlaceId,
                            true,
                          )}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-md text-sm font-semibold text-[#2774AE] hover:underline"
                        >
                          View projects
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Link
                          href={href}
                          className="inline-flex min-h-[44px] items-center rounded-md text-sm text-slate-600 hover:underline"
                        >
                          Developer profile
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              {page ? 'No more developer profiles' : 'No matching developers found'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              {scope.canonicalPlaceId
                ? 'There are no matching developer profiles with projects assigned to this canonical Place. You can choose another Place or clear the name and reach filters.'
                : 'Try another developer name or clear the filters.'}
            </p>
            <Button variant="outline" onClick={clearFilters} className="mt-4 min-h-[44px]">
              Clear name and reach filters
            </Button>
          </div>
        )}
        {!scope.invalid && !query.isError && !pending && (page > 0 || hasMore) && (
          <nav
            aria-label="Developer directory pages"
            className="mt-6 flex flex-wrap items-center justify-between gap-3"
          >
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(value => Math.max(0, value - 1))}
              className="min-h-[44px]"
            >
              Previous developers
            </Button>
            <span className="text-sm text-slate-600">Page {page + 1}</span>
            <Button
              variant="outline"
              disabled={!hasMore}
              onClick={() => setPage(value => value + 1)}
              className="min-h-[44px]"
            >
              Next developers
            </Button>
          </nav>
        )}
      </div>
      <div className="bg-slate-100 py-6">
        <p className="container text-center text-xs leading-relaxed text-slate-600">
          Developer names and logos identify the publisher. Individual verification information is
          shown on the developer profile.
        </p>
      </div>
    </div>
  );
}
