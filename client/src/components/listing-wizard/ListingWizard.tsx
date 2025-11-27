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
import BasicInformationStep from './steps/BasicInformationStep';
import { AdditionalInformationStep } from './steps/AdditionalInformationStep';
import PricingStep from './steps/PricingStep';
import LocationStep from './steps/LocationStep';
import MediaUploadStep from './steps/MediaUploadStep';
import PreviewStep from './steps/PreviewStep';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Home, FileText, Trash2, Save, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ListingWizard: React.FC = () => {
  const store = useListingWizardStore();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [wizardKey, setWizardKey] = useState(0); // Force re-render on reset
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // TRPC mutation for creating listing
  const createListingMutation = trpc.listing.create.useMutation();
  // TRPC mutation for submitting for review
  const submitForReviewMutation = trpc.listing.submitForReview.useMutation();
  // TRPC mutation for updating listing
  const updateListingMutation = trpc.listing.update.useMutation();

  // Parse query params
  const searchParams = new URLSearchParams(window.location.search);
  const editId = searchParams.get('id');
  const isEditMode = searchParams.get('edit') === 'true';

  // Fetch existing listing if in edit mode
  const { data: existingListing, isLoading: isLoadingExisting } = trpc.listing.getById.useQuery(
    { id: Number(editId) },
    { enabled: !!editId && isEditMode }
  );

  // Populate store with existing listing data
  useEffect(() => {
    if (existingListing && isEditMode) {
      console.log('Populating wizard with existing listing:', existingListing);
      
      // Reset store first to clear any drafts
      store.reset();
      
      // Set basic fields
      store.setAction(existingListing.action as any);
      store.setPropertyType(existingListing.propertyType as any);
      store.setTitle(existingListing.title);
      store.setDescription(existingListing.description);
      
      // Set pricing
      const pricing: any = {};
      if (existingListing.askingPrice) pricing.askingPrice = Number(existingListing.askingPrice);
      if (existingListing.monthlyRent) pricing.monthlyRent = Number(existingListing.monthlyRent);
      if (existingListing.deposit) pricing.deposit = Number(existingListing.deposit);
      if (existingListing.transferCostEstimate) pricing.transferCostEstimate = Number(existingListing.transferCostEstimate);
      if (existingListing.startingBid) pricing.startingBid = Number(existingListing.startingBid);
      if (existingListing.reservePrice) pricing.reservePrice = Number(existingListing.reservePrice);
      if (existingListing.leaseTerms) pricing.leaseTerms = existingListing.leaseTerms;
      if (existingListing.availableFrom) pricing.availableFrom = new Date(existingListing.availableFrom);
      if (existingListing.utilitiesIncluded) pricing.utilitiesIncluded = Boolean(existingListing.utilitiesIncluded);
      if (existingListing.auctionDateTime) pricing.auctionDateTime = new Date(existingListing.auctionDateTime);
      if (existingListing.auctionTermsDocumentUrl) pricing.auctionTermsDocumentUrl = existingListing.auctionTermsDocumentUrl;
      if (existingListing.negotiable) pricing.negotiable = Boolean(existingListing.negotiable);
      
      store.setPricing(pricing);
      
      // Set property details
      if (existingListing.propertyDetails) {
        store.setPropertyDetails(existingListing.propertyDetails as any);
        // Also map to basicInfo/additionalInfo if needed, or just rely on propertyDetails
        // The wizard seems to split these, so we might need to map them back if they are stored separately in the store
        // But setPropertyDetails should handle the main ones.
        // Check if we need to populate additionalInfo for features
        if ((existingListing.propertyDetails as any).features) {
             store.setAdditionalInfo({
                 propertyHighlights: (existingListing.propertyDetails as any).features || [],
                 // Map other fields if necessary
             });
        }
      }
      
      // Set location
      store.setLocation({
        address: existingListing.address,
        latitude: Number(existingListing.latitude),
        longitude: Number(existingListing.longitude),
        city: existingListing.city,
        suburb: existingListing.suburb || '',
        province: existingListing.province,
        postalCode: existingListing.postalCode || '',
        placeId: existingListing.placeId || '',
      });
      
      // Set media
      if (existingListing.media && existingListing.media.length > 0) {
        // Clear existing media first (reset did this, but just to be sure)
        // store.media is [] after reset
        
        // We need to map DB media to store MediaFile
        // This might be tricky if store expects File objects for new uploads
        // But for existing ones, it should handle URL-based media
        existingListing.media.forEach((m: any) => {
            store.addMedia({
                id: m.id,
                file: null as any, // No file object for existing media
                preview: m.originalUrl,
                type: m.mediaType,
                progress: 100,
                displayOrder: m.displayOrder,
                isPrimary: Boolean(m.isPrimary),
                description: '',
            });
            
            if (m.isPrimary) {
                store.setMainMedia(m.id);
            }
        });
      }
      
      // Set step to 1 or last step? 
      // Maybe let user start at 1 to review everything
      store.goToStep(1);
      
      // Disable resume draft dialog
      setShowResumeDraftDialog(false);
    }
  }, [existingListing, isEditMode]);

  // Check for draft on mount and show resume dialog
  useEffect(() => {
    // If editing, don't show draft dialog
    if (isEditMode) return;

    // If previously submitted, reset
    if (store.status === 'submitted') {
      console.log('Wizard was previously submitted, resetting for new listing...');
      store.reset();
      return;
    }

    // Check if there's a draft (currentStep > 1 or has action/propertyType)
    const hasDraft = store.currentStep > 1 || store.action || store.propertyType;

    if (hasDraft) {
      setShowResumeDraftDialog(true);
    }
  }, [isEditMode]); // Run when isEditMode is determined

  // Handle resume draft decision
  const handleResumeDraft = () => {
    setShowResumeDraftDialog(false);
    // Keep existing state - user continues where they left off
  };

  const handleStartFresh = () => {
    setShowResumeDraftDialog(false);
    store.reset();
    setWizardKey(prev => prev + 1); // Force re-render
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setDraftSaved(false);

    try {
      // The draft is already auto-saved via Zustand persist
      // This is just for user feedback
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save

      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000); // Hide success message after 2s
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Redirect if submitted (legacy - keeping for safety)
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
      let result;
      if (isEditMode && editId) {
          await updateListingMutation.mutateAsync({
              id: Number(editId),
              ...listingData
          });
          result = { id: Number(editId) };
          console.log('Listing updated:', result);
      } else {
          result = await createListingMutation.mutateAsync(listingData);
          console.log('Listing created:', result);
      }

      // Submit for review
      try {
        await submitForReviewMutation.mutateAsync({ listingId: result.id });
        console.log('Listing submitted for review');

        // Show success message
        alert('Listing submitted for review successfully!');

        // Reset wizard state for next listing
        store.reset();

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
        return <BasicInformationStep />;
      case 4:
        return <AdditionalInformationStep />;
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
    'Basic Info',
    'Additional Info',
    'Pricing',
    'Location',
    'Media',
    'Preview',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      {/* Resume Draft Dialog */}
      <Dialog open={showResumeDraftDialog} onOpenChange={setShowResumeDraftDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6 text-blue-600" />
              Resume Draft Listing?
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              You have an unfinished listing in progress. Would you like to continue where you left
              off or start a new listing?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">Draft Details</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Step {store.currentStep} of 8
                    {store.propertyType &&
                      ` • ${store.propertyType.charAt(0).toUpperCase() + store.propertyType.slice(1)}`}
                    {store.action &&
                      ` • ${store.action.charAt(0).toUpperCase() + store.action.slice(1)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleStartFresh} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Start New
            </Button>
            <Button
              onClick={handleResumeDraft}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <FileText className="w-4 h-4" />
              Resume Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        stepNumber
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 text-center max-w-[80px] ${isCurrent ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
                    >
                      {title}
                    </span>
                  </div>
                  {stepNumber < 8 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div
          key={wizardKey}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8"
        >
          {getCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={store.prevStep}
              disabled={store.currentStep === 1 || isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {/* Save Draft Button */}
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className={`gap-2 ${draftSaved ? 'border-green-500 text-green-600' : ''}`}
            >
              {draftSaved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isSavingDraft ? 'Saving...' : 'Save Draft'}
                </>
              )}
            </Button>
          </div>

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
