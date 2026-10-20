import { describe, expect, it } from 'vitest';
import {
  DISTRIBUTION_DEFAULT_REFERRAL_WORKFLOW_STEPS,
  createDefaultReferralWorkflowSteps,
  distributionReferralIntakeWorkflowStepSchema,
} from '../distributionReferralIntake';

describe('distribution referral intake workflow defaults', () => {
  it('provides schema-valid default steps with unique keys', () => {
    const steps = createDefaultReferralWorkflowSteps();

    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(new Set(steps.map(step => step.key)).size).toBe(steps.length);
    for (const step of steps) {
      expect(distributionReferralIntakeWorkflowStepSchema.safeParse(step).success).toBe(true);
    }
    expect(DISTRIBUTION_DEFAULT_REFERRAL_WORKFLOW_STEPS).toHaveLength(steps.length);
  });

  it('returns independent copies so edits do not mutate the template', () => {
    const first = createDefaultReferralWorkflowSteps();
    first[0]!.title = 'Changed by an administrator';

    const second = createDefaultReferralWorkflowSteps();

    expect(second[0]!.title).toBe(DISTRIBUTION_DEFAULT_REFERRAL_WORKFLOW_STEPS[0]!.title);
  });
});
