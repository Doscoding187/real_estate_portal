import { useState, useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useAutoSave } from '@/hooks/useAutoSave';
import { SaveStatusIndicator } from '@/components/ui/SaveStatusIndicator';
import { DraftManager } from '@/components/wizard/DraftManager';
import { ProgressIndicator, generateSteps } from '@/components/wizard/ProgressIndicator';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { parseError, type AppError } from '@/lib/errors/ErrorRecoveryStrategy';
import { handleSessionExpiry, wasSessionExpired, clearSessionExpiryFlags } from '@/lib/auth/SessionExpiryHandler';
import { Button } from '@/components/ui/button';
import { useLocation, useRoute } from 'wouter';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { trpc } from '@/lib/trpc';

// Import steps
import { DevelopmentTypeSelector } from './DevelopmentTypeSelector';
import { BasicDetailsStep } from './steps/BasicDetailsStep';
import { PhaseDetailsStep } from './steps/PhaseDetailsStep';
import { UnitTypesStepEnhanced } from './steps/UnitTypesStepEnhanced';
import { HighlightsStep } from './steps/HighlightsStep';
import { MediaUploadStep } from './steps/MediaUploadStep';
import { UnitMediaStep } from './steps/UnitMediaStep';
import { DeveloperInfoStep } from './steps/DeveloperInfoStep';
import { PreviewStep } from './steps/PreviewStep';

// Step titles for master development
const masterStepTitles = [
  'Choose Type',
  'Basic Details',
  'Unit Types',
  'Features',
  'Development Media',
  'Unit Media',
  'Contact Info',
  'Preview',
];

// Step titles for phase
const phaseStepTitles = [
  'Choose Type',
  'Phase Details',
  'Unit Types',
  'Features',
  'Development Media',
  'Unit Media',
  'Contact Info',
  'Preview',
];

