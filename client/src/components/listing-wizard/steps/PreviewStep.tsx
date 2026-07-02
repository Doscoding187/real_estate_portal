// @ts-nocheck
/**
 * Step 7: Preview & Submit
 * Implements full listing preview
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Badge } from '@/components/ui/badge';
import PropertyCardList from '@/components/PropertyCardList';
import { useAuth } from '@/_core/hooks/useAuth';
import { calculateListingQualityScore } from '@/lib/quality';
import { QualityScoreCard } from '@/components/dashboard/QualityScoreCard';

const PreviewStep: React.FC = () => {
  const state = useListingWizardStore();
  const { user } = useAuth();

  // Get primary media
  const primaryMedia = state.media.find((m: any) => m.isPrimary) || state.media[0];

  // Get media counts
  const imageCount = state.media.filter((m: any) => m.type === 'image').length;
  const videoCount = state.media.filter((m: any) => m.type === 'video').length;

  const formatToken = (value: unknown) =>
    String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());

  const addUnique = (items: string[], value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(item => addUnique(items, item));
      return;
    }

    const formatted = formatToken(value);
    if (!formatted) return;

    const exists = items.some(item => item.toLowerCase() === formatted.toLowerCase());
    if (!exists) items.push(formatted);
  };

  const physicalSpecItems: string[] = [];
  [
    state.additionalInfo?.additionalRooms,
    state.additionalInfo?.outdoorFeatures,
    state.additionalInfo?.appliancesIncluded,
    state.additionalInfo?.accessibilityFeatures,
    state.additionalInfo?.amenitiesFeatures,
  ].forEach(value => addUnique(physicalSpecItems, value));

  [
    ['Kitchen', state.additionalInfo?.kitchenType],
    ['Countertops', state.additionalInfo?.countertopMaterial],
    ['Built-in Cupboards', state.additionalInfo?.builtInCupboards],
    ['Furnishing', state.additionalInfo?.furnishingStatus],
    ['Flooring', state.additionalInfo?.flooring],
    ['Air Conditioning', state.additionalInfo?.airConditioning],
    ['Fireplace', state.additionalInfo?.fireplace],
    ['Water Heating', state.additionalInfo?.waterHeating],
  ].forEach(([label, value]) => {
    if (value) addUnique(physicalSpecItems, `${label}: ${formatToken(value)}`);
  });

  const lifestyleHighlightItems: string[] = [];
  addUnique(
    lifestyleHighlightItems,
    state.additionalInfo?.lifestyleHighlights || state.additionalInfo?.propertyHighlights,
  );

  const viewHighlightItems: string[] = [];
  addUnique(viewHighlightItems, state.additionalInfo?.viewHighlights);

  const locationHighlightItems: string[] = [];
  addUnique(locationHighlightItems, state.additionalInfo?.locationHighlights);

  const previewFeatureLabels = [
    ...physicalSpecItems,
    ...lifestyleHighlightItems,
    ...viewHighlightItems,
    ...locationHighlightItems,
  ];

  const cardHighlightPreview = [
    ...lifestyleHighlightItems,
    ...viewHighlightItems,
    ...locationHighlightItems,
    ...physicalSpecItems,
  ].slice(0, 8);

  const previewSections = [
    {
      title: 'Property Features & Specifications',
      emptyLabel: 'No physical specifications selected',
      items: physicalSpecItems,
    },
    {
      title: 'Lifestyle Highlights',
      emptyLabel: 'No lifestyle highlights selected',
      items: lifestyleHighlightItems,
    },
    {
      title: 'Views',
      emptyLabel: 'No view highlights selected',
      items: viewHighlightItems,
    },
    {
      title: 'Location & Nearby Convenience',
      emptyLabel: 'No location conveniences selected',
      items: locationHighlightItems,
    },
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

  // Calculate Quality Score
  const quality = calculateListingQualityScore({
    ...state,
    images: state.media.filter((m: any) => m.type === 'image'),
    videos: state.media.filter((m: any) => m.type === 'video'),
    features: previewFeatureLabels,
    // Map specific fields for simple readiness/quality object if needed,
    // usually the state is close enough or we spread it.
    // Let's ensure top level fields match what calculateListingQualityScore expects
    price: getPrice(),
    askingPrice: getPrice(), // fallback
    monthlyRent: getPrice(), // fallback
    latitude: state.location?.latitude,
    longitude: state.location?.longitude,
    floorSize: getPropertyArea(),
  });

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
          description={state.description}
          bedrooms={Number((state.propertyDetails as any)?.bedrooms) || 0}
          bathrooms={Number((state.propertyDetails as any)?.bathrooms) || 0}
          area={getPropertyArea()}
          yardSize={getYardSize()}
          propertyType={
            state.propertyType
              ? state.propertyType.charAt(0).toUpperCase() + state.propertyType.slice(1)
              : 'Property'
          }
          listingType={state.action}
          agent={{
            name: user?.name || 'Current User',
            image: user?.avatar || undefined,
          }}
          badges={state.badges?.map(b => b.label)}
          imageCount={imageCount}
          videoCount={videoCount}
          highlights={cardHighlightPreview}
        />
      </div>

      {/* Additional Details Summary */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 max-w-4xl mx-auto mt-8">
        <h3 className="text-lg font-semibold mb-4">Listing Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-700 mb-2">Location</h4>
            <p className="text-slate-600">
              {state.location?.address}
              <br />
              {state.location?.city}, {state.location?.province}
              <br />
              {state.location?.postalCode}
            </p>
          </div>
          <div className="space-y-4">
            {previewSections.map(section => (
              <div key={section.title}>
                <h4 className="font-medium text-slate-700 mb-2">{section.title}</h4>
                <div className="flex flex-wrap gap-2">
                  {section.items.map((item: string, index: number) => (
                    <Badge
                      key={`${section.title}-${item}-${index}`}
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-800 border-emerald-200"
                    >
                      {item}
                    </Badge>
                  ))}
                  {section.items.length === 0 && (
                    <span className="text-slate-500 italic">{section.emptyLabel}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Score Feedback */}
      <div className="max-w-4xl mx-auto mt-8">
        <QualityScoreCard
          qualityScore={quality.score}
          qualityBreakdown={quality.breakdown}
          tips={quality.tips}
        />
      </div>
    </div>
  );
};

export default PreviewStep;
