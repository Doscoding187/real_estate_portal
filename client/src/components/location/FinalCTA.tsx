import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface FinalCTAProps {
  locationName: string;
  provinceSlug: string;
  citySlug?: string;
  suburbSlug?: string;
}

export function FinalCTA({ locationName, provinceSlug, citySlug, suburbSlug }: FinalCTAProps) {
  // Construct links
  const baseSearchUrl = `/properties/sale`; // Default search logic
  // TODO: Add refined query params later if needed

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
          <Link
            href={`/properties/sale?property_type=house&location=${suburbSlug || citySlug || provinceSlug}`}
          >
            <Button
              size="lg"
              className="bg-white text-primary-900 hover:bg-slate-100 text-lg px-8 h-14"
            >
              Search Houses
            </Button>
          </Link>
          <Link
            href={`/properties/sale?property_type=apartment&location=${suburbSlug || citySlug || provinceSlug}`}
          >
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 text-lg px-8 h-14 bg-transparent"
            >
              Search Apartments
            </Button>
          </Link>
          <Link href={`/properties/rent?location=${suburbSlug || citySlug || provinceSlug}`}>
            <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 text-lg h-14">
              Browse Rentals
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
