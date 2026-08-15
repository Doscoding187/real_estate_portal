// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

import {
  useDevelopmentWizard,
  DEVELOPMENT_WIZARD_STORAGE_KEY,
  PUBLISHER_DEVELOPMENT_WIZARD_STORAGE_KEY,
  persistManualDevelopmentDraft,
} from '@/hooks/useDevelopmentWizard';
import { useAutoSave } from '@/hooks/useAutoSave';
import { DraftManager } from '@/components/wizard/DraftManager';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { parseError, type AppError } from '@/lib/errors/ErrorRecoveryStrategy';
import { wasSessionExpired, clearSessionExpiryFlags } from '@/lib/auth/SessionExpiryHandler';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { getVisibleSteps, getWorkflow } from '@/lib/workflows';
import { usePublisherContext } from '@/hooks/usePublisherContext';

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
  const cataloguePublisherId = urlParams.get('cataloguePublisherId')
    ? parseInt(urlParams.get('cataloguePublisherId')!, 10)
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
  const utils = trpc.useUtils();

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
    setListingIdentity,
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
  const savePublisherDraftMutation = trpc.superAdminPublisher.saveDraft.useMutation();

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

  const {
    lastSaved,
    isSaving,
    error: autoSaveError,
    saveNow,
  } = useAutoSave(stateToWatch, {
    debounceMs: 60000,
    enabled: false, // TODO: re-enable when backend is stable
    onSave: async () => {
      await saveDraft(async data => {
        const result = shouldUsePublisherApi
          ? await savePublisherDraftMutation.mutateAsync({
              ...(currentDraftId ? { id: currentDraftId } : {}),
              cataloguePublisherId: publisherContext.cataloguePublisherId,
              draftData: data,
            })
          : await saveDraftMutation.mutateAsync({
              ...(currentDraftId ? { id: currentDraftId } : {}),
              ...(cataloguePublisherId ? { cataloguePublisherId } : {}),
              draftData: data,
            });
        if (result?.id && !currentDraftId) setCurrentDraftId(result.id);
      });
    },
  });

  const handleManualSaveDraft = useCallback(async () => {
    try {
      setApiError(null);
      const result = await persistManualDevelopmentDraft({
        saveDraft,
        mutateDraft: input =>
          shouldUsePublisherApi
            ? savePublisherDraftMutation.mutateAsync({
                ...input,
                cataloguePublisherId: publisherContext.cataloguePublisherId,
              })
            : saveDraftMutation.mutateAsync(input),
        currentDraftId,
        cataloguePublisherId: shouldUsePublisherApi
          ? publisherContext.cataloguePublisherId
          : cataloguePublisherId,
        setCurrentDraftId,
      });

      if (shouldUsePublisherApi) {
        await Promise.all([
          utils.superAdminPublisher.getDrafts.invalidate({
            cataloguePublisherId: publisherContext.cataloguePublisherId,
          }),
          result.id
            ? utils.superAdminPublisher.getDraft.invalidate({
                cataloguePublisherId: publisherContext.cataloguePublisherId,
                id: result.id,
              })
            : Promise.resolve(),
        ]);
      } else {
        await Promise.all([
          utils.developer.getDrafts.invalidate(),
          result.id ? utils.developer.getDraft.invalidate({ id: result.id }) : Promise.resolve(),
        ]);
      }

      toast.success('Draft saved');
    } catch (error) {
      const parsed = parseError(error);
      setApiError(parsed);
      toast.error('Unable to save draft', {
        description: parsed.message,
      });
      throw error;
    }
  }, [
    cataloguePublisherId,
    currentDraftId,
    publisherContext?.cataloguePublisherId,
    saveDraft,
    saveDraftMutation,
    savePublisherDraftMutation,
    shouldUsePublisherApi,
    utils,
  ]);

  // Save on phase transition (only after hydration)
  const prevPhaseRef = useRef(currentPhase);
  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase && prevPhaseRef.current !== 0) {
      if (isHydrated) saveNow();
    }
    prevPhaseRef.current = currentPhase;
  }, [currentPhase, saveNow, isHydrated]);

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const { context: publisherContext } = usePublisherContext();
  const shouldUsePublisherApi = isSuperAdmin && !!publisherContext?.cataloguePublisherId;
  const persistStorageKey = shouldUsePublisherApi
    ? PUBLISHER_DEVELOPMENT_WIZARD_STORAGE_KEY
    : DEVELOPMENT_WIZARD_STORAGE_KEY;
  const persistKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldUsePublisherApi || !publisherContext?.cataloguePublisherId) return;
    setListingIdentity({
      identityType: 'brand',
      cataloguePublisherId: publisherContext.cataloguePublisherId,
    });
  }, [shouldUsePublisherApi, publisherContext?.cataloguePublisherId, setListingIdentity]);

  // Isolate persisted wizard state between publisher-emulator and real-developer flows.
  useEffect(() => {
    const persistApi = useDevelopmentWizard.persist;
    if (!persistApi?.setOptions || !persistApi?.rehydrate) return;
    if (persistKeyRef.current === persistStorageKey) return;

    persistKeyRef.current = persistStorageKey;
    setPersistReady(false);
    setIsHydrated(false);
    reset();
    persistApi.setOptions({ name: persistStorageKey });

    Promise.resolve(persistApi.rehydrate())
      .catch(() => {
        // Keep a clean in-memory state if rehydration fails.
      })
      .finally(() => {
        setPersistReady(true);
      });
  }, [persistStorageKey, reset]);

  // --- Queries ---
  const {
    data: loadedDraft,
    isLoading: isDraftLoading,
    error: draftError,
  } = trpc.developer.getDraft.useQuery(
    { id: currentDraftId! },
    {
      enabled: !!currentDraftId && !isEditMode && !shouldUsePublisherApi,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );

  const {
    data: loadedPublisherDraft,
    error: publisherDraftError,
  } = trpc.superAdminPublisher.getDraft.useQuery(
    {
      cataloguePublisherId: publisherContext?.cataloguePublisherId ?? -1,
      id: currentDraftId ?? -1,
    },
    {
      enabled: !!currentDraftId && !isEditMode && shouldUsePublisherApi,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );

  const {
    data: developerEditData,
    isLoading: isDeveloperEditLoading,
    error: developerLoadError,
  } = trpc.developer.getDevelopment.useQuery(
    { id: editId! },
    {
      enabled: !!editId && !shouldUsePublisherApi,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const {
    data: publisherEditData,
    isLoading: isPublisherEditLoading,
    error: publisherLoadError,
  } = trpc.superAdminPublisher.getDevelopmentById.useQuery(
    {
      cataloguePublisherId: publisherContext?.cataloguePublisherId ?? -1,
      developmentId: editId ?? -1,
    },
    {
      enabled: !!editId && shouldUsePublisherApi,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const editData = shouldUsePublisherApi ? publisherEditData : developerEditData;
  const isEditLoading = shouldUsePublisherApi ? isPublisherEditLoading : isDeveloperEditLoading;
  const loadError = shouldUsePublisherApi ? publisherLoadError : developerLoadError;
  const activeLoadedDraft = shouldUsePublisherApi ? loadedPublisherDraft : loadedDraft;
  const activeDraftError = shouldUsePublisherApi ? publisherDraftError : draftError;

  // --- Error handling ---
  useEffect(() => {
    const err = loadError || activeDraftError || autoSaveError;
    if (err) setApiError(parseError(err));
  }, [loadError, activeDraftError, autoSaveError]);

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
      const hydratedState = useDevelopmentWizard.getState();
      const sourceStepId =
        typeof editData.currentStepId === 'string' && editData.currentStepId.trim()
          ? editData.currentStepId
          : null;
      const sourceCompletedSteps = Array.isArray(editData.completedSteps)
        ? editData.completedSteps
        : [];
      const stableWorkflowId = hydratedState.workflowId;

      if (!stableWorkflowId) {
        initializeWorkflow(devType, txType);
      }

      const wizardData = useDevelopmentWizard.getState().getWizardData();
      const workflow = getWorkflow(wizardData);
      const visibleSteps = workflow ? getVisibleSteps(workflow, wizardData) : [];

      const preferredStepId =
        sourceStepId && visibleSteps.some(step => step.id === sourceStepId)
          ? sourceStepId
          : (visibleSteps.find(step => !sourceCompletedSteps.includes(step.id))?.id ??
            visibleSteps[0]?.id);

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

  // If edit mode cannot load data, force a clean state to avoid stale persisted wizard bleed-through.
  useEffect(() => {
    if (!persistReady || !isEditMode || isHydrated) return;
    if (isEditLoading) return;
    if (editData) return;

    reset();
    setIsHydrated(true);
    toast.error('Unable to load development for editing.');
  }, [persistReady, isEditMode, isHydrated, isEditLoading, editData, reset]);

  // --- Draft hydration (gated by persist rehydrate; never in edit mode) ---
  useEffect(() => {
    if (!persistReady) return;
    if (isEditMode) return;
    if (!activeLoadedDraft?.draftData || isHydrated) return;

    hydrateDevelopment(activeLoadedDraft.draftData);
    setIsHydrated(true);
    toast.success('Draft loaded successfully');
  }, [persistReady, isEditMode, activeLoadedDraft, isHydrated, hydrateDevelopment]);

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

  const confirmExit = async () => {
    try {
      if (isHydrated) await saveNow();
    } finally {
      reset();
      setLocation(shouldUsePublisherApi ? '/admin/publisher' : isSuperAdmin ? '/admin/overview' : '/developer');
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
        onSaveDraft={handleManualSaveDraft}
        isSavingDraft={saveDraftMutation.isPending || savePublisherDraftMutation.isPending}
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
          lastModified: activeLoadedDraft?.lastModified || undefined,
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
