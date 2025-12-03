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
import { useLocation } from 'wouter';
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
import { BasicDetailsStep } from './steps/BasicDetailsStep';
import { UnitTypesStep } from './steps/UnitTypesStep';
import { HighlightsStep } from './steps/HighlightsStep';
import { MediaUploadStep } from './steps/MediaUploadStep';
import { UnitMediaStep } from './steps/UnitMediaStep';
import { DeveloperInfoStep } from './steps/DeveloperInfoStep';
import { PreviewStep } from './steps/PreviewStep';

const stepTitles = [
  'Basic Details',
  'Unit Types',
  'Features',
  'Development Media',
  'Unit Media',
  'Contact Info',
  'Preview',
];

export function DevelopmentWizard() {
  const [, setLocation] = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [wizardKey, setWizardKey] = useState(0); // Force re-render on reset
  const [apiError, setApiError] = useState<AppError | null>(null);
  const store = useDevelopmentWizard();
  const { currentStep, goToStep, nextStep, previousStep, reset } = store;

  // Fetch developer profile to auto-populate developer info
  const { data: developerProfile } = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: user } = trpc.auth.me.useQuery();

  // Auto-populate developer info from profile when component loads
  useEffect(() => {
    // Only populate if fields are empty (don't override existing draft data)
    if (developerProfile && !store.developerName && !store.contactDetails.email) {
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
  }, [developerProfile, user]);

  // Auto-save hook - saves draft to localStorage automatically
  const { lastSaved, isSaving: isAutoSaving, error: autoSaveError } = useAutoSave(
    {
      developmentName: store.developmentName,
      address: store.address,
      city: store.city,
      province: store.province,
      suburb: store.suburb,
      postalCode: store.postalCode,
      latitude: store.latitude,
      longitude: store.longitude,
      status: store.status,
      unitTypes: store.unitTypes,
      description: store.description,
      amenities: store.amenities,
      highlights: store.highlights,
      completionDate: store.completionDate,
      totalUnits: store.totalUnits,
      media: store.media,
      developerName: store.developerName,
      contactDetails: store.contactDetails,
      currentStep: store.currentStep,
    },
    {
      storageKey: 'development-wizard-storage',
      debounceMs: 2000,
      enabled: currentStep > 0, // Only auto-save after first step
      onError: (error) => {
        console.error('Auto-save error:', error);
        toast.error('Failed to auto-save draft');
      },
    }
  );

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

  // Check for draft on mount and show resume dialog
  useEffect(() => {
    // Check if there's a draft (currentStep > 0 or has developmentName)
    const hasDraft = currentStep > 0 || store.developmentName;

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
  const progressSteps = generateSteps(
    stepTitles,
    currentStep + 1, // Convert to 1-indexed
    [] // Development wizard doesn't track completed steps separately
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicDetailsStep />;
      case 1:
        return <UnitTypesStep />;
      case 2:
        return <HighlightsStep />;
      case 3:
        return <MediaUploadStep />;
      case 4:
        return <UnitMediaStep />;
      case 5:
        return <DeveloperInfoStep />;
      case 6:
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
          lastModified: lastSaved || undefined,
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
                lastSaved={lastSaved}
                isSaving={isAutoSaving}
                error={autoSaveError}
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

        {/* Navigation Buttons */}
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
             // Submit button logic is inside PreviewStep, but we can have a placeholder or handle it here if needed.
             // For now, PreviewStep handles the submission, so we might hide the "Next" button or change it to "Submit" if we lift state up.
             // However, the original wizard had the submit button in the PreviewStep or as the final action.
             // In ListingWizard, the submit button is in the main component.
             // Let's keep it consistent with the previous DevelopmentWizard logic for now, 
             // but styled. The PreviewStep in DevelopmentWizard has its own submit button.
             // We can hide the main "Next" button on the last step.
             null
          )}
        </div>

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
