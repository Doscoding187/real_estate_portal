/**
 * Developer Brand Section
 *
 * Displays developer brand information on property detail pages
 * when a property/development is linked to a developerBrandProfile.
 */

import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Globe, ChevronRight, Home } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export interface DeveloperBrandData {
  id: number;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  about?: string | null;
  headOfficeLocation?: string | null;
  websiteUrl?: string | null;
  brandTier?: 'national' | 'regional' | 'boutique';
  propertyFocus?: string[];
}

interface DeveloperBrandSectionProps {
  brand: DeveloperBrandData;
}

export function DeveloperBrandSection({ brand }: DeveloperBrandSectionProps) {
  const [, setLocation] = useLocation();

  // Fetch other developments by this brand
  const { data: developmentsData } = trpc.brandProfile.getBrandDevelopments.useQuery(
    { brandProfileId: brand.id },
    { enabled: !!brand.id },
  );

  const tierLabel = {
    national: 'National Developer',
    regional: 'Regional Developer',
    boutique: 'Boutique Developer',
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          About the Developer
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Brand Header */}
        <div className="flex items-start gap-4 mb-6">
          {/* Logo */}
          <div
            className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:border-indigo-300 transition-colors"
            onClick={() => setLocation(`/developer/${brand.slug}`)}
          >
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.brandName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-xl font-bold">
                {brand.brandName.charAt(0)}
              </div>
            )}
          </div>

          {/* Brand Info */}
          <div className="flex-1">
            <h4
              className="text-lg font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors"
              onClick={() => setLocation(`/developer/${brand.slug}`)}
            >
              {brand.brandName}
            </h4>

            {brand.brandTier && (
              <Badge className="mt-1 bg-indigo-100 text-indigo-700 border-0 text-xs font-medium">
                {tierLabel[brand.brandTier]}
              </Badge>
            )}

            {brand.headOfficeLocation && (
              <div className="flex items-center gap-1 text-sm text-slate-500 mt-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>{brand.headOfficeLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        {brand.about && (
          <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">{brand.about}</p>
        )}

        {/* Property Focus Tags */}
        {brand.propertyFocus && brand.propertyFocus.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {brand.propertyFocus.map(focus => (
              <Badge
                key={focus}
                variant="secondary"
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 text-xs capitalize"
              >
                {focus.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats / Other Developments */}
        {developmentsData && developmentsData.length > 1 && (
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">
                  {developmentsData.length} Developments by this Developer
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                onClick={() => setLocation(`/developer/${brand.slug}`)}
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setLocation(`/developer/${brand.slug}`)}
          >
            View Developer Profile
          </Button>

          {brand.websiteUrl && (
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => window.open(brand.websiteUrl!, '_blank')}
            >
              <Globe className="h-4 w-4 mr-2" />
              Website
            </Button>
          )}
        </div>

        {/* Legal Disclaimer */}
        <p className="text-xs text-slate-400 mt-4 italic">
          Developer information is provided for identification purposes only and does not imply
          partnership or endorsement.
        </p>
      </CardContent>
    </Card>
  );
}
