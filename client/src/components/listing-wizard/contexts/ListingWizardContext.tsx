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
  validateListingWorkflowStep,
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

export interface ListingWizardContextValue {
  workflow: ListingWizardWorkflow | null;
  workflowId: string | null;
  visibleSteps: ListingWizardStep[];
  currentStep: ListingWizardStep | null;
  currentStepIndex: number;
  progress: number;

  data: ListingWorkflowData;

  goNext: () => void;
  goBack: () => void;
  goToStep: (stepId: ListingStepId) => void;

  stepErrors: ListingFieldError[];
  allErrors: ListingFieldError[];
  isStepValid: boolean;
  validateCurrentStep: () => boolean;
  isValidating: boolean;

  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
  lastSavedAt: Date | null;
  setSaveStatus: (status: 'saved' | 'saving' | 'error' | 'idle') => void;
  setLastSavedAt: (date: Date | null) => void;

  initWorkflow: (action: ListingAction, propertyType: PropertyType) => void;

  isPreWorkflow: boolean;
  totalSteps: number;
  completedStepIds: ListingStepId[];
}

const ListingWizardContext = createContext<ListingWizardContextValue | null>(null);

export function useListingWizardContext(): ListingWizardContextValue {
  const ctx = useContext(ListingWizardContext);
  if (!ctx) {
    throw new Error('useListingWizardContext must be used within <ListingWizardProvider>');
  }
  return ctx;
}

export interface ListingWizardProviderProps {
  children: ReactNode;
  listingId?: number;
  onExit?: () => void;
}

export function ListingWizardProvider({
  children,
}: ListingWizardProviderProps) {
  const store = useListingWizardStore();

  const workflow = useMemo(() => {
    return getListingWorkflow({
      action: store.action,
      propertyType: store.propertyType,
    });
  }, [store.action, store.propertyType]);

  const workflowId = workflow?.id ?? null;

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
      mainMediaId: store.mainMediaId,
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
      store.mainMediaId,
    ],
  );

  const visibleSteps = useMemo(() => {
    if (!workflow) return [];
    return getVisibleListingSteps(workflow, wizardData);
  }, [workflow, wizardData]);

  const stepIdToNumber = useMemo(() => {
    const map: Record<ListingStepId, number> = {} as any;
    visibleSteps.forEach((step, idx) => {
      map[step.id] = idx + 1;
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

  const currentStepIndex = useMemo(() => {
    const storeNum = store.currentStep;
    const stepId = numberToStepId[storeNum];
    if (!stepId) return -1;
    return visibleSteps.findIndex((s) => s.id === stepId);
  }, [store.currentStep, visibleSteps, numberToStepId]);

  const currentStep = currentStepIndex >= 0 ? visibleSteps[currentStepIndex] : null;

  const progress = computeListingProgress(
    currentStepIndex >= 0 ? currentStepIndex : 0,
    visibleSteps.length,
  );

  // FUTURE PARITY: Validation rules in workflow configs are simplified stubs.
  // Replace with full rules from client/src/lib/validation/listingValidationRules.ts (355 lines)
  // and wire into the ValidationEngine (402 lines) for composable, per-field validation.
  const [stepErrors, setStepErrors] = useState<ListingFieldError[]>([]);
  const [allErrors, setAllErrors] = useState<ListingFieldError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  // Guard against stale async validation resolving after navigation
  const currentStepIdRef = useRef<ListingStepId | null>(null);

  // Keep ref in sync
  currentStepIdRef.current = currentStep?.id ?? null;

  const validateCurrentStep = useCallback((): boolean => {
    if (!currentStep) return true;
    const result = validateListingStep(currentStep, wizardData);
    const errors = result.errors ?? [];
    setStepErrors(errors);
    return result.valid;
  }, [currentStep, wizardData]);

  const validateCurrentStepAsync = useCallback(async (): Promise<boolean> => {
    if (!currentStep) return true;

    // Validate the step ID we started validating
    const stepIdAtCall = currentStep.id;

    const result = await validateListingWorkflowStep(stepIdAtCall, wizardData);
    // Discard stale results if the user navigated away during async validation
    if (currentStepIdRef.current !== stepIdAtCall) {
      return true;
    }
    setStepErrors(result.errors);
    return result.valid;
  }, [currentStep, wizardData]);

  useEffect(() => {
    setStepErrors([]);
  }, [store.currentStep]);

  const goNext = useCallback(async () => {
    setIsValidating(true);
    try {
      const valid = await validateCurrentStepAsync();

      if (!valid) return;

      if (currentStepIndex < visibleSteps.length - 1) {
        store.nextStep();
      }
    } finally {
      setIsValidating(false);
    }
  }, [currentStepIndex, visibleSteps.length, validateCurrentStepAsync, store]);

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

  const initWorkflow = useCallback(
    (action: ListingAction, propertyType: PropertyType) => {
      store.setAction(action);
      store.setPropertyType(propertyType);
    },
    [store],
  );

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

  const completedStepIds = useMemo((): ListingStepId[] => {
    return store.completedSteps
      .map((n) => numberToStepId[n])
      .filter((id): id is ListingStepId => !!id);
  }, [store.completedSteps, numberToStepId]);

  const isPreWorkflow = !workflow;

  const value: ListingWizardContextValue = useMemo(
    () => ({
      workflow,
      workflowId,
      visibleSteps,
      currentStep,
      currentStepIndex,
      progress,
      data: wizardData,
      goNext,
      goBack,
      goToStep,
      stepErrors,
      allErrors,
      isStepValid: stepErrors.length === 0,
      validateCurrentStep,
      isValidating,
      saveStatus,
      lastSavedAt,
      setSaveStatus,
      setLastSavedAt,
      initWorkflow,
      isPreWorkflow,
      totalSteps: visibleSteps.length,
      completedStepIds,
    }),
    [
      workflow, workflowId, visibleSteps, currentStep, currentStepIndex, progress,
      wizardData, goNext, goBack, goToStep, stepErrors, allErrors, validateCurrentStep,
      isValidating, saveStatus, lastSavedAt, setSaveStatus, setLastSavedAt, initWorkflow,
      isPreWorkflow, visibleSteps.length, completedStepIds,
    ],
  );

  return (
    <ListingWizardContext.Provider value={value}>
      {children}
    </ListingWizardContext.Provider>
  );
}
