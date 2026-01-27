/**
 * TrendingSuburbs Component
 *
 * Displays trending suburbs based on search activity
 *
 * Requirements:
 * - 21.4-21.5: Display top 10 trending suburbs with statistics
 *
 * Features:
 * - Shows trending indicators (↑)
 * - Displays quick stats (listing count, avg price)
 * - Links to suburb location pages
 */

import React from 'react';
import { Link } from 'wouter';
import { TrendingUp, MapPin, Home, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface TrendingSuburb {
  id: number;
  name: string;
  slug: string;
  cityName: string | null;
  provinceName: string | null;
  trendingScore: number;
  searchCount30d: number;
  listingCount: number;
  avgPrice: number | null;
}

interface TrendingSuburbsProps {
  suburbs: TrendingSuburb[];
  title?: string;
  showCount?: number;
}

export const TrendingSuburbs: React.FC<TrendingSuburbsProps> = ({
  suburbs,
  title = 'Trending Suburbs',
  showCount = 10,
}) => {
  const displaySuburbs = suburbs.slice(0, showCount);

  if (displaySuburbs.length === 0) {
    return null;
  }

  const formatPrice = (price: number | null): string => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getTrendingColor = (score: number): string => {
    if (score >= 75) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTrendingBadgeVariant = (
    score: number,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= 75) return 'destructive';
    if (score >= 50) return 'default';
    return 'secondary';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displaySuburbs.map((suburb, index) => {
            // Build URL path
            const provinceSlug = suburb.provinceName?.toLowerCase().replace(/\s+/g, '-') || '';
            const citySlug = suburb.cityName?.toLowerCase().replace(/\s+/g, '-') || '';
            const suburbPath = `/south-africa/${provinceSlug}/${citySlug}/${suburb.slug}`;

            return (
              <Link key={suburb.id} href={suburbPath}>
                <a className="block p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side: Rank and Info */}
                    <div className="flex items-start gap-3 flex-1">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {index + 1}
                      </div>

                      {/* Suburb Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{suburb.name}</h3>
                          <Badge variant={getTrendingBadgeVariant(suburb.trendingScore)}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {suburb.trendingScore}
                          </Badge>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {suburb.cityName && `${suburb.cityName}, `}
                            {suburb.provinceName}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Home className="h-3 w-3" />
                            <span>{suburb.listingCount} listings</span>
                          </div>
                          {suburb.avgPrice && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <DollarSign className="h-3 w-3" />
                              <span>{formatPrice(suburb.avgPrice)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Trending indicator */}
                    <div className="flex-shrink-0">
                      <TrendingUp className={`h-6 w-6 ${getTrendingColor(suburb.trendingScore)}`} />
                    </div>
                  </div>
                </a>
              </Link>
            );
          })}
        </div>

        {suburbs.length > showCount && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Showing {showCount} of {suburbs.length} trending suburbs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingSuburbs;
