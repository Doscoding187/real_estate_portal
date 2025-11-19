/**
 * Main Listing Wizard Component
 * Orchestrates the multi-step listing creation process
 */

import React, { useState, useEffect } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import ActionStep from './steps/ActionStep';
import PropertyTypeStep from './steps/PropertyTypeStep';
import BadgesStep from './steps/BadgesStep';
import PropertyDetailsStep from './steps/PropertyDetailsStep';
import BasicInfoStep from './steps/BasicInfoStep';
import PricingStep from './steps/PricingStep';
import LocationStep from './steps/LocationStep';
import MediaUploadStep from './steps/MediaUploadStep';
import PreviewStep from './steps/PreviewStep';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';

const ListingWizard: React.FC = () => {
  const store = useListingWizardStore();
  const [location, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // TRPC mutation for creating listing
  const createListingMutation = trpc.listing.create.useMutation();

  // Redirect if submitted
  useEffect(() => {
    if (store.status === 'submitted' && createListingMutation.data) {
      setLocation(`/listings/${createListingMutation.data.id}`);
    }
  }, [store.status, createListingMutation.data, setLocation]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!store.validate()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare listing data with proper type handling (using string IDs)
      const listingData = {
        action: store.action!,
        propertyType: store.propertyType!,
        title: store.title,
        description: store.description,
        pricing: {
          ...store.pricing!,
          // Ensure transferCostEstimate is either a number or undefined (not null)
          // Only include for sell listings which have this field
          ...('transferCostEstimate' in store.pricing! 
            ? (store.pricing!.transferCostEstimate !== null && 
               store.pricing!.transferCostEstimate !== undefined && 
               !isNaN(Number(store.pricing!.transferCostEstimate))
               ? { transferCostEstimate: Number(store.pricing!.transferCostEstimate) }
               : {})
            : {}),
        },
        propertyDetails: store.propertyDetails || {},
        location: store.location!,
        // Send media IDs as strings (no numeric conversion)
        mediaIds: store.media.map((m: any) => m.id?.toString() || ''),
        // Send mainMediaId as string or undefined
        mainMediaId: store.mainMediaId?.toString() || 
          (store.media.length > 0 ? store.media[0].id?.toString() : undefined),
        status: 'pending_review' as const,
      };

      console.log('Submitting listing data:', listingData);

      // Submit to API
      const result = await createListingMutation.mutateAsync(listingData);
      console.log('Listing created:', result);

      // Update store status
      store.submitForReview();
    } catch (error: any) {
      console.error('Error submitting listing:', error);
      setSubmitError(
        error.message || 'Failed to submit listing. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current step component
  const getCurrentStep = () => {
    switch (store.currentStep) {
      case 1:
        return <ActionStep />;
      case 2:
        return <PropertyTypeStep />;
      case 3:
        return <BadgesStep />;
      case 4:
        return <PropertyDetailsStep />;
      case 5:
        return <BasicInfoStep />;
      case 6:
        return <PricingStep />;
      case 7:
        return <LocationStep />;
      case 8:
        return <MediaUploadStep />;
      case 9:
        return <PreviewStep />;
      default:
        return <ActionStep />;
    }
  };

  // Calculate progress percentage
  const progress = (store.currentStep / 9) * 100;

  // Step titles for progress indicator
  const stepTitles = [
    'Action',
    'Property Type',
    'Badges',
    'Details',
    'Basic Info',
    'Pricing',
    'Location',
    'Media',
    'Preview',
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New Listing
          </h1>
          <p className="text-gray-600">
            Follow the steps to create your property listing
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {store.currentStep} of 9
            </span>
            <span className="text-sm font-medium text-gray-700">
              {stepTitles[store.currentStep - 1]}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          {getCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={store.prevStep}
            disabled={store.currentStep === 1 || isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {store.currentStep < 9 ? (
            <Button
              onClick={store.nextStep}
              disabled={isSubmitting}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Listing'}
              <Home className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{submitError}</p>
          </div>
        )}

        {/* API Error */}
        {createListingMutation.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">
              Error: {createListingMutation.error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingWizard;