/**
 * Step 7: Preview & Submit
 * Implements full listing preview
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PropertyType } from '@/../../shared/listing-types';
import { PROPERTY_TYPE_TEMPLATES } from '@/../../shared/listing-types';

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

  return (
    <div className="space-y-6">
      {/* Listing Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Listing Preview</h3>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Title</p>
                <p className="font-semibold">{state.title || 'No title'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-semibold">{state.description || 'No description'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Action</p>
                <p className="font-semibold capitalize">{state.action || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Property Type</p>
                <p className="font-semibold">
                  {state.propertyType
                    ? PROPERTY_TYPE_TEMPLATES[state.propertyType as PropertyType]?.label ||
                      state.propertyType
                    : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          {state.pricing && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Pricing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.action === 'sell' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Asking Price</p>
                      <p className="font-semibold">
                        {formatCurrency((state.pricing as any).askingPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Negotiable</p>
                      <p className="font-semibold">
                        {(state.pricing as any).negotiable ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </>
                )}

                {state.action === 'rent' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Monthly Rent</p>
                      <p className="font-semibold">
                        {formatCurrency((state.pricing as any).monthlyRent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Deposit</p>
                      <p className="font-semibold">
                        {formatCurrency((state.pricing as any).deposit)}
                      </p>
                    </div>
                  </>
                )}

                {state.action === 'auction' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Starting Bid</p>
                      <p className="font-semibold">
                        {formatCurrency((state.pricing as any).startingBid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Auction Date</p>
                      <p className="font-semibold">
                        {formatDate((state.pricing as any).auctionDateTime)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Property Details */}
          {state.propertyDetails && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Property Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(state.propertyDetails).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="font-semibold">
                      {typeof value === 'boolean'
                        ? value
                          ? 'Yes'
                          : 'No'
                        : String(value) || 'Not specified'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          {state.location && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Location</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-semibold">{state.location.address || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="font-semibold">{state.location.city || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Suburb</p>
                  <p className="font-semibold">{state.location.suburb || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Province</p>
                  <p className="font-semibold">{state.location.province || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Media */}
          {state.media.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Media ({state.media.length} items)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {state.media.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="relative rounded-lg border overflow-hidden aspect-square"
                  >
                    {item.type === 'image' && item.url && (
                      <img
                        src={item.url}
                        alt={`Media ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {item.type === 'video' && (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto" />
                          <p className="text-xs mt-2">Video</p>
                        </div>
                      </div>
                    )}
                    {item.type === 'floorplan' && (
                      <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="bg-blue-100 border-2 border-dashed rounded-xl w-16 h-16 mx-auto" />
                          <p className="text-xs mt-2">Floorplan</p>
                        </div>
                      </div>
                    )}
                    {item.type === 'pdf' && (
                      <div className="w-full h-full bg-red-50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="bg-red-100 border-2 border-dashed rounded-xl w-16 h-16 mx-auto" />
                          <p className="text-xs mt-2">PDF</p>
                        </div>
                      </div>
                    )}
                    {item.isPrimary && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                        Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Submission Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">✅ Ready to Submit</h4>
        <p className="text-sm text-green-800">
          Your listing will be submitted for review. You'll be notified once it's approved and
          published.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => state.submitForReview()}
          className="px-8 bg-green-600 hover:bg-green-700"
        >
          Submit for Review
        </Button>
      </div>
    </div>
  );
};

export default PreviewStep;
