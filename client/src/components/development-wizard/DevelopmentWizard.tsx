import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
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

// Import Phases
import { IdentityPhase } from './phases/IdentityPhase';
import { ClassificationPhase } from './phases/ClassificationPhase';
import { OverviewPhase } from './phases/OverviewPhase';
import { UnitTypesPhase } from './phases/UnitTypesPhase';
import { FinalisationPhase } from './phases/FinalisationPhase';

// Phase Definitions
const PHASES = [
  'Identity',
  'Classification',
  'Overview',
  'Unit Types',
  'Finalisation'
];

interface DevelopmentWizardProps {
  developmentId?: number;
}

export function DevelopmentWizard({ developmentId }: DevelopmentWizardProps) {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/developer/create-development');
  const urlParams = new URLSearchParams(window.location.search);
  const draftIdFromUrl = urlParams.get('draftId');
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(draftIdFromUrl ? parseInt(draftIdFromUrl) : undefined);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [apiError, setApiError] = useState<AppError | null>(null);
  const store = useDevelopmentWizard();
  
  // Destructure from store
  const { 
    currentPhase, setPhase, developmentData, classification, overview, unitTypes, finalisation, 
    reset, saveDraft, hydrateDevelopment
  } = store;

  // Mutation for saving drafts
  const saveDraftMutation = trpc.developer.saveDraft.useMutation();

  // Auto-Save Configuration
  const stateToWatch = { currentPhase, developmentData, classification, overview, unitTypes, finalisation };
  const { lastSaved, isSaving, error: autoSaveError } = useAutoSave(stateToWatch, {
    debounceMs: 2000,
    onSave: async () => {
      // Trigger backend draft save
      await saveDraft(async (data) => {
        const result = await saveDraftMutation.mutateAsync({
          id: currentDraftId,
          draftData: data
        });
        // If it was a new draft, update the ID
        if (result?.id && !currentDraftId) setCurrentDraftId(result.id);
      });
    }
  });

  // tRPC hooks for draft operations
  const { data: loadedDraft, isLoading: isDraftLoading, error: draftError } = trpc.developer.getDraft.useQuery(
    { id: currentDraftId! },
    { enabled: !!currentDraftId && !developmentId, retry: false }
  );

  // tRPC hooks for Development Edit Mode
  const { data: editData, isLoading: isEditLoading, error: loadError } = trpc.developer.getDevelopment.useQuery(
    { id: developmentId! },
    { enabled: !!developmentId, retry: false }
  );

  // Handle API Errors
  useEffect(() => {
    const error = loadError || draftError || autoSaveError;
    if (error) {
      setApiError(parseError(error));
    }
  }, [loadError, draftError, autoSaveError]);

  // Hydrate from existing development (Edit Mode)
  useEffect(() => {
    if (editData) {
        // Hydrate the store atomically
        hydrateDevelopment(editData);
        toast.success('Development loaded for editing');
    }
  }, [editData]);

  // Auto-load draft logic (Simplified for Phase 2)
  useEffect(() => {
    if (loadedDraft && loadedDraft.draftData) {
       hydrateDevelopment(loadedDraft.draftData);
       toast.success('Draft loaded successfully');
    }
  }, [loadedDraft]);

  // Session recovery
  useEffect(() => {
    if (wasSessionExpired()) {
      clearSessionExpiryFlags();
      toast.success('Session restored');
    }
  }, []);

  const handleExit = () => setShowExitDialog(true);
  const confirmExit = () => {
    reset();
    setLocation('/');
  };

  // Generate Progress Steps
  // Note: progressSteps expects 1-based index but arrays are 0-based
  const progressSteps = generateSteps(
    PHASES,
    currentPhase,
    [], // TODO: Track completed phases
    []
  );

  // Render Current Phase
  const renderPhase = () => {
    // Show loading state if hydrating
    if (developmentId && isEditLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p>Loading development data...</p>
            </div>
        );
    }

    switch (currentPhase) {
      case 1: return <IdentityPhase />;
      case 2: return <ClassificationPhase />;
      case 3: return <OverviewPhase />;
      case 4: return <UnitTypesPhase />;
      case 5: return <FinalisationPhase />;
      default: return <IdentityPhase />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      <DraftManager
        open={showResumeDraftDialog}
        onOpenChange={setShowResumeDraftDialog}
        onResume={() => setShowResumeDraftDialog(false)}
        onStartFresh={() => { setShowResumeDraftDialog(false); reset(); }}
        wizardType="development"
        draftData={{
          currentStep: currentPhase,
          totalSteps: 5,
          developmentName: developmentData.name || '',
          address: developmentData.location?.address || '',
          lastModified: loadedDraft?.lastModified || undefined,
        }}
      />

      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center relative">
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <SaveStatusIndicator 
              lastSaved={lastSaved} 
              isSaving={isSaving} 
              error={autoSaveError} 
              variant="compact"
              className="bg-white/50 backdrop-blur-sm border-white/20"
            />
            <Button 
              variant="ghost" 
              onClick={handleExit}
              className="text-slate-500 hover:text-slate-700 hover:bg-white/50"
            >
              Exit
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
             {PHASES[currentPhase - 1]}
          </h1>
          <p className="text-gray-600 text-lg">Phase {currentPhase} of 5</p>
        </div>

        {/* Phase Indicator */}
        <div className="mb-8">
          <ProgressIndicator
            steps={progressSteps}
            onStepClick={(stepNumber) => {
               // Allow navigation back to completed phases
               if (stepNumber < currentPhase) setPhase(stepNumber);
            }} 
          />
        </div>

        {/* Phase Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8 min-h-[400px]">
          {renderPhase()}
        </div>

        {/* Error Alert */}
        {apiError && (
          <div className="mt-4">
            <ErrorAlert
              type={apiError.type}
              message={apiError.message}
              retryable={apiError.isRecoverable}
              onDismiss={() => setApiError(null)}
              show={true}
            />
          </div>
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Development Wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved as a draft.
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
