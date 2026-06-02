import {
  DEVELOPMENT_WORKFLOW_STEPS,
  DEVELOPMENT_WORKFLOW_STEP_LABELS,
  normalizeDevelopmentWorkflowState,
} from '../../../shared/developmentWorkflow';

const LEGACY_TOTAL_PHASES = 11;

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampProgress(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function getCanonicalWorkflowState(draft: Record<string, any>) {
  const candidates = [draft?.draftMeta, draft?.draftData, draft];

  for (const candidate of candidates) {
    const state = normalizeDevelopmentWorkflowState(candidate ?? {});
    if (state.currentStepId) return state;
  }

  return normalizeDevelopmentWorkflowState({});
}

export function resolveDevelopmentDraftProgressDisplay(draft: Record<string, any>) {
  const { currentStepId } = getCanonicalWorkflowState(draft);
  const stepIndex = currentStepId ? DEVELOPMENT_WORKFLOW_STEPS.indexOf(currentStepId) : -1;
  const metaProgress = clampProgress(draft?.draftMeta?.progress);

  if (currentStepId && stepIndex >= 0) {
    const currentStep = stepIndex + 1;
    return {
      currentStepId,
      currentStep,
      progress:
        metaProgress ??
        Math.min(100, Math.round((currentStep / DEVELOPMENT_WORKFLOW_STEPS.length) * 100)),
      totalSteps: DEVELOPMENT_WORKFLOW_STEPS.length,
      stepLabel: DEVELOPMENT_WORKFLOW_STEP_LABELS[currentStepId],
      source: 'workflowId' as const,
    };
  }

  const legacyProgress = clampProgress(draft?.progress);
  const legacyStep = clampInt(draft?.currentPhase ?? draft?.currentStep, 0, LEGACY_TOTAL_PHASES, 0);
  return {
    currentStepId: null,
    currentStep: legacyStep,
    progress:
      legacyProgress ??
      Math.min(100, Math.max(0, Math.round((legacyStep / LEGACY_TOTAL_PHASES) * 100))),
    totalSteps: LEGACY_TOTAL_PHASES,
    stepLabel: legacyStep > 0 ? `Step ${legacyStep}` : null,
    source: 'legacyPhase' as const,
  };
}
