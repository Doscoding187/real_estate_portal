import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, Navigation } from 'lucide-react';

interface NearbySuburb {
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string;
  distance?: number; // Distance in km
  cityName?: string;
}

interface NearbySuburbsProps {
  title?: string;
  suburbs: NearbySuburb[];
  parentSlug: string; // e.g., 'gauteng/johannesburg'
  currentSuburbName: string;
  maxDisplay?: number;
}

export function NearbySuburbs({
  title = 'Nearby Suburbs',
  suburbs,
  parentSlug,
  currentSuburbName,
  maxDisplay = 6,
}: NearbySuburbsProps) {
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    if (price >= 1000000) return `R${(price / 1000000).toFixed(1)}M`;
    return `R${(price / 1000).toFixed(0)}k`;
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    if (distance < 1) return `${(distance * 1000).toFixed(0)}m away`;
    return `${distance.toFixed(1)}km away`;
  };

  const getUrl = (suburb: NearbySuburb) => {
    const slug = suburb.slug || suburb.name.toLowerCase().replace(/\s+/g, '-');
    // Extract city slug from parentSlug if needed
    const citySlug = parentSlug.split('/').pop();
    return `/${parentSlug.split('/')[0]}/${citySlug}/${slug}`;
  };

  const displaySuburbs = suburbs.slice(0, maxDisplay);

  if (displaySuburbs.length === 0) {
    return null;
  }

  return (
    <div className="py-12 bg-white">
      <div className="container">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-slate-600">Explore neighborhoods near {currentSuburbName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displaySuburbs.map(suburb => (
            <Link key={suburb.id} href={getUrl(suburb)}>
              <Card className="hover:shadow-lg transition-all cursor-pointer border-slate-200 group h-full hover:border-primary/50">
                <CardContent className="p-5 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-800 group-hover:text-primary transition-colors flex-1">
                        {suburb.name}
                      </h3>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary flex-shrink-0 ml-2" />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        <span>{suburb.cityName || 'Suburb'}</span>
                      </div>
                      {suburb.distance && (
                        <Badge variant="secondary" className="text-xs">
                          <Navigation className="h-3 w-3 mr-1" />
                          {formatDistance(suburb.distance)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Listings</span>
                      <span className="font-semibold text-slate-700">{suburb.listingCount}</span>
                    </div>
                    {suburb.avgPrice && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Avg Price</span>
                        <span className="font-semibold text-slate-700">
                          {formatPrice(suburb.avgPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {suburbs.length > maxDisplay && (
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Showing {maxDisplay} of {suburbs.length} nearby suburbs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
