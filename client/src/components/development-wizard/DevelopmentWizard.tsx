// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

import {
  useDevelopmentWizard,
  DEVELOPMENT_WIZARD_STORAGE_KEY,
  PUBLISHER_DEVELOPMENT_WIZARD_STORAGE_KEY,
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
  buildDevelopmentEditProgressPayload,
  normalizeAmenitiesPayload,
} from '@/lib/developmentSubmitPayload';

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

const getDraftStateSignature = (snapshot: any) => {
  const { _savedAt: _ignoredSavedAt, ...canonicalState } = snapshot ?? {};
  return JSON.stringify(canonicalState);
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
  const currentDraftIdRef = useRef<number | undefined>(draftId);
  useEffect(() => {
    setCurrentDraftId(draftId);
    currentDraftIdRef.current = draftId;
  }, [draftId]);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [apiError, setApiError] = useState<AppError | null>(null);
  const [saveFailure, setSaveFailure] = useState<Error | null>(null);
  const [isManualSavingDraft, setIsManualSavingDraft] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isSavingBeforeExit, setIsSavingBeforeExit] = useState(false);

  const store = useDevelopmentWizard();
  const [persistReady, setPersistReady] = useState(() => {
    return useDevelopmentWizard.persist?.hasHydrated?.() ?? true;
  });

  const {
    currentPhase,
    setPhase,
    developmentType,
    developmentData,
    reset,
    hydrateDevelopment,
    initializeWorkflow,
    setWorkflowStep,
    setListingIdentity,
  } = store;

  // Local guard: prevent double-hydration (edit/draft/create)
  const [isHydrated, setIsHydrated] = useState(false);
  const [manualLastSavedAt, setManualLastSavedAt] = useState<Date | null>(null);
  const [persistedSaveSignature, setPersistedSaveSignature] = useState<string | null>(null);

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

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const { context: publisherContext } = usePublisherContext();
  const shouldUsePublisherApi = isSuperAdmin && !!publisherContext?.brandProfileId;
  const effectiveDraftBrandProfileId = publisherContext?.brandProfileId ?? brandProfileId;
  const persistStorageKey = shouldUsePublisherApi
    ? PUBLISHER_DEVELOPMENT_WIZARD_STORAGE_KEY
    : DEVELOPMENT_WIZARD_STORAGE_KEY;
  const persistKeyRef = useRef<string | null>(null);

  // --- Persistence and autosave preflight ---
  const saveDraftMutation = trpc.developer.saveDraft.useMutation();
  const updateDevelopmentMutation = trpc.developer.updateDevelopment.useMutation();
  const updatePublisherDevelopmentMutation = trpc.superAdminPublisher.updateDevelopment.useMutation();
  const draftPersistenceQueueRef = useRef<Promise<void>>(Promise.resolve());

  const liveCanonicalSnapshot = useDevelopmentWizard.getState().getDraftData();
  const liveCanonicalSignature = getDraftStateSignature(liveCanonicalSnapshot);
  const canonicalSnapshotRef = useRef(liveCanonicalSnapshot);
  const canonicalSignatureRef = useRef(liveCanonicalSignature);
  if (canonicalSignatureRef.current !== liveCanonicalSignature) {
    canonicalSnapshotRef.current = liveCanonicalSnapshot;
    canonicalSignatureRef.current = liveCanonicalSignature;
  }
  const canonicalSnapshotToWatch = canonicalSnapshotRef.current;
  const saveStateSignature = canonicalSignatureRef.current;

  const persistDraftSnapshot = useCallback(async (snapshot: any) => {
    const runPersistence = async () => {
      const existingDraftId = currentDraftIdRef.current;
      const result = await saveDraftMutation.mutateAsync({
        ...(existingDraftId ? { id: existingDraftId } : {}),
        ...(effectiveDraftBrandProfileId ? { brandProfileId: effectiveDraftBrandProfileId } : {}),
        draftData: snapshot,
      });

      if (result?.success === false) {
        throw new Error('Draft could not be persisted');
      }
      if (!existingDraftId && !result?.id) {
        throw new Error('Draft save did not return a persistent draft id');
      }

      if (result?.id) {
        currentDraftIdRef.current = result.id;
        setCurrentDraftId(result.id);
      }
    };

    const persistencePromise = draftPersistenceQueueRef.current.then(
      runPersistence,
      runPersistence,
    );
    draftPersistenceQueueRef.current = persistencePromise.catch(() => undefined);
    await persistencePromise;
  }, [effectiveDraftBrandProfileId, saveDraftMutation]);

  // Autosave remains deliberately disabled until the safety contract is fully proven.
  const autoSaveEnabled = false;
  const {
    lastSaved,
    isSaving,
    error: autoSaveError,
    saveNow,
    clearSaveStatus,
  } = useAutoSave(canonicalSnapshotToWatch, {
    debounceMs: 60000,
    enabled: autoSaveEnabled && isHydrated,
    shouldSkipSave: snapshot => persistedSaveSignature === getDraftStateSignature(snapshot),
    onSave: async snapshot => {
      setSaveFailure(null);
      setApiError(null);
      await persistDraftSnapshot(snapshot);
      setPersistedSaveSignature(getDraftStateSignature(snapshot));
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

  useEffect(() => {
    if (!shouldUsePublisherApi || !publisherContext?.brandProfileId) return;
    setListingIdentity({
      identityType: 'brand',
      developerBrandProfileId: publisherContext.brandProfileId,
    });
  }, [shouldUsePublisherApi, publisherContext?.brandProfileId, setListingIdentity]);

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
      brandProfileId: publisherContext?.brandProfileId ?? -1,
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

  // --- Error handling ---
  useEffect(() => {
    const err = loadError || draftError || autoSaveError || saveFailure;
    if (err) setApiError(parseError(err));
  }, [loadError, draftError, autoSaveError, saveFailure]);

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
      const stableWorkflowId = hydratedState.workflowId;
      const sourceStepId = hydratedState.currentStepId;
      const sourceCompletedSteps = Array.isArray(hydratedState.completedSteps)
        ? hydratedState.completedSteps
        : [];

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
    if (!isDraftMode) return;
    if (isEditMode) return;
    if (!loadedDraft?.draftData || isHydrated) return;

    hydrateDevelopment(loadedDraft.draftData);
    setIsHydrated(true);
    toast.success('Draft loaded successfully');
  }, [persistReady, isDraftMode, isEditMode, loadedDraft, isHydrated, hydrateDevelopment]);

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

  const handleManualSaveDraft = useCallback(async (): Promise<boolean> => {
    if (isManualSavingDraft) return false;
    setIsManualSavingDraft(true);
    clearSaveStatus();
    setSaveFailure(null);
    setApiError(null);
    try {
      const requestedSnapshot = useDevelopmentWizard.getState().getDraftData();
      await persistDraftSnapshot(requestedSnapshot);
      const savedAt = new Date();
      setManualLastSavedAt(savedAt);
      setPersistedSaveSignature(getDraftStateSignature(requestedSnapshot));
      toast.success('Draft saved');
      return true;
    } catch (error) {
      console.error('[DevelopmentWizard] Manual draft save failed:', error);
      setSaveFailure(error instanceof Error ? error : new Error('Failed to save draft'));
      toast.error('Failed to save draft');
      return false;
    } finally {
      setIsManualSavingDraft(false);
    }
  }, [
    isManualSavingDraft,
    clearSaveStatus,
    persistDraftSnapshot,
  ]);

  const handleSaveProgress = useCallback(async (): Promise<boolean> => {
    if (isSavingProgress) return false;

    const currentState = useDevelopmentWizard.getState();
    const editingId = currentState.editingId;
    if (!editingId) {
      toast.error('Save Progress is only available while editing an existing development.');
      return false;
    }

    const previousCanonicalSnapshot = currentState.getPersistedEditSnapshot();
    if (!previousCanonicalSnapshot) {
      toast.error('Reload this development before saving progress.');
      return false;
    }

    setIsSavingProgress(true);
    clearSaveStatus();
    setSaveFailure(null);
    setApiError(null);
    try {
      const canonicalSnapshot = currentState.getDraftData();
      const amenities =
        normalizeAmenitiesPayload(
          canonicalSnapshot.stepData?.amenities_features?.amenities ??
            canonicalSnapshot.developmentData?.amenities ??
            canonicalSnapshot.selectedAmenities,
        ) ?? [];
      const payload = buildDevelopmentEditProgressPayload(
        {
          canonicalSnapshot,
          amenities,
          residentialConfig: canonicalSnapshot.residentialConfig,
          landConfig: canonicalSnapshot.landConfig,
          commercialConfig: canonicalSnapshot.commercialConfig,
          mixedUseConfig: canonicalSnapshot.mixedUseConfig,
          specifications: canonicalSnapshot.specifications,
          fallbackOwnershipType: canonicalSnapshot.developmentData?.ownershipType,
        },
        { previousCanonicalSnapshot },
      );

      if (shouldUsePublisherApi) {
        const publisherBrandProfileId = publisherContext?.brandProfileId;
        if (typeof publisherBrandProfileId !== 'number') {
          throw new Error('Publisher brand context is required.');
        }

        const result = await updatePublisherDevelopmentMutation.mutateAsync({
          brandProfileId: publisherBrandProfileId,
          developmentId: editingId,
          data: {
            ...payload,
            brandProfileId: publisherBrandProfileId,
            developerBrandProfileId: publisherBrandProfileId,
            devOwnerType: 'platform',
          },
        });
        if (result?.success === false) {
          throw new Error('Development progress could not be persisted');
        }
      } else {
        const result = await updateDevelopmentMutation.mutateAsync({
          id: editingId,
          data: payload,
        });
        if (result?.success === false) {
          throw new Error('Development progress could not be persisted');
        }
      }

      useDevelopmentWizard.getState().markEditSnapshotPersisted();
      const savedAt = new Date();
      setManualLastSavedAt(savedAt);
      setPersistedSaveSignature(saveStateSignature);
      toast.success('Progress saved');
      return true;
    } catch (error) {
      console.error('[DevelopmentWizard] Save progress failed:', error);
      setSaveFailure(error instanceof Error ? error : new Error('Failed to save progress'));
      toast.error(error instanceof Error ? error.message : 'Failed to save progress');
      return false;
    } finally {
      setIsSavingProgress(false);
    }
  }, [
    isSavingProgress,
    clearSaveStatus,
    publisherContext?.brandProfileId,
    shouldUsePublisherApi,
    updateDevelopmentMutation,
    updatePublisherDevelopmentMutation,
    saveStateSignature,
  ]);

  const confirmExit = async () => {
    if (isSavingBeforeExit) return;

    setIsSavingBeforeExit(true);
    const didSave = isEditMode ? await handleSaveProgress() : await handleManualSaveDraft();

    if (!didSave) {
      setIsSavingBeforeExit(false);
      setShowExitDialog(true);
      return;
    }

    setShowExitDialog(false);
    reset();
    setLocation(isSuperAdmin ? '/admin/overview' : '/developer');
    setIsSavingBeforeExit(false);
  };

  const latestSavedAt =
    lastSaved && manualLastSavedAt
      ? lastSaved > manualLastSavedAt
        ? lastSaved
        : manualLastSavedAt
      : (lastSaved ?? manualLastSavedAt);

  const headerSaveStatus = isSaving || isManualSavingDraft || isSavingProgress
    ? 'saving'
    : autoSaveError || saveFailure
      ? 'error'
      : latestSavedAt && persistedSaveSignature === saveStateSignature
        ? 'saved'
        : 'unsaved';

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
        saveStatus={headerSaveStatus}
        lastSavedAt={latestSavedAt ?? undefined}
        onManualSaveDraft={handleManualSaveDraft}
        isManualSaveDraftPending={isManualSavingDraft}
        onSaveProgress={isEditMode ? handleSaveProgress : undefined}
        isSaveProgressPending={isSavingProgress}
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
          currentDraftIdRef.current = undefined;
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
            <AlertDialogDescription>
              {isEditMode
                ? 'Save your latest development changes before exiting.'
                : 'Save this development as a draft before exiting.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSavingBeforeExit}
              onClick={event => {
                event.preventDefault();
                void confirmExit();
              }}
            >
              {isSavingBeforeExit ? 'Saving...' : 'Save & Exit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
