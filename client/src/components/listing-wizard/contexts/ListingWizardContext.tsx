/**
 * ListingWizardContext
 *
 * Workflow-aware state management for the listing wizard.
 * Wraps the existing Zustand store with workflow resolution,
 * step visibility, validation, and navigation logic.
 *
 * Architecture mirrors the DevelopmentWizard's context pattern:
 *   Context provides → WizardEngine consumes → Step components read/write
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import {
  getListingWorkflow,
  getVisibleListingSteps,
  validateListingStep,
  computeListingProgress,
} from '@/lib/workflows/listing';
import type {
  ListingWizardWorkflow,
  ListingWizardStep,
  ListingWorkflowData,
  ListingFieldError,
  ListingStepId,
} from '@shared/listing-workflow-types';
import type { ListingAction, PropertyType } from '@shared/listing-types';

// ─── Context Shape ───────────────────────────────────────────────────

export interface ListingWizardContextValue {
  // Workflow
  workflow: ListingWizardWorkflow | null;
  workflowId: string | null;
  visibleSteps: ListingWizardStep[];
  currentStep: ListingWizardStep | null;
  currentStepIndex: number;
  progress: number;

  // Data accessor (flattened from store for easy consumption)
  data: ListingWorkflowData;

  // Navigation
  goNext: () => void;
  goBack: () => void;
  goToStep: (stepId: ListingStepId) => void;

  // Validation
  stepErrors: ListingFieldError[];
  allErrors: ListingFieldError[];
  isStepValid: boolean;
  validateCurrentStep: () => boolean;

  // Save state
  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
  lastSavedAt: Date | null;
  setSaveStatus: (status: 'saved' | 'saving' | 'error' | 'idle') => void;
  setLastSavedAt: (date: Date | null) => void;

  // Workflow initialization (called after action+type selected)
  initWorkflow: (action: ListingAction, propertyType: PropertyType) => void;

  // Metadata
  isPreWorkflow: boolean; // true when action/type not yet selected
  totalSteps: number;
  completedStepIds: ListingStepId[];
}

const ListingWizardContext = createContext<ListingWizardContextValue | null>(null);

// ─── Hook ────────────────────────────────────────────────────────────

export function useListingWizardContext(): ListingWizardContextValue {
  const ctx = useContext(ListingWizardContext);
  if (!ctx) {
    throw new Error('useListingWizardContext must be used within <ListingWizardProvider>');
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────

export interface ListingWizardProviderProps {
  children: ReactNode;
  /** Existing listing ID for edit mode */
  listingId?: number;
  /** Called when user clicks exit */
  onExit?: () => void;
}

