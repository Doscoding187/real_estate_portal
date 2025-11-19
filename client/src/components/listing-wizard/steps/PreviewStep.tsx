/**
 * Step 7: Preview & Submit
 * Implements full listing preview
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PropertyType } from '@/../../shared/listing-types';
import { PROPERTY_TYPE_TEMPLATES } from '@/../../shared/listing-types';
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Share2,
  Calendar,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

const PreviewStep: React.FC = () => {
  const state = useListingWizardStore();

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-ZA');
  };

  // Get primary media
  const primaryMedia = state.media.find((m: any) => m.isPrimary);

  // Get amenities list
  const amenitiesList = state.propertyDetails?.amenitiesFeatures || [];

  // Calculate area based on property type
  const getPropertyArea = () => {
    if (!state.propertyDetails) return 'N/A';

    if (state.propertyType === 'apartment') {
      return (state.propertyDetails as any).unitSizeM2 || 'N/A';
    } else if (state.propertyType === 'house') {
      return (
        (state.propertyDetails as any).erfSizeM2 ||
        (state.propertyDetails as any).houseAreaM2 ||
        'N/A'
      );
    } else if (state.propertyType === 'land') {
      return (state.propertyDetails as any).landSizeM2OrHa || 'N/A';
    } else if (state.propertyType === 'farm') {
      return (state.propertyDetails as any).landSizeHa || 'N/A';
    } else if (state.propertyType === 'commercial') {
      return (state.propertyDetails as any).floorAreaM2 || 'N/A';
    }
    return 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Full Property Preview - Mimics PropertyDetail page */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Property Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{state.title || 'Untitled Property'}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>
                  {state.location?.address || 'Address not specified'},
                  {state.location?.city || 'City not specified'},
                  {state.location?.province || 'Province not specified'}
                </span>
              </div>
            </div>
            <Badge className="bg-accent text-accent-foreground">Preview</Badge>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="p-6 border-b">
          <div className="rounded-lg overflow-hidden mb-4">
            {primaryMedia ? (
              <div className="w-full h-[500px] bg-gray-100 flex items-center justify-center">
                {primaryMedia.type === 'image' ? (
                  <img
                    src={primaryMedia.url}
                    alt="Primary media"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto" />
                    <p className="mt-2 text-gray-500">Video Preview</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-[500px] bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">No Primary Media Selected</span>
              </div>
            )}
          </div>

          {state.media.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {state.media.slice(0, 4).map((item: any, index: number) => (
                <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={`Media ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8 mx-auto" />
                        <p className="text-xs mt-1 text-gray-500">Video</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Details */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-6 py-4 border-y">
                {(state.propertyDetails as any)?.bedrooms && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{(state.propertyDetails as any).bedrooms}</span>
                    <span className="text-sm text-muted-foreground">Bedrooms</span>
                  </div>
                )}
                {(state.propertyDetails as any)?.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">
                      {(state.propertyDetails as any).bathrooms}
                    </span>
                    <span className="text-sm text-muted-foreground">Bathrooms</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Maximize className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{getPropertyArea()}</span>
                  <span className="text-sm text-muted-foreground">m²</span>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {state.description || 'No description provided'}
                </p>
              </div>

              {/* Amenities */}
              {amenitiesList.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenitiesList.map((amenity: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Property Type:</span>
                  <span className="ml-2 font-semibold capitalize">
                    {state.propertyType || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Listing Type:</span>
                  <span className="ml-2 font-semibold capitalize">
                    {state.action || 'Not specified'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">0 views (preview)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6 sticky top-20">
              <div className="mb-6">
                <div className="text-3xl font-bold text-primary mb-1">
                  {state.pricing
                    ? state.action === 'sell'
                      ? formatCurrency((state.pricing as any).askingPrice)
                      : state.action === 'rent'
                        ? formatCurrency((state.pricing as any).monthlyRent)
                        : formatCurrency((state.pricing as any).startingBid)
                    : 'Price not specified'}
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  For {state.action || 'sale'}
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full bg-accent hover:bg-accent/90" size="lg">
                  Contact Owner
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <Heart className="h-5 w-5 mr-2" />
                  Save to Favorites
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <Share2 className="h-5 w-5 mr-2" />
                  Share Property
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>Listed today (preview)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Info */}
      {/* Removed as per user request - submission is handled by the ListingWizard component */}
    </div>
  );
};

export default PreviewStep;
