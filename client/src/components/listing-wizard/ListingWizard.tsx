/**
 * Main Listing Wizard Component
 * Orchestrates the multi-step listing creation process
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { useAutoSave } from '@/hooks/useAutoSave';
import { SaveStatusIndicator } from '@/components/ui/SaveStatusIndicator';
import { DraftManager } from '@/components/wizard/DraftManager';
import { ProgressIndicator, generateSteps, updateStepsWithErrors } from '@/components/wizard/ProgressIndicator';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ValidationErrorList } from '@/components/ui/ValidationErrorList';
import { parseError, getRecoveryStrategy, type AppError } from '@/lib/errors/ErrorRecoveryStrategy';
import { parseServerValidationErrors, type ValidationErrorResult } from '@/lib/errors/ValidationErrorParser';
import { handleSessionExpiry, wasSessionExpired, clearSessionExpiryFlags } from '@/lib/auth/SessionExpiryHandler';
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
import { ArrowLeft, ArrowRight, Home, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

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
  const [apiError, setApiError] = useState<AppError | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorResult | null>(null);

  // Auto-save hook - saves draft to localStorage automatically
  const { lastSaved, isSaving: isAutoSaving, error: autoSaveError } = useAutoSave(
    {
      action: store.action,
      propertyType: store.propertyType,
      title: store.title,
      description: store.description,
      pricing: store.pricing,
      propertyDetails: store.propertyDetails,
      location: store.location,
      media: store.media,
      badges: store.badges,
      basicInfo: store.basicInfo,
      additionalInfo: store.additionalInfo,
      currentStep: store.currentStep,
      completedSteps: store.completedSteps,
      mainMediaId: store.mainMediaId,
    },
    {
      storageKey: 'listing-wizard-storage',
      debounceMs: 2000,
      enabled: !isSubmitting && store.currentStep > 1, // Only auto-save after first step
      onError: (error) => {
        console.error('Auto-save error:', error);
        toast.error('Failed to auto-save draft');
      },
    }
  );

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

  // Check for session restoration after login
  useEffect(() => {
    if (wasSessionExpired()) {
      console.log('Session was expired, draft should be restored automatically');
      clearSessionExpiryFlags();
      
      // Show a toast to inform user their session was restored
      toast.success('Welcome back! Your draft has been restored.', {
        description: 'You can continue where you left off.',
      });
    }
  }, []);

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

  // Handle form submission with error recovery
  const handleSubmit = async () => {
    if (!store.validate()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setApiError(null);
    setValidationErrors(null);

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
        toast.success('Listing submitted for review successfully!');

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
        
        // Parse and handle review submission error
        const appError = parseError(reviewError, { 
          type: 'server',
          context: { operation: 'submitForReview' }
        });
        setApiError(appError);
        
        toast.error('Listing created but failed to submit for review.');
        // Keep as draft and stay on page
      }
    } catch (error: any) {
      console.error('Error submitting listing:', error);
      
      // Parse error and determine recovery strategy
      const appError = parseError(error, { 
        type: 'network',
        context: { operation: 'createListing' }
      });
      const strategy = getRecoveryStrategy(appError);
      
      // Check if this is a validation error
      if (appError.type === 'validation') {
        const validationResult = parseServerValidationErrors(error, 'listing');
        setValidationErrors(validationResult);
        
        // Show toast with summary
        toast.error('Please fix validation errors', {
          description: `${validationResult.fieldErrors.length + validationResult.generalErrors.length} error(s) found`,
        });
      } else {
        setApiError(appError);
        setSubmitError(appError.message);
        
        // Show appropriate toast based on error type
        if (appError.type === 'network') {
          toast.error('Connection lost. Your draft has been saved.', {
            description: 'You can retry when your connection is restored.',
          });
        } else if (appError.type === 'session') {
          // Handle session expiry with draft restoration
          handleSessionExpiry({
            onSessionExpired: () => {
              toast.error('Your session has expired. Please log in again.', {
                description: 'Your draft has been saved and will be restored after login.',
              });
            },
            onDraftSaved: () => {
              console.log('Draft saved before session expiry redirect');
            },
          });
        } else {
          toast.error(appError.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle retry for failed submissions
  const handleRetry = async () => {
    setRetryAttempt(prev => prev + 1);
    await handleSubmit();
  };

  // Clear API error
  const handleDismissError = () => {
    setApiError(null);
    setSubmitError(null);
  };

  // Handle validation error field click - navigate to step
  const handleValidationFieldClick = (field: string, step?: number) => {
    if (step !== undefined) {
      store.goToStep(step);
      setValidationErrors(null); // Clear errors after navigation
    }
  };

  // Clear validation errors
  const handleDismissValidationErrors = () => {
    setValidationErrors(null);
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

  // Generate steps for progress indicator with error highlighting
  const progressSteps = useMemo(() => {
    const steps = generateSteps(stepTitles, store.currentStep, store.completedSteps);
    
    // Add error counts if validation errors exist
    if (validationErrors && validationErrors.affectedSteps.length > 0) {
      const errorsByStep = new Map<number, number>();
      
      validationErrors.fieldErrors.forEach(error => {
        if (error.step !== undefined) {
          errorsByStep.set(error.step, (errorsByStep.get(error.step) || 0) + 1);
        }
      });
      
      return updateStepsWithErrors(steps, errorsByStep);
    }
    
    return steps;
  }, [stepTitles, store.currentStep, store.completedSteps, validationErrors]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      {/* Resume Draft Dialog */}
      <DraftManager
        open={showResumeDraftDialog}
        onOpenChange={setShowResumeDraftDialog}
        onResume={handleResumeDraft}
        onStartFresh={handleStartFresh}
        wizardType="listing"
        draftData={{
          currentStep: store.currentStep,
          totalSteps: 8,
          action: store.action,
          propertyType: store.propertyType,
          address: store.location?.address,
          lastModified: lastSaved || undefined,
        }}
      />

      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Create New Listing
              </h1>
              <p className="text-gray-600 text-lg">Follow the steps to create your property listing</p>
            </div>
            {/* Auto-save status indicator */}
            {store.currentStep > 1 && (
              <div className="absolute top-8 right-8">
                <SaveStatusIndicator
                  lastSaved={lastSaved}
                  isSaving={isAutoSaving}
                  error={autoSaveError}
                  variant="compact"
                />
              </div>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <ProgressIndicator
            steps={progressSteps}
            onStepClick={(stepNumber) => store.goToStep(stepNumber)}
          />
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

        {/* Validation Errors */}
        {validationErrors && (validationErrors.fieldErrors.length > 0 || validationErrors.generalErrors.length > 0) && (
          <div className="mt-4">
            <ValidationErrorList
              fieldErrors={validationErrors.fieldErrors}
              generalErrors={validationErrors.generalErrors}
              onFieldClick={handleValidationFieldClick}
              onDismiss={handleDismissValidationErrors}
            />
          </div>
        )}

        {/* Error Alert with Recovery */}
        {apiError && !validationErrors && (
          <div className="mt-4">
            <ErrorAlert
              type={apiError.type}
              message={apiError.message}
              retryable={apiError.isRecoverable}
              onRetry={handleRetry}
              onDismiss={handleDismissError}
              show={true}
            />
          </div>
        )}

        {/* Legacy Error Message (fallback) */}
        {submitError && !apiError && !validationErrors && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{submitError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingWizard;