export function ListingWizardProvider({
  children,
  listingId,
  onExit,
}: ListingWizardProviderProps) {
  const store = useListingWizardStore();

  // ── Workflow resolution ────────────────────────────────────────
  const workflow = useMemo(() => {
    return getListingWorkflow({
      action: store.action,
      propertyType: store.propertyType,
    });
  }, [store.action, store.propertyType]);

  const workflowId = workflow?.id ?? null;

  // ── Visible steps ──────────────────────────────────────────────
  const wizardData: ListingWorkflowData = useMemo(
    () => ({
      action: store.action,
      propertyType: store.propertyType,
      title: store.title,
      description: store.description,
      pricing: store.pricing,
      propertyDetails: store.propertyDetails,
      location: store.location,
      media: store.media,
      basicInfo: store.basicInfo,
      additionalInfo: store.additionalInfo,
    }),
    [
      store.action,
      store.propertyType,
      store.title,
      store.description,
      store.pricing,
      store.propertyDetails,
      store.location,
      store.media,
      store.basicInfo,
      store.additionalInfo,
    ],
  );

  const visibleSteps = useMemo(() => {
    if (!workflow) return [];
    return getVisibleListingSteps(workflow, wizardData);
  }, [workflow, wizardData]);

  // ── Map step ID → numeric index in the store ───────────────────
  const stepIdToNumber = useMemo(() => {
    const map: Record<ListingStepId, number> = {} as any;
    visibleSteps.forEach((step, idx) => {
      map[step.id] = idx + 1; // store uses 1-based numbering
    });
    return map;
  }, [visibleSteps]);

  const numberToStepId = useMemo(() => {
    const map: Record<number, ListingStepId> = {} as any;
    visibleSteps.forEach((step, idx) => {
      map[idx + 1] = step.id;
    });
    return map;
  }, [visibleSteps]);

  // ── Current step ───────────────────────────────────────────────
  const currentStepIndex = useMemo(() => {
    const storeNum = store.currentStep;
    const stepId = numberToStepId[storeNum];
    if (!stepId) return -1;
    return visibleSteps.findIndex((s) => s.id === stepId);
  }, [store.currentStep, visibleSteps, numberToStepId]);

  const currentStep = currentStepIndex >= 0 ? visibleSteps[currentStepIndex] : null;

  // ── Progress ───────────────────────────────────────────────────
  const progress = computeListingProgress(
    currentStepIndex >= 0 ? currentStepIndex : 0,
    visibleSteps.length,
  );

  // ── Step validation ────────────────────────────────────────────
  const [stepErrors, setStepErrors] = useState<ListingFieldError[]>([]);
  const [allErrors, setAllErrors] = useState<ListingFieldError[]>([]);

  const validateCurrentStep = useCallback((): boolean => {
    if (!currentStep) return true;
    const result = validateListingStep(currentStep, wizardData);
    const errors = result.errors ?? [];
    setStepErrors(errors);
    return result.valid;
  }, [currentStep, wizardData]);

  // Clear step errors when step changes
  useEffect(() => {
    setStepErrors([]);
  }, [store.currentStep]);

  // ── Navigation ─────────────────────────────────────────────────

  const goNext = useCallback(() => {
    // Validate current step before advancing
    if (!validateCurrentStep()) return;

    if (currentStepIndex < visibleSteps.length - 1) {
      store.nextStep();
    }
  }, [currentStepIndex, visibleSteps.length, validateCurrentStep, store]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      store.prevStep();
    }
  }, [currentStepIndex, store]);

  const goToStep = useCallback(
    (stepId: ListingStepId) => {
      const targetNumber = stepIdToNumber[stepId];
      if (targetNumber !== undefined) {
        store.goToStep(targetNumber);
      }
    },
    [stepIdToNumber, store],
  );

  // ── Workflow initialization ────────────────────────────────────

  const initWorkflow = useCallback(
    (action: ListingAction, propertyType: PropertyType) => {
      store.setAction(action);
      store.setPropertyType(propertyType);
    },
    [store],
  );

  // ── Save state ─────────────────────────────────────────────────

  const [saveStatus, setSaveStatusInternal] = useState<'saved' | 'saving' | 'error' | 'idle'>(
    'idle',
  );
  const [lastSavedAt, setLastSavedAtInternal] = useState<Date | null>(null);

  const setSaveStatus = useCallback((status: 'saved' | 'saving' | 'error' | 'idle') => {
    setSaveStatusInternal(status);
  }, []);

  const setLastSavedAt = useCallback((date: Date | null) => {
    setLastSavedAtInternal(date);
  }, []);

  // ── Completed steps ────────────────────────────────────────────

  const completedStepIds = useMemo((): ListingStepId[] => {
    return store.completedSteps
      .map((n) => numberToStepId[n])
      .filter((id): id is ListingStepId => !!id);
  }, [store.completedSteps, numberToStepId]);

  // ── Pre-workflow state ─────────────────────────────────────────

  const isPreWorkflow = !workflow;

  // ── Context value ──────────────────────────────────────────────

  const value: ListingWizardContextValue = useMemo(
    () => ({
      // Workflow
      workflow,
      workflowId,
      visibleSteps,
      currentStep,
      currentStepIndex,
      progress,

      // Data
      data: wizardData,

      // Navigation
      goNext,
      goBack,
      goToStep,

      // Validation
      stepErrors,
      allErrors,
      isStepValid: stepErrors.length === 0,
      validateCurrentStep,

      // Save
      saveStatus,
      lastSavedAt,
      setSaveStatus,
      setLastSavedAt,

      // Init
      initWorkflow,

      // Meta
      isPreWorkflow,
      totalSteps: visibleSteps.length,
      completedStepIds,
    }),
    [
      workflow,
      workflowId,
      visibleSteps,
      currentStep,
      currentStepIndex,
      progress,
      wizardData,
      goNext,
      goBack,
      goToStep,
      stepErrors,
      allErrors,
      validateCurrentStep,
      saveStatus,
      lastSavedAt,
      setSaveStatus,
      setLastSavedAt,
      initWorkflow,
      isPreWorkflow,
      visibleSteps.length,
      completedStepIds,
    ],
  );

  return (
    <ListingWizardContext.Provider value={value}>
      {children}
    </ListingWizardContext.Provider>
  );
}