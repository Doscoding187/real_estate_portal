import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight } from 'lucide-react';
import { SearchResults } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';

interface LocationRefinementProps {
  context?: SearchResults['locationContext'];
}

export function LocationRefinement({ context }: LocationRefinementProps) {
  const [_, setLocation] = useLocation();

  // If no context, or we are at country level, show nothing
  if (!context || !context.ids) return null;

  // 1. If we are in a Province -> Show Cities
  if (context.type === 'province') {
    return <RefineProvince context={context} />;
  }

  // 2. If we are in a City -> Show Popular Suburbs
  if (context.type === 'city') {
    return <RefineCity context={context} />;
  }

  // 3. If we are in a Suburb -> Show Sibling Suburbs
  if (context.type === 'suburb') {
    return <RefineSuburb context={context} />;
  }

  return null;
}

function RefineProvince({ context }: { context: NonNullable<SearchResults['locationContext']> }) {
  const { data: cities, isLoading } = trpc.location.getLocationHierarchy.useQuery({
    depth: 'city',
    provinceId: context.ids?.provinceId,
  });
  const [_, setLocation] = useLocation();

  // Sort by Metro status first, then name - MUST be before early returns!
  const sortedCities = useMemo(() => {
    if (!cities) return [];
    return [...cities]
      .sort((a, b) => {
        if (a.isMetro && !b.isMetro) return -1;
        if (!a.isMetro && b.isMetro) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10); // Show top 10
  }, [cities]);

  if (isLoading) return <RefinementSkeleton />;
  if (!cities || cities.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-blue-600" />
        Explore Cities in {context.name}
      </h3>
      <div className="flex flex-col gap-1">
        {sortedCities.map(city => (
          <Button
            key={city.id}
            variant="ghost"
            className="justify-between h-8 px-2 text-sm font-normal text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={() =>
              setLocation(
                `/property-for-sale?city=${city.slug || city.name.toLowerCase().replace(/ /g, '-')}`,
              )
            }
          >
            {city.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

function RefineCity({ context }: { context: NonNullable<SearchResults['locationContext']> }) {
  const { data: suburbs, isLoading } = trpc.location.getLocationHierarchy.useQuery({
    depth: 'suburb',
    cityId: context.ids?.cityId,
  });
  const [_, setLocation] = useLocation();

  if (isLoading) return <RefinementSkeleton />;
  if (!suburbs || suburbs.length === 0) return null;

  // Naive "Popular" sort: just alphabetical for now, or random?
  // Ideally backend gives us popularity. For now, alphabetical.
  const limitedSuburbs = suburbs.slice(0, 8);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-blue-600" />
        Popular Areas in {context.name}
      </h3>
      <div className="flex flex-col gap-1">
        {limitedSuburbs.map(suburb => (
          <Button
            key={suburb.id}
            variant="ghost"
            className="justify-between h-8 px-2 text-sm font-normal text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={() =>
              setLocation(
                `/property-for-sale?suburb=${suburb.slug || suburb.name.toLowerCase().replace(/ /g, '-')}`,
              )
            }
          >
            {suburb.name}
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        ))}
      </div>
    </div>
  );
}

function RefineSuburb({ context }: { context: NonNullable<SearchResults['locationContext']> }) {
  // Sibling suburbs = suburbs in the same city
  // We need the city ID. The context.ids.cityId should be populated.
  const { data: suburbs, isLoading } = trpc.location.getLocationHierarchy.useQuery({
    depth: 'suburb',
    cityId: context.ids?.cityId,
  });
  const [_, setLocation] = useLocation();

  if (isLoading) return <RefinementSkeleton />;
  if (!suburbs || suburbs.length === 0) return null;

  // Filter out current suburb
  const siblings = suburbs.filter(s => s.id !== context.ids?.suburbId).slice(0, 8);

  return (
    <div className="mb-6">
      <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
        <span className="text-xs text-blue-600 uppercase font-bold tracking-wider">
          Current Area
        </span>
        <div className="font-bold text-slate-900 text-lg leading-tight mt-1">{context.name}</div>
        <div className="text-xs text-slate-500 mt-1">in {context.hierarchy.city}</div>
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-3 ml-1">
        Verified Neighbouring Areas
      </h3>
      <div className="flex flex-col gap-1">
        {siblings.map(suburb => (
          <Button
            key={suburb.id}
            variant="ghost"
            className="justify-start h-8 px-2 text-sm font-normal text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={() =>
              setLocation(
                `/property-for-sale?suburb=${suburb.slug || suburb.name.toLowerCase().replace(/ /g, '-')}`,
              )
            }
          >
            {suburb.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

function RefinementSkeleton() {
  return (
    <div className="mb-6 space-y-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
