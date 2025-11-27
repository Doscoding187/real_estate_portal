/**
 * Step 7: Preview & Submit
 * Implements full listing preview
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PropertyCardList from '@/components/PropertyCardList';
import { useAuth } from '@/_core/hooks/useAuth';
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
  const { user } = useAuth();

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
  const primaryMedia = state.media.find((m: any) => m.isPrimary) || state.media[0];
  
  // Get media counts
  const imageCount = state.media.filter((m: any) => m.type === 'image').length;
  const videoCount = state.media.filter((m: any) => m.type === 'video').length;

  // Get amenities list from additionalInfo (where they're actually stored)
  const amenitiesList = [
    ...(state.additionalInfo?.propertyHighlights || []),
    ...(state.additionalInfo?.additionalRooms || []),
    ...(state.additionalInfo?.securityFeatures || []),
  ];

  // Calculate house/building area (not yard/land)
  const getPropertyArea = () => {
    if (!state.propertyDetails) return 0;

    if (state.propertyType === 'apartment') {
      return Number((state.propertyDetails as any).unitSizeM2) || 0;
    } else if (state.propertyType === 'house') {
      // For houses, return house area (not yard/erf size)
      return Number((state.propertyDetails as any).houseAreaM2) || 0;
    } else if (state.propertyType === 'land') {
      return Number((state.propertyDetails as any).landSizeM2OrHa) || 0;
    } else if (state.propertyType === 'farm') {
      return Number((state.propertyDetails as any).landSizeHa) || 0;
    } else if (state.propertyType === 'commercial') {
      return Number((state.propertyDetails as any).floorAreaM2) || 0;
    }
    return 0;
  };

  // Get yard/land size separately (for houses)
  const getYardSize = () => {
    if (!state.propertyDetails) return undefined;
    
    if (state.propertyType === 'house') {
      return Number((state.propertyDetails as any).erfSizeM2) || undefined;
    }
    return undefined;
  };

  // Get price
  const getPrice = () => {
    if (!state.pricing) return 0;
    if (state.action === 'sell') return Number((state.pricing as any).askingPrice) || 0;
    if (state.action === 'rent') return Number((state.pricing as any).monthlyRent) || 0;
    return Number((state.pricing as any).startingBid) || 0;
  };

  return (
    <div className="space-y-8">
      {/* Preview Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Preview Your Listing</h2>
        <p className="text-slate-600">This is how your property will appear in search results</p>
      </div>

      {/* Card Preview - Centered */}
      <div className="flex justify-center">
        <PropertyCardList
          id="preview"
          title={state.title || 'Untitled Property'}
          price={getPrice()}
          location={`${state.location?.address || ''}, ${state.location?.city || ''}`}
          image={primaryMedia?.url || '/assets/placeholder.jpg'}
          description={state.description?.split('.')[0] + '.' || undefined}
          bedrooms={Number((state.propertyDetails as any)?.bedrooms) || 0}
          bathrooms={Number((state.propertyDetails as any)?.bathrooms) || 0}
          area={getPropertyArea()}
          yardSize={getYardSize()}
          propertyType={state.propertyType ? state.propertyType.charAt(0).toUpperCase() + state.propertyType.slice(1) : 'Property'}
          listingType={state.action}
          agent={{
            name: user?.name || 'Current User',
            image: user?.avatar || undefined
          }}
          badges={state.badges?.map(b => b.label)}
          imageCount={imageCount}
          videoCount={videoCount}
          highlights={amenitiesList.slice(0, 5)}
        />
      </div>

      {/* Additional Details Summary */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 max-w-4xl mx-auto mt-8">
        <h3 className="text-lg font-semibold mb-4">Listing Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-700 mb-2">Location</h4>
            <p className="text-slate-600">
              {state.location?.address}<br />
              {state.location?.city}, {state.location?.province}<br />
              {state.location?.postalCode}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-700 mb-2">Features</h4>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map((amenity: string, index: number) => (
                <Badge key={index} variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  {amenity}
                </Badge>
              ))}
              {amenitiesList.length === 0 && <span className="text-slate-500 italic">No amenities selected</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewStep;
