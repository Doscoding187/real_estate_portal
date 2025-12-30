/**
 * Developer Brand Profile Page
 * 
 * Public-facing page for individual developer brand profiles.
 * Shows brand info, developments, properties, and provides enquiry path.
 */

import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/utils';
import { 
  Loader2, 
  Building2, 
  MapPin, 
  Globe, 
  Calendar, 
  Home,
  Bed,
  Bath,
  Square,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function DeveloperBrandProfilePage() {
  const [, params] = useRoute('/developer/:slug');
  const [, setLocation] = useLocation();
  const slug = params?.slug || '';

  // Fetch brand profile
  const { data: brand, isLoading, error } = trpc.brandProfile.getBrandProfile.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Fetch developments for this brand
  const { data: developments } = trpc.brandProfile.getBrandDevelopments.useQuery(
    { brandProfileId: brand?.id || 0 },
    { enabled: !!brand?.id }
  );

  const tierLabel: Record<string, string> = {
    national: 'National Developer',
    regional: 'Regional Developer',
    boutique: 'Boutique Developer',
  };

  const tierBadgeColor: Record<string, string> = {
    national: 'bg-indigo-600 text-white',
    regional: 'bg-blue-600 text-white',
    boutique: 'bg-emerald-600 text-white',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="flex items-center justify-center py-40">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container py-20 text-center">
          <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Developer Not Found</h2>
          <p className="text-slate-500 mb-6">
            The developer profile you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => setLocation('/developers')}>
            Browse All Developers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white pt-24 pb-16">
        <div className="container">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/10 overflow-hidden border-2 border-white/20 shrink-0">
              {brand.logoUrl ? (
                <img 
                  src={brand.logoUrl} 
                  alt={brand.brandName} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white text-4xl font-bold">
                  {brand.brandName.charAt(0)}
                </div>
              )}
            </div>

            {/* Brand Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">{brand.brandName}</h1>
                {brand.brandTier && (
                  <Badge className={`${tierBadgeColor[brand.brandTier] || 'bg-white/20'} border-0 text-sm`}>
                    {tierLabel[brand.brandTier] || brand.brandTier}
                  </Badge>
                )}
              </div>

              {brand.headOfficeLocation && (
                <div className="flex items-center gap-2 text-indigo-200 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>{brand.headOfficeLocation}</span>
                </div>
              )}

              {brand.about && (
                <p className="text-indigo-100 text-lg max-w-2xl mb-4 leading-relaxed">
                  {brand.about}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-sm text-indigo-200">
                {brand.foundedYear && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Est. {brand.foundedYear}</span>
                  </div>
                )}
                {brand.websiteUrl && (
                  <a 
                    href={brand.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}
              </div>

              {/* Property Focus Tags */}
              {brand.propertyFocus && brand.propertyFocus.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {brand.propertyFocus.map((focus: string) => (
                    <Badge 
                      key={focus}
                      variant="secondary"
                      className="bg-white/10 text-white border-0 capitalize hover:bg-white/20"
                    >
                      {focus.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        {/* Developments Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-600" />
              Developments by {brand.brandName}
            </h2>
            {developments && developments.length > 3 && (
              <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                View All ({developments.length})
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {developments && developments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {developments.slice(0, 6).map((dev: any) => (
                <Card 
                  key={dev.id}
                  className="group border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                  onClick={() => setLocation(`/development/${dev.slug || dev.id}`)}
                >
                  {/* Image */}
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    {dev.heroImageUrl || dev.mainImage ? (
                      <img 
                        src={dev.heroImageUrl || dev.mainImage} 
                        alt={dev.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200">
                        <Building2 className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                    {dev.status && (
                      <Badge className="absolute top-3 left-3 bg-indigo-600 text-white border-0">
                        {dev.status}
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                      {dev.name}
                    </h3>
                    
                    {(dev.city || dev.suburb) && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                        <MapPin className="h-4 w-4" />
                        <span>{dev.suburb || dev.city}, {dev.province}</span>
                      </div>
                    )}

                    {(dev.priceFrom || dev.priceTo) && (
                      <p className="text-lg font-bold text-indigo-600">
                        {dev.priceFrom && `From ${formatCurrency(dev.priceFrom)}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-slate-100 rounded-xl p-12 text-center">
              <Home className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Developments Listed</h3>
              <p className="text-slate-500">
                Developments by {brand.brandName} are not currently listed on Property Listify.
              </p>
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* Enquiry CTA */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Interested in {brand.brandName}?</h3>
          <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
            Enquire directly on developments by this developer via Property Listify.
          </p>
          <Button 
            size="lg"
            className="bg-white text-indigo-700 hover:bg-indigo-50"
            onClick={() => {
              if (developments && developments.length > 0) {
                setLocation(`/development/${developments[0].slug || developments[0].id}`);
              }
            }}
          >
            View Developments
          </Button>
        </div>

        {/* Claim CTA (only for non-subscribers) */}
        {brand.isClaimable === 1 && !brand.isSubscriber && (
          <div className="bg-slate-100 rounded-xl p-6 mt-8 text-center">
            <p className="text-slate-600 mb-3">
              Are you part of the <strong>{brand.brandName}</strong> team?
            </p>
            <Button 
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              onClick={() => setLocation('/developer/setup')}
            >
              Claim This Profile
            </Button>
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="bg-slate-100 py-6">
        <div className="container">
          <p className="text-center text-sm text-slate-500 max-w-2xl mx-auto">
            Developer information is provided for identification purposes only and does not imply partnership or endorsement.
          </p>
        </div>
      </div>
    </div>
  );
}
