/**
 * Main Listing Wizard Component
 * Orchestrates the multi-step listing creation process
 */

import React, { useState, useEffect } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import ActionStep from './steps/ActionStep';
import PropertyTypeStep from './steps/PropertyTypeStep';
import BadgesStep from './steps/BadgesStep';
import PropertyInformationStep from './steps/PropertyInformationStep';
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
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // TRPC mutation for creating listing
  const createListingMutation = trpc.listing.create.useMutation();
  // TRPC mutation for submitting for review
  const submitForReviewMutation = trpc.listing.submitForReview.useMutation();

  // Redirect if submitted
  useEffect(() => {
    if (store.status === 'submitted' && createListingMutation.data) {
      // Instead of redirecting to the listing page, we'll handle the redirect after submit for review
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
            ? store.pricing!.transferCostEstimate !== null &&
              store.pricing!.transferCostEstimate !== undefined &&
              !isNaN(Number(store.pricing!.transferCostEstimate))
              ? { transferCostEstimate: Number(store.pricing!.transferCostEstimate) }
              : {}
            : {}),
        },
        propertyDetails: store.propertyDetails || {},
        location: store.location!,
        // Send media IDs as strings (no numeric conversion)
        mediaIds: store.media.map((m: any) => m.id?.toString() || ''),
        // Send mainMediaId as string or undefined
        mainMediaId:
          store.mainMediaId?.toString() ||
          (store.media.length > 0 ? store.media[0].id?.toString() : undefined),
        status: 'draft' as const, // Start as draft
      };

      console.log('Submitting listing data:', listingData);

      // Submit to API
      const result = await createListingMutation.mutateAsync(listingData);
      console.log('Listing created:', result);

      // Submit for review
      try {
        await submitForReviewMutation.mutateAsync({ listingId: result.id });
        console.log('Listing submitted for review');

        // Show success message
        alert('Listing submitted for review successfully!');

        // Redirect based on user role using the proper navigation strategy
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // Fallback redirects based on role
          if (user?.role === 'agent') {
            window.location.href = '/agent/dashboard';
          } else if (user?.role === 'property_developer') {
            window.location.href = '/developer/dashboard';
          } else {
            window.location.href = '/'; // Default fallback
          }
        }
      } catch (reviewError: any) {
        console.error('Error submitting for review:', reviewError);
        alert('Listing created but failed to submit for review. Please try again later.');
        // Keep as draft and stay on page
      }
    } catch (error: any) {
      console.error('Error submitting listing:', error);
      setSubmitError(error.message || 'Failed to submit listing. Please try again.');
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
        return <PropertyInformationStep />;
      case 5:
        return <PricingStep />;
      case 6:
        return <LocationStep />;
      case 7:
        return <MediaUploadStep />;
      case 8:
        return <PreviewStep />;
      default:
        return <ActionStep />;
    }
  };

  // Calculate progress percentage
  const progress = (store.currentStep / 8) * 100;

  // Step titles for progress indicator
  const stepTitles = [
    'Action',
    'Type',
    'Badges',
    'Information',
    'Pricing',
    'Location',
    'Media',
    'Preview',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Create New Listing
          </h1>
          <p className="text-gray-600 text-lg">Follow the steps to create your property listing</p>
        </div>


        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < store.currentStep;
              const isCurrent = stepNumber === store.currentStep;
              
              return (
                <React.Fragment key={stepNumber}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepNumber
                      )}
                    </div>
                    <span className={`text-xs mt-2 text-center max-w-[80px] ${isCurrent ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {title}
                    </span>
                  </div>
                  {stepNumber < 9 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
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

          {store.currentStep < 8 ? (
            <Button 
              onClick={store.nextStep} 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
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
            <p className="text-red-800">Error: {createListingMutation.error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingWizard;
