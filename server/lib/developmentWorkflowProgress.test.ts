import { describe, expect, it } from 'vitest';
import {
  deriveCanonicalDraftMetadata,
  deriveDraftProgressMetadata,
  normalizeDevelopmentWorkflowState,
} from './developmentWorkflowProgress';

describe('deriveDraftProgressMetadata', () => {
  it('derives legacy draft progress from canonical currentStepId first', () => {
    expect(
      deriveDraftProgressMetadata({
        workflowId: 'residential_sale',
        currentStepId: 'unit_types',
        currentPhase: 2,
      }),
    ).toMatchObject({
      currentStep: 8,
      progress: 89,
      totalSteps: 9,
      source: 'workflowId',
    });
  });

  it('marks review_publish as the final canonical draft step', () => {
    expect(
      deriveDraftProgressMetadata({
        workflowId: 'residential_sale',
        currentStepId: 'review_publish',
        currentPhase: 2,
      }),
    ).toMatchObject({
      currentStep: 9,
      progress: 100,
      totalSteps: 9,
      source: 'workflowId',
    });
  });

  it('falls back to legacy phase metadata for older drafts without keyed workflow state', () => {
    expect(deriveDraftProgressMetadata({ currentPhase: 10 })).toMatchObject({
      currentStep: 10,
      progress: 91,
      totalSteps: 11,
      source: 'legacyPhase',
    });
  });

  it('exposes canonical draft metadata for response consumers', () => {
    expect(
      deriveCanonicalDraftMetadata({
        workflowId: 'residential_sale',
        currentStepId: 'review_publish',
        completedSteps: ['configuration', 'identity_market', 'unit_types'],
      }),
    ).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['configuration', 'identity_market', 'unit_types'],
      currentStep: 9,
      progress: 100,
      totalSteps: 9,
      stepLabel: 'Review & Publish',
      source: 'workflowId',
    });
  });

  it('normalizes workflow state before exposing canonical metadata', () => {
    expect(
      normalizeDevelopmentWorkflowState({
        workflowId: ' residential_sale ',
        currentStepId: 'legacy-phase-10',
        completedSteps: ['configuration', 'identity_market', 'configuration', 'bogus_step'],
      }),
    ).toEqual({
      workflowId: 'residential_sale',
      currentStepId: 'location',
      completedSteps: ['configuration', 'identity_market'],
    });

    expect(
      deriveCanonicalDraftMetadata({
        workflowId: ' residential_sale ',
        currentStepId: 'legacy-phase-10',
        completedSteps: ['configuration', 'identity_market', 'configuration', 'bogus_step'],
        currentPhase: 10,
      }),
    ).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'location',
      completedSteps: ['configuration', 'identity_market'],
      currentStep: 3,
      progress: 33,
      totalSteps: 9,
      source: 'workflowId',
    });
  });

  it('orders completed steps by the canonical workflow sequence', () => {
    expect(
      normalizeDevelopmentWorkflowState({
        workflowId: 'residential_sale',
        currentStepId: 'marketing_summary',
        completedSteps: [
          'unit_types',
          'identity_market',
          'configuration',
          'identity_market',
          'development_media',
        ],
      }),
    ).toMatchObject({
      workflowId: 'residential_sale',
      currentStepId: 'marketing_summary',
      completedSteps: ['configuration', 'identity_market', 'development_media', 'unit_types'],
    });
  });
});
