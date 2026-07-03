import type {
  ListingWizardWorkflow,
  ListingWizardStep,
  ListingWorkflowData,
  ListingWorkflowId,
  ListingStepId,
} from '@shared/listing-workflow-types';
import { listingSaleWorkflow } from './listing-sale';
import { listingRentWorkflow } from './listing-rent';
import { listingAuctionWorkflow } from './listing-auction';

export const LISTING_WORKFLOWS: Record<ListingWorkflowId, ListingWizardWorkflow> = {
  listing_sell: listingSaleWorkflow,
  listing_rent: listingRentWorkflow,
  listing_auction: listingAuctionWorkflow,
};

function resolveWorkflowId(
  action?: string,
  _propertyType?: string,
): ListingWorkflowId | null {
  switch (action) {
    case 'sell':
      return 'listing_sell';
    case 'rent':
      return 'listing_rent';
    case 'auction':
      return 'listing_auction';
    default:
      return null;
  }
}

export function getListingWorkflow(
  data: Partial<ListingWorkflowData>,
): ListingWizardWorkflow | null {
  const workflowId = resolveWorkflowId(data.action, data.propertyType);
  if (!workflowId) return null;
  return LISTING_WORKFLOWS[workflowId] ?? null;
}

export function getVisibleListingSteps(
  workflow: ListingWizardWorkflow,
  data: ListingWorkflowData,
): ListingWizardStep[] {
  return workflow.steps.filter((step) => !step.shouldShow || step.shouldShow(data));
}

export function findListingStep(
  workflow: ListingWizardWorkflow,
  stepId: ListingStepId,
): ListingWizardStep | undefined {
  return workflow.steps.find((s) => s.id === stepId);
}

export function computeListingProgress(
  currentStepIndex: number,
  totalVisibleSteps: number,
): number {
  if (totalVisibleSteps === 0) return 0;
  return Math.round(((currentStepIndex + 1) / totalVisibleSteps) * 100);
}

export function validateListingStep(
  step: ListingWizardStep,
  data: ListingWorkflowData,
): { valid: boolean; errors?: { field: string; message: string }[] } {
  if (!step.validate) return { valid: true };
  return step.validate(data);
}

export { validateListingWorkflowStep } from './listingWorkflowValidation';
export { calculateSubmitReadinessDryRun } from './listingSubmitReadiness';
export type { SubmitReadinessResult } from './listingSubmitReadiness';