export function DevelopmentWizard() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/developer/create-development');
  const urlParams = new URLSearchParams(window.location.search);
  const draftIdFromUrl = urlParams.get('draftId');
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(draftIdFromUrl ? parseInt(draftIdFromUrl) : undefined);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [wizardKey, setWizardKey] = useState(0); // Force re-render on reset
  const [apiError, setApiError] = useState<AppError | null>(null);
  const store = useDevelopmentWizard();
  const { currentStep, goToStep, nextStep, previousStep, reset } = store;

  // tRPC hooks for draft operations
  const { data: loadedDraft, isLoading: isDraftLoading } = trpc.developer.getDraft.useQuery(
    { id: currentDraftId! },
    { enabled: !!currentDraftId, retry: false }
  );
  const saveDraftMutation = trpc.developer.saveDraft.useMutation({
    onSuccess: (data) => {
      if (!currentDraftId) {
        setCurrentDraftId(data.id);
      }
    },
    onError: (error) => {
      console.error('Failed to save draft to database:', error);
    },
  });

  // Fetch developer profile to auto-populate developer info
  const { data: developerProfile } = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: user } = trpc.auth.me.useQuery();

  // Load draft from database if draftId is provided
  useEffect(() => {
    if (loadedDraft && loadedDraft.draftData) {
      const data = loadedDraft.draftData as any;
      console.log('[DevelopmentWizard] Loading draft from database:', data);
      
      // Populate store from loaded draft
      if (data.developmentName) store.setDevelopmentName(data.developmentName);
      if (data.address) store.setAddress(data.address);
      if (data.city) store.setCity(data.city);
      if (data.province) store.setProvince(data.province);
      if (data.suburb) store.setSuburb(data.suburb);
      if (data.postalCode) store.setPostalCode(data.postalCode);
      if (data.latitude !== undefined) store.setLatitude(data.latitude);
      if (data.longitude !== undefined) store.setLongitude(data.longitude);
      if (data.status) store.setStatus(data.status);
      // TODO: Implement proper unit types loading
      // if (data.unitTypes) store.setUnitTypes(data.unitTypes);
      if (data.description) store.setDescription(data.description);
      if (data.amenities) store.setAmenities(data.amenities);
      if (data.highlights) store.setHighlights(data.highlights);
      if (data.completionDate) store.setCompletionDate(data.completionDate);
      if (data.totalUnits !== undefined) store.setTotalUnits(data.totalUnits);
      // TODO: Implement proper media loading
      // if (data.media) store.setMedia(data.media);
      if (data.developerName) store.setDeveloperName(data.developerName);
      if (data.contactDetails) store.setContactDetails(data.contactDetails);
      // TODO: Implement proper step navigation
      // if (loadedDraft.currentStep !== undefined) store.setCurrentStep(loadedDraft.currentStep);

      toast.success('Draft loaded successfully', {
        description: 'Continue from where you left off',
      });
    }
  }, [loadedDraft]);

  // Auto-populate developer info from profile when component loads
  useEffect(() => {
    // Only populate if fields are empty (don't override existing draft data)
    if (developerProfile && !store.developerName && !store.contactDetails.email && !loadedDraft) {
      store.setDeveloperName(developerProfile.name || '');
      store.setContactDetails({
        name: store.contactDetails.name || '',
        email: developerProfile.email || user?.email || '',
        phone: developerProfile.phone || '',
        preferredContact: 'email',
      });
      
      if (developerProfile.logo) {
        store.setCompanyLogo(developerProfile.logo);
      }
    }
  }, [developerProfile, user, loadedDraft]);

  // Auto-save to database (in addition to localStorage via Zustand persist)
  // TEMPORARILY DISABLED - waiting for backend deployment
  // useEffect(() => {
  //   const saveToDatabaseTimer = setTimeout(() => {
  //     if (currentStep > 0 && !isDraftLoading) {
  //       const draftData = {
  //         developmentName: store.developmentName,
  //         address: store.address,
  //         city: store.city,
  //         province: store.province,
  //         suburb: store.suburb,
  //         postalCode: store.postalCode,
  //         latitude: store.latitude,
  //         longitude: store.longitude,
  //         status: store.status,
  //         unitTypes: store.unitTypes,
  //         description: store.description,
  //         amenities: store.amenities,
  //         highlights: store.highlights,
  //         completionDate: store.completionDate,
  //         totalUnits: store.totalUnits,
  //         media: store.media,
  //         developerName: store.developerName,
  //         contactDetails: store.contactDetails,
  //       };

  //       const progress = Math.round((currentStep / 6) * 100);

  //       saveDraftMutation.mutate({
  //         id: currentDraftId,
  //         draftData,
  //         progress,
  //         currentStep,
  //       });
  //     }
  //   }, 3000); // Auto-save every 3 seconds after changes

  //   return () => clearTimeout(saveToDatabaseTimer);
  // }, [
  //   currentStep,
  //   store.developmentName,
  //   store.address,
  //   store.city,
  //   store.unitTypes,
  //   store.description,
  //   store.media,
  // ]);

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

  const [isInitialized, setIsInitialized] = useState(false);

  // Check for draft on mount and show resume dialog (only if not loading from URL)
  useEffect(() => {
    // Don't show resume dialog if we're loading a draft from URL
    if (draftIdFromUrl) {
      setIsInitialized(true);
      return;
    }

    // Check if there's a draft with meaningful progress
    const hasDraft = 
      currentStep > 0 || 
      store.developmentName || 
      store.address ||
      store.unitTypes.length > 0 ||
      store.description ||
      store.media.length > 0;

    console.log('[DevelopmentWizard] Draft check:', {
      currentStep,
      developmentName: store.developmentName,
      address: store.address,
      unitTypes: store.unitTypes.length,
      description: store.description,
      media: store.media.length,
      hasDraft
    });

    if (hasDraft) {
      setShowResumeDraftDialog(true);
    }
    
    setIsInitialized(true);
  }, []); // Run only on mount

  // Handle resume draft decision
  const handleResumeDraft = () => {
    setShowResumeDraftDialog(false);
    // Keep existing state - user continues where they left off
  };

  const handleStartFresh = () => {
    setShowResumeDraftDialog(false);
    reset();
    setWizardKey(prev => prev + 1); // Force re-render
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    reset();
    setLocation('/');
  };

  // Handle API errors
  const handleApiError = (error: any, operation: string) => {
    const appError = parseError(error, {
      type: 'network',
      context: { operation }
    });
    setApiError(appError);

    // Show appropriate toast
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
  };

  // Clear API error
  const handleDismissError = () => {
    setApiError(null);
  };

  // Generate steps for progress indicator (convert 0-indexed to 1-indexed)
  // Use appropriate step titles based on development type
  const stepTitles = store.developmentType === 'master' ? masterStepTitles : phaseStepTitles;
  const progressSteps = generateSteps(
    stepTitles,
    currentStep + 1, // Convert to 1-indexed
    [] // Development wizard doesn't track completed steps separately
  );

  const handleTypeSelection = (type: 'master' | 'phase') => {
    store.setDevelopmentType(type);
    nextStep(); // Move to next step after selection
  };

  const renderStep = () => {
    // Step 0 is always the type selector
    if (currentStep === 0) {
      return (
        <DevelopmentTypeSelector
          onSelect={handleTypeSelection}
          initialSelection={store.developmentType}
        />
      );
    }

    // Conditional rendering based on development type
    const isMaster = store.developmentType === 'master';
    
    switch (currentStep) {
      case 1:
        // Show BasicDetailsStep for master, PhaseDetailsStep for phase
        return isMaster ? <BasicDetailsStep /> : <PhaseDetailsStep />;
      case 2:
        return <UnitTypesStepEnhanced />;
      case 3:
        return <HighlightsStep />;
      case 4:
        return <MediaUploadStep />;
      case 5:
        return <UnitMediaStep />;
      case 6:
        return <DeveloperInfoStep />;
      case 7:
        return <PreviewStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      {/* Resume Draft Dialog */}
      <DraftManager
        open={showResumeDraftDialog}
        onOpenChange={setShowResumeDraftDialog}
        onResume={handleResumeDraft}
        onStartFresh={handleStartFresh}
        wizardType="development"
        draftData={{
          currentStep: currentStep + 1, // Display as 1-indexed
          totalSteps: 6,
          developmentName: store.developmentName,
          address: store.address,
          lastModified: loadedDraft?.lastModified || undefined,
        }}
      />

      <div className="container mx-auto px-4 max-w-5xl">
        {!isInitialized ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : showResumeDraftDialog ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            {/* Content hidden while dialog is open */}
          </div>
        ) : (
          <>
            {/* Header */}
        <div className="mb-8 text-center relative">
          <Button 
            variant="ghost" 
            onClick={handleExit}
            className="absolute top-0 right-0 text-slate-500 hover:text-slate-700"
          >
            Exit
          </Button>
          {/* Auto-save status indicator */}
          {currentStep > 0 && (
            <div className="absolute top-0 left-0">
              <SaveStatusIndicator
                lastSaved={loadedDraft?.lastModified ? new Date(loadedDraft.lastModified) : null}
                isSaving={saveDraftMutation.isPending}
                error={saveDraftMutation.error ? new Error(saveDraftMutation.error.message) : null}
                variant="compact"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            List a Development
          </h1>
          <p className="text-gray-600 text-lg">Create a listing for your residential development</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <ProgressIndicator
            steps={progressSteps}
            onStepClick={(stepNumber) => goToStep(stepNumber - 1)} // Convert back to 0-indexed
          />
        </div>

        {/* Step Content */}
        <div
          key={wizardKey}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8"
        >
          {renderStep()}
        </div>

        {/* Navigation Buttons - Hidden on step 0 (type selection) */}
        {currentStep > 0 && (
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < stepTitles.length - 1 ? (
              <Button 
                onClick={nextStep} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg gap-2"
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
               // Submit button is inside PreviewStep
               null
            )}
          </div>
        )}

        {/* Error Alert with Recovery */}
        {apiError && (
          <div className="mt-4">
            <ErrorAlert
              type={apiError.type}
              message={apiError.message}
              retryable={apiError.isRecoverable}
              onDismiss={handleDismissError}
              show={true}
            />
          </div>
        )}
        </>
      )}
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Development Wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved as a draft. You can continue later from where you left off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
