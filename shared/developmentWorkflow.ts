export const DEVELOPMENT_WORKFLOW_STEPS = [
  'configuration',
  'identity_market',
  'location',
  'governance_finances',
  'amenities_features',
  'marketing_summary',
  'development_media',
  'unit_types',
  'review_publish',
] as const;

export type DevelopmentWorkflowStepId = (typeof DEVELOPMENT_WORKFLOW_STEPS)[number];

export const DEVELOPMENT_WORKFLOW_STEP_LABELS: Record<DevelopmentWorkflowStepId, string> = {
  configuration: 'Configuration',
  identity_market: 'Identity & Market',
  location: 'Location',
  governance_finances: 'Governance & Finances',
  amenities_features: 'Amenities & Features',
  marketing_summary: 'Marketing Summary',
  development_media: 'Media',
  unit_types: 'Unit Types',
  review_publish: 'Review & Publish',
};

const LEGACY_TOTAL_PHASES = 11;

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function isDevelopmentWorkflowStepId(value: unknown): value is DevelopmentWorkflowStepId {
  return (
    typeof value === 'string' &&
    DEVELOPMENT_WORKFLOW_STEPS.includes(value.trim() as DevelopmentWorkflowStepId)
  );
}

export function normalizeDevelopmentCompletedSteps(value: unknown): DevelopmentWorkflowStepId[] {
  if (!Array.isArray(value)) return [];
  const incomingSteps = new Set(
    value
      .map((step: unknown) => (typeof step === 'string' ? step.trim() : ''))
      .filter(isDevelopmentWorkflowStepId),
  );

  return DEVELOPMENT_WORKFLOW_STEPS.filter(step => incomingSteps.has(step));
}

export function normalizeDevelopmentWorkflowState(draft: Record<string, any>) {
  const workflowId =
    typeof draft?.workflowId === 'string' && draft.workflowId.trim() ? draft.workflowId.trim() : null;
  const completedSteps = normalizeDevelopmentCompletedSteps(draft?.completedSteps);
  const incomingCurrentStepId =
    typeof draft?.currentStepId === 'string' && draft.currentStepId.trim()
      ? draft.currentStepId.trim()
      : null;
  const currentStepId = isDevelopmentWorkflowStepId(incomingCurrentStepId)
    ? incomingCurrentStepId
    : workflowId || completedSteps.length > 0
      ? DEVELOPMENT_WORKFLOW_STEPS.find(step => !completedSteps.includes(step)) ?? 'review_publish'
      : null;

  return {
    workflowId,
    currentStepId,
    completedSteps,
  };
}

export function deriveDraftProgressMetadata(draft: Record<string, any>) {
  const { currentStepId } = normalizeDevelopmentWorkflowState(draft);
  const stepIndex = isDevelopmentWorkflowStepId(currentStepId)
    ? DEVELOPMENT_WORKFLOW_STEPS.indexOf(currentStepId)
    : -1;

  if (stepIndex >= 0) {
    const currentStep = stepIndex + 1;
    return {
      currentStep,
      progress: Math.min(
        100,
        Math.max(0, Math.round((currentStep / DEVELOPMENT_WORKFLOW_STEPS.length) * 100)),
      ),
      totalSteps: DEVELOPMENT_WORKFLOW_STEPS.length,
      source: 'workflowId' as const,
    };
  }

  const legacyStep = clampInt(draft?.currentPhase ?? draft?.currentStep, 0, LEGACY_TOTAL_PHASES, 0);
  return {
    currentStep: legacyStep,
    progress: Math.min(100, Math.max(0, Math.round((legacyStep / LEGACY_TOTAL_PHASES) * 100))),
    totalSteps: LEGACY_TOTAL_PHASES,
    source: 'legacyPhase' as const,
  };
}

export function deriveCanonicalDraftMetadata(draft: Record<string, any>) {
  const progressMetadata = deriveDraftProgressMetadata(draft);
  const { workflowId, currentStepId, completedSteps } = normalizeDevelopmentWorkflowState(draft);
  const stepLabel = isDevelopmentWorkflowStepId(currentStepId)
    ? DEVELOPMENT_WORKFLOW_STEP_LABELS[currentStepId]
    : progressMetadata.source === 'legacyPhase'
      ? `Step ${progressMetadata.currentStep}`
      : null;

  return {
    workflowId,
    currentStepId,
    completedSteps,
    currentStep: progressMetadata.currentStep,
    progress: progressMetadata.progress,
    totalSteps: progressMetadata.totalSteps,
    stepLabel,
    source: progressMetadata.source,
  };
}
