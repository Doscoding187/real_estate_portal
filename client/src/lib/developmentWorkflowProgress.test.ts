import { describe, expect, it } from 'vitest';

import { resolveDevelopmentDraftProgressDisplay } from './developmentWorkflowProgress';

describe('resolveDevelopmentDraftProgressDisplay', () => {
  it('prefers canonical draftMeta progress and step label', () => {
    expect(
      resolveDevelopmentDraftProgressDisplay({
        progress: 10,
        currentStep: 1,
        draftMeta: {
          currentStepId: 'review_publish',
          progress: 100,
        },
      }),
    ).toMatchObject({
      currentStepId: 'review_publish',
      currentStep: 9,
      progress: 100,
      totalSteps: 9,
      stepLabel: 'Review & Publish',
      source: 'workflowId',
    });
  });

  it('derives canonical progress from nested draftData when draftMeta is missing', () => {
    expect(
      resolveDevelopmentDraftProgressDisplay({
        progress: 17,
        currentStep: 1,
        draftData: {
          workflowId: 'residential_sale',
          currentStepId: 'unit_types',
        },
      }),
    ).toMatchObject({
      currentStepId: 'unit_types',
      currentStep: 8,
      progress: 89,
      totalSteps: 9,
      stepLabel: 'Unit Types',
      source: 'workflowId',
    });
  });

  it('normalizes malformed keyed draft state before display', () => {
    expect(
      resolveDevelopmentDraftProgressDisplay({
        progress: 17,
        currentStep: 1,
        draftData: {
          workflowId: ' residential_sale ',
          currentStepId: 'phase-10',
          completedSteps: ['configuration', 'identity_market', 'configuration', 'not_real'],
        },
      }),
    ).toMatchObject({
      currentStepId: 'location',
      currentStep: 3,
      progress: 33,
      totalSteps: 9,
      stepLabel: 'Location',
      source: 'workflowId',
    });
  });

  it('falls back to legacy numeric progress only for drafts without keyed workflow state', () => {
    expect(
      resolveDevelopmentDraftProgressDisplay({
        currentPhase: 10,
      }),
    ).toMatchObject({
      currentStepId: null,
      currentStep: 10,
      progress: 91,
      totalSteps: 11,
      stepLabel: 'Step 10',
      source: 'legacyPhase',
    });
  });
});
