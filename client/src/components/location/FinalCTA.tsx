import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  buildTransactionalGeographyHref,
  type GeographySearchContext,
} from '@/lib/geographySearchHandoff';
import type { SearchScope } from '@shared/searchScope';

interface FinalCTAProps {
  locationName: string;
  scope: SearchScope;
  context?: GeographySearchContext;
}

export function FinalCTA({ locationName, scope, context }: FinalCTAProps) {
  const searchHandoff = (journey: 'buy' | 'rent', propertyType?: string) =>
    buildTransactionalGeographyHref({
      journey,
      scope,
      context,
      filters: propertyType ? { propertyType } : undefined,
    });

  const houseHref = searchHandoff('buy', 'house');
  const apartmentHref = searchHandoff('buy', 'apartment');
  const rentHref = searchHandoff('rent');

  return (
    <div className="py-20 bg-primary-900 text-white text-center">
      <div className="container max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Find Your Dream Home in {locationName}
        </h2>
        <p className="text-xl text-primary-100 mb-10">
          Browse thousands of properties, from modern apartments to luxury villas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {houseHref && (
            <Link href={houseHref}>
              <Button
                size="lg"
                className="bg-white text-primary-900 hover:bg-slate-100 text-lg px-8 h-14"
              >
                Search Houses
              </Button>
            </Link>
          )}
          {apartmentHref && (
            <Link href={apartmentHref}>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 text-lg px-8 h-14 bg-transparent"
              >
                Search Apartments
              </Button>
            </Link>
          )}
          {rentHref && (
            <Link href={rentHref}>
              <Button
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10 text-lg h-14"
              >
                Browse Rentals
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
