import React, { useState, useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
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
import { ReadinessIndicator } from '@/components/common/ReadinessIndicator';
import { calculateDevelopmentReadiness } from '@/lib/readiness';
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
import { DevelopmentTypePhase } from './phases/DevelopmentTypePhase';
import { RepresentationPhase } from './phases/RepresentationPhase';
import { ResidentialConfigPhase } from './phases/ResidentialConfigPhase';
import { LandConfigPhase } from './phases/LandConfigPhase';
import { CommercialConfigPhase } from './phases/CommercialConfigPhase';
import { MixedUseConfigPhase } from './phases/MixedUseConfigPhase';
import { IdentityPhase } from './phases/IdentityPhase';
import { LocationPhase } from './phases/LocationPhase';
import { EstateProfilePhase } from './phases/EstateProfilePhase';
import { AmenitiesPhase } from './phases/AmenitiesPhase';
import { MediaPhase } from './phases/MediaPhase';
import { ClassificationPhase } from './phases/ClassificationPhase';
import { OverviewPhase } from './phases/OverviewPhase';
import { UnitTypesPhase } from './phases/UnitTypesPhase';
import { FinalisationPhase } from './phases/FinalisationPhase';

// Phase Definitions (matches renderPhase cases)
const PHASES = [
  'Representation',     // 1
  'Development Type',   // 2
  'Configuration',      // 3
  'Basic Details',      // 4
  'Location',           // 5 (NEW)
  'Development Profile',     // 6 (was 5)
  'Amenities',          // 7 (was 6)
  'Overview',           // 8 (was 7)
  'Media',              // 9 (was 8)
  'Unit Types',         // 10 (was 9)
  'Publish'             // 11 (was 10)
];

interface DevelopmentWizardProps {
  developmentId?: number;
  isModal?: boolean;
}

export function DevelopmentWizard({ developmentId, isModal = false }: DevelopmentWizardProps) {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/developer/create-development');
  const urlParams = new URLSearchParams(window.location.search);
  const draftIdFromUrl = urlParams.get('draftId');
  const idFromUrl = urlParams.get('id');
  const brandProfileId = urlParams.get('brandProfileId') ? parseInt(urlParams.get('brandProfileId')!) : undefined;
  
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(draftIdFromUrl ? parseInt(draftIdFromUrl) : undefined);
  
  // Resolve development ID from props or URL
  const activeDevelopmentId = developmentId || (idFromUrl ? parseInt(idFromUrl) : undefined);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [apiError, setApiError] = useState<AppError | null>(null);
  const store = useDevelopmentWizard();
  const navigation = useWizardNavigation();
  
  // Destructure from store
  const { 
    currentPhase, setPhase, developmentType, developmentData, classification, overview, unitTypes, finalisation, 
    reset, saveDraft, hydrateDevelopment
  } = store;

  // Mutation for saving drafts
  const saveDraftMutation = trpc.developer.saveDraft.useMutation();

  // State to track if we've already hydrated to prevent overwriting user work
  const [isHydrated, setIsHydrated] = useState(false);

  // Auto-Save Configuration
  const stateToWatch = React.useMemo(() => ({
    currentPhase, developmentData, classification, overview, unitTypes, finalisation 
  }), [currentPhase, developmentData, classification, overview, unitTypes, finalisation]);

  // Calculate readiness
  const readiness = React.useMemo(() => {
    // Map store to listing object expected by readiness calculator
    const devCandidate = {
       name: developmentData.name,
       description: overview.description,
       address: developmentData.location?.address,
       latitude: developmentData.location?.latitude,
       longitude: developmentData.location?.longitude,
       images: developmentData.images || [], 
       priceFrom: unitTypes.priceFrom // Ensure this field exists in store or derived
    };
    return calculateDevelopmentReadiness(devCandidate);
  }, [developmentData, overview, unitTypes]);

  const { lastSaved, isSaving, error: autoSaveError, saveNow } = useAutoSave(stateToWatch, {
    debounceMs: 60000, // 1 Minute debounce for continuous typing
    onSave: async () => {
      // Trigger backend draft save
      await saveDraft(async (data) => {
        const result = await saveDraftMutation.mutateAsync({
          id: currentDraftId,
          brandProfileId: brandProfileId, // Pass brand context
          draftData: data
        });
        // If it was a new draft, update the ID
        if (result?.id && !currentDraftId) setCurrentDraftId(result.id);
      });
    }
  });

  // Save on phase transition (user-requested behavior)
  const prevPhaseRef = React.useRef(currentPhase);
  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase && prevPhaseRef.current !== 0) {
      // Phase changed - trigger immediate save
      saveNow();
    }
    prevPhaseRef.current = currentPhase;
  }, [currentPhase, saveNow]);

  // tRPC hooks for draft operations
  const { data: loadedDraft, isLoading: isDraftLoading, error: draftError } = trpc.developer.getDraft.useQuery(
    { id: currentDraftId! },
    { 
      enabled: !!currentDraftId && !activeDevelopmentId, 
      retry: false,
      // Critical: Prevent background refetches from overwriting local state
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false
    }
  );

  // tRPC hooks for Development Edit Mode
  const { data: editData, isLoading: isEditLoading, error: loadError } = trpc.developer.getDevelopment.useQuery(
    { id: activeDevelopmentId! },
    { 
      enabled: !!activeDevelopmentId, 
      retry: false,
      refetchOnWindowFocus: false 
    }
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
    if (editData && !isHydrated) {
        // Hydrate the store atomically
        hydrateDevelopment(editData);
        setIsHydrated(true);
        // EDIT MODE: Start at Publish step (9) so user can navigate back to edit sections
        setPhase(9);
        toast.success('Development loaded for editing. Navigate back to edit any section.');
    }
  }, [editData, isHydrated]);

  // Auto-load draft logic (Simplified for Phase 2)
  useEffect(() => {
    if (loadedDraft && loadedDraft.draftData && !isHydrated) {
       hydrateDevelopment(loadedDraft.draftData);
       setIsHydrated(true);
       toast.success('Draft loaded successfully');
    }
  }, [loadedDraft, isHydrated]);

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
    setLocation('/developer');
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
    if (activeDevelopmentId && isEditLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p>Loading development data...</p>
            </div>
        );
    }

    switch (currentPhase) {
      case 1: return <RepresentationPhase />;
      case 2: return <DevelopmentTypePhase />;
      case 3: 
        // Route to appropriate config phase based on development type
        if (developmentType === 'land') {
          return <LandConfigPhase />;
        } else if (developmentType === 'commercial') {
          return <CommercialConfigPhase />;
        } else if (developmentType === 'mixed_use') {
          return <MixedUseConfigPhase />;
        }
        // Default: Residential
        return <ResidentialConfigPhase />;
      case 4: return <IdentityPhase />;
      case 5: return <LocationPhase />;
      case 6: 
        // Conditional: Skip estate profile for Land/Commercial
        if (developmentType === 'land' || developmentType === 'commercial') {
          return <AmenitiesPhase />;
        }
        if (!navigation.shouldShowEstateProfile) {
          // Auto-advance to amenities (this will be called once, then navigation handles it)
          return <AmenitiesPhase />;
        }
        return <EstateProfilePhase />;
      case 7: return <AmenitiesPhase />;
      case 8: return <OverviewPhase />;
      case 9: return <MediaPhase />;
      case 10: return <UnitTypesPhase />; // Unit Types (Step 10 now)
      case 11: return <FinalisationPhase />; // Publish (Step 11 now)
      default: return <RepresentationPhase />;
    }
  };

  return (
    <div className={`${isModal ? '' : 'min-h-screen'} bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 py-6 md:py-10`}>
      <DraftManager
        open={showResumeDraftDialog}
        onOpenChange={setShowResumeDraftDialog}
        onResume={() => setShowResumeDraftDialog(false)}
        onStartFresh={() => { setShowResumeDraftDialog(false); reset(); }}
        wizardType="development"
        draftData={{
          currentStep: currentPhase,
          totalSteps: 10,
          developmentName: developmentData.name || '',
          address: developmentData.location?.address || '',
          lastModified: loadedDraft?.lastModified || undefined,
        }}
      />

      <div className="container mx-auto px-4 max-w-6xl">
        {/* Enhanced Header */}
        <div className="mb-6 md:mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-1 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full" />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  {PHASES[currentPhase - 1]}
                </h1>
                <p className="text-slate-600 text-sm md:text-base mt-1">
                  Step {currentPhase} of {PHASES.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <SaveStatusIndicator 
                lastSaved={lastSaved} 
                isSaving={isSaving} 
                error={autoSaveError} 
                variant="compact"
                className="glass border border-white/40 shadow-sm"
              />
              <Button 
                variant="ghost" 
                onClick={handleExit}
                className="text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all"
              >
                Exit
              </Button>
            </div>
          </div>
          
           {/* Readiness Indicator (Global) */}
            <div className="absolute top-8 right-8 flex items-center gap-4">
                 <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm">
                    <ReadinessIndicator score={readiness.score} missing={readiness.missing} size="md" />
                 </div>
            </div>

          {/* Enhanced Progress Indicator */}
          <div className="glass border border-white/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <ProgressIndicator
              steps={progressSteps}
              onStepClick={(stepNumber) => {
                if (stepNumber < currentPhase) setPhase(stepNumber);
              }} 
            />
          </div>
        </div>

        {/* Enhanced Phase Content */}
        <div className="glass border border-white/40 rounded-2xl shadow-lg p-6 md:p-8 lg:p-10 mb-8 min-h-[500px] animate-slide-up">
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
