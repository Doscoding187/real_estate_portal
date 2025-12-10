/**
 * SimilarLocations Component
 * 
 * Displays similar locations based on price bracket, property types, and market characteristics.
 * 
 * Requirements:
 * - 22.1-22.5: Display up to 5 similar locations with statistics
 * 
 * Features:
 * - Shows similarity score
 * - Displays key statistics (avg price, listing count)
 * - Links to location pages
 * - Responsive grid layout
 */

import React from 'react';
import { Link } from 'wouter';
import { MapPin, TrendingUp, Home, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SimilarLocation {
  id: number;
  name: string;
  slug: string;
  type: string;
  cityName: string | null;
  provinceName: string | null;
  similarityScore: number;
  avgPrice: number | null;
  listingCount: number;
  propertyTypes: string[];
}

interface SimilarLocationsProps {
  locations: SimilarLocation[];
  currentLocationName: string;
  isLoading?: boolean;
}

export function SimilarLocations({ locations, currentLocationName, isLoading }: SimilarLocationsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Similar Locations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
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

  const getSimilarityLabel = (score: number): { label: string; color: string } => {
    if (score >= 0.8) return { label: 'Very Similar', color: 'bg-green-100 text-green-800' };
    if (score >= 0.7) return { label: 'Similar', color: 'bg-blue-100 text-blue-800' };
    return { label: 'Somewhat Similar', color: 'bg-gray-100 text-gray-800' };
  };

  const buildLocationUrl = (location: SimilarLocation): string => {
    const parts = ['/south-africa'];
    
    if (location.provinceName) {
      parts.push(location.provinceName.toLowerCase().replace(/\s+/g, '-'));
    }
    
    if (location.cityName) {
      parts.push(location.cityName.toLowerCase().replace(/\s+/g, '-'));
    }
    
    if (location.type === 'suburb') {
      parts.push(location.slug);
    }
    
    return parts.join('/');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Similar Locations</h2>
        <p className="text-gray-600">
          Explore areas similar to {currentLocationName} based on price range, property types, and market activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((location) => {
          const similarity = getSimilarityLabel(location.similarityScore);
          const locationUrl = buildLocationUrl(location);

          return (
            <Link key={location.id} href={locationUrl}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{location.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {location.cityName && <span>{location.cityName}</span>}
                        {location.cityName && location.provinceName && <span>, </span>}
                        {location.provinceName && <span>{location.provinceName}</span>}
                      </CardDescription>
                    </div>
                    <Badge className={similarity.color} variant="secondary">
                      {similarity.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Average Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>Avg Price</span>
                    </div>
                    <span className="font-semibold">{formatPrice(location.avgPrice)}</span>
                  </div>

                  {/* Listing Count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Home className="h-4 w-4" />
                      <span>Active Listings</span>
                    </div>
                    <span className="font-semibold">{location.listingCount}</span>
                  </div>

                  {/* Property Types */}
                  {location.propertyTypes.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">Property Types</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {location.propertyTypes.slice(0, 3).map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                        {location.propertyTypes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{location.propertyTypes.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Similarity Score */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Match Score</span>
                      <span className="font-medium">{Math.round(location.similarityScore * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${location.similarityScore * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
