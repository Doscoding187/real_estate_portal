import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useAutoSave } from '@/hooks/useAutoSave';
import { DraftManager } from '@/components/wizard/DraftManager';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { parseError, type AppError } from '@/lib/errors/ErrorRecoveryStrategy';
import { wasSessionExpired, clearSessionExpiryFlags } from '@/lib/auth/SessionExpiryHandler';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { getVisibleSteps, getWorkflow } from '@/lib/workflows';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { WizardEngine } from '../wizard/WizardEngine';

interface DevelopmentWizardProps {
  isModal?: boolean;
}

const parseNumericParam = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function DevelopmentWizard({ isModal = false }: DevelopmentWizardProps) {
  const [, setLocation] = useLocation();

  // --- URL params (source of truth for mode) ---
  const urlParams = new URLSearchParams(window.location.search);
  const draftIdFromUrl = urlParams.get('draftId');
  const idFromUrl = urlParams.get('id');
  const brandProfileId = urlParams.get('brandProfileId')
    ? parseInt(urlParams.get('brandProfileId')!, 10)
    : undefined;

  const editId = parseNumericParam(idFromUrl);
  const draftId = parseNumericParam(draftIdFromUrl);

  const isEditMode = editId != null;
  const isDraftMode = draftId != null;

  // Keep draftId in state because new drafts get an ID after save
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(draftId);
  useEffect(() => {
    setCurrentDraftId(draftId);
  }, [draftId]);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [apiError, setApiError] = useState<AppError | null>(null);

  const store = useDevelopmentWizard();
  const [persistReady, setPersistReady] = useState(() => {
    return useDevelopmentWizard.persist?.hasHydrated?.() ?? true;
  });

  const {
    currentPhase,
    setPhase,
    developmentType,
    developmentData,
    classification,
    overview,
    unitTypes,
    finalisation,
    reset,
    saveDraft,
    hydrateDevelopment,
    initializeWorkflow,
    setWorkflowStep,
  } = store;

  // Local guard: prevent double-hydration (edit/draft/create)
  const [isHydrated, setIsHydrated] = useState(false);

  // --- Create mode: wait for persist rehydrate, then hard reset ---
  useEffect(() => {
    const persistApi = useDevelopmentWizard.persist;
    if (!persistApi?.onFinishHydration) {
      setPersistReady(true);
      return;
    }

    if (persistApi.hasHydrated()) setPersistReady(true);

    const unsub = persistApi.onFinishHydration(() => setPersistReady(true));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!persistReady) return;
    if (!isEditMode && !isDraftMode) {
      reset();
      setIsHydrated(true);
    }
  }, [persistReady, isEditMode, isDraftMode, reset]);

  // --- Autosave (currently disabled in your code) ---
  const saveDraftMutation = trpc.developer.saveDraft.useMutation();

  const stateToWatch = useMemo(
    () => ({
      currentPhase,
      developmentData,
      classification,
      overview,
      unitTypes,
      finalisation,
    }),
    [currentPhase, developmentData, classification, overview, unitTypes, finalisation],
  );

  const { lastSaved, isSaving, error: autoSaveError, saveNow } = useAutoSave(stateToWatch, {
    debounceMs: 60000,
    enabled: false, // TODO: re-enable when backend is stable
    onSave: async () => {
      await saveDraft(async data => {
        const result = await saveDraftMutation.mutateAsync({
          ...(currentDraftId ? { id: currentDraftId } : {}),
          ...(brandProfileId ? { brandProfileId } : {}),
          draftData: data,
        });
        if (result?.id && !currentDraftId) setCurrentDraftId(result.id);
      });
    },
  });

  // Save on phase transition (only after hydration)
  const prevPhaseRef = useRef(currentPhase);
  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase && prevPhaseRef.current !== 0) {
      if (isHydrated) saveNow();
    }
    prevPhaseRef.current = currentPhase;
  }, [currentPhase, saveNow, isHydrated]);

  // --- Queries ---
  const {
    data: loadedDraft,
    isLoading: isDraftLoading,
    error: draftError,
  } = trpc.developer.getDraft.useQuery(
    { id: currentDraftId! },
    {
      enabled: !!currentDraftId && !isEditMode,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );

  const {
    data: editData,
    isLoading: isEditLoading,
    error: loadError,
  } = trpc.developer.getDevelopment.useQuery(
    { id: editId! },
    {
      enabled: !!editId,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  // --- Error handling ---
  useEffect(() => {
    const err = loadError || draftError || autoSaveError;
    if (err) setApiError(parseError(err));
  }, [loadError, draftError, autoSaveError]);

  // --- Edit hydration (gated by persist rehydrate) ---
  useEffect(() => {
    if (!persistReady) return;
    if (!isEditMode) return;
    if (!editData || isHydrated) return;

    hydrateDevelopment(editData);

    const devType = editData.developmentType === 'mixed_use' ? 'mixed' : editData.developmentType;
    const txType =
      editData.transactionType ?? editData.developmentData?.transactionType ?? 'for_sale';

    if (devType && txType) {
      initializeWorkflow(devType, txType);

      const wizardData = useDevelopmentWizard.getState().getWizardData();
      const workflow = getWorkflow(wizardData);
      const visibleSteps = workflow ? getVisibleSteps(workflow, wizardData) : [];

      const preferredStepId =
        wizardData.currentStepId ??
        visibleSteps.find(step => !wizardData.completedSteps?.includes(step.id))?.id ??
        visibleSteps[0]?.id;

      if (preferredStepId) setWorkflowStep(preferredStepId);
    }

    setIsHydrated(true);
    toast.success('Development loaded for editing.');
  }, [
    persistReady,
    isEditMode,
    editData,
    isHydrated,
    hydrateDevelopment,
    initializeWorkflow,
    setWorkflowStep,
  ]);

  // --- Draft hydration (gated by persist rehydrate; never in edit mode) ---
  useEffect(() => {
    if (!persistReady) return;
    if (isEditMode) return;
    if (!loadedDraft?.draftData || isHydrated) return;

    hydrateDevelopment(loadedDraft.draftData);
    setIsHydrated(true);
    toast.success('Draft loaded successfully');
  }, [persistReady, isEditMode, loadedDraft, isHydrated, hydrateDevelopment]);

  // --- Legacy phase skip ---
  useEffect(() => {
    if (currentPhase !== 6) return;
    const shouldSkip = developmentType === 'land' || developmentType === 'commercial';
    if (shouldSkip) setPhase(7);
  }, [currentPhase, developmentType, setPhase]);

  // --- Session recovery ---
  useEffect(() => {
    if (wasSessionExpired()) {
      clearSessionExpiryFlags();
      toast.success('Session restored');
    }
  }, []);

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const confirmExit = async () => {
    try {
      if (isHydrated) await saveNow();
    } finally {
      reset();
      setLocation(isSuperAdmin ? '/admin/overview' : '/developer');
    }
  };

  const renderPhase = () => {
    if (isEditMode && isEditLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p>Loading development data...</p>
        </div>
      );
    }

    // Optional: avoid any flash before persist is ready
    if (!persistReady) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p>Preparing wizard...</p>
        </div>
      );
    }

    return (
      <WizardEngine
        onExit={() => setShowExitDialog(true)}
        saveStatus={isSaving ? 'saving' : autoSaveError ? 'error' : 'saved'}
        lastSavedAt={lastSaved}
      />
    );
  };

  return (
    <>
      <DraftManager
        open={showResumeDraftDialog}
        onOpenChange={setShowResumeDraftDialog}
        onResume={() => setShowResumeDraftDialog(false)}
        onStartFresh={() => {
          setShowResumeDraftDialog(false);
          setCurrentDraftId(undefined);
          reset();
          window.history.replaceState({}, '', window.location.pathname);
        }}
        wizardType="development"
        draftData={{
          currentStep: currentPhase,
          totalSteps: 1,
          developmentName: developmentData.name || '',
          address: developmentData.location?.address || '',
          lastModified: loadedDraft?.lastModified || undefined,
        }}
      />

      {renderPhase()}

      {apiError && (
        <div className="fixed bottom-4 right-4 z-50">
          <ErrorAlert
            type={apiError.type}
            message={apiError.message}
            retryable={apiError.isRecoverable}
            onDismiss={() => setApiError(null)}
            show={true}
          />
        </div>
      )}

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Development Wizard?</AlertDialogTitle>
            <AlertDialogDescription>Your progress will be saved as a draft.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
