/**
 * Listing Workflows — Registry & Helpers
 *
 * Exports all listing workflow definitions and provides
 * helper functions for workflow resolution and step visibility.
 */

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

// ─── Workflow Registry ───────────────────────────────────────────────

export const LISTING_WORKFLOWS: Record<ListingWorkflowId, ListingWizardWorkflow> = {
  listing_sell: listingSaleWorkflow,
  listing_rent: listingRentWorkflow,
  listing_auction: listingAuctionWorkflow,
};

// ─── Workflow Resolution ─────────────────────────────────────────────

/**
 * Map (action, propertyType) → workflow id.
 * Returns null if no workflow matches (shouldn't happen in practice).
 */
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

/**
 * Get the workflow for the given wizard data.
 * If action is not yet selected, returns null (pre-workflow state).
 */
export function getListingWorkflow(
  data: Partial<ListingWorkflowData>,
): ListingWizardWorkflow | null {
  const workflowId = resolveWorkflowId(data.action, data.propertyType);
  if (!workflowId) return null;
  return LISTING_WORKFLOWS[workflowId] ?? null;
}

/**
 * Get only the steps that should be visible given the current wizard data.
 */
export function getVisibleListingSteps(
  workflow: ListingWizardWorkflow,
  data: ListingWorkflowData,
): ListingWizardStep[] {
  return workflow.steps.filter((step) => !step.shouldShow || step.shouldShow(data));
}

/**
 * Find a step by its ID across all workflows.
 */
export function findListingStep(
  workflow: ListingWizardWorkflow,
  stepId: ListingStepId,
): ListingWizardStep | undefined {
  return workflow.steps.find((s) => s.id === stepId);
}

/**
 * Compute progress percentage (0-100) for the current step index
 * within the visible steps list.
 */
export function computeListingProgress(
  currentStepIndex: number,
  totalVisibleSteps: number,
): number {
  if (totalVisibleSteps === 0) return 0;
  return Math.round(((currentStepIndex + 1) / totalVisibleSteps) * 100);
}

/**
 * Validate a single step using its built-in validate function.
 * Returns `{ valid: true }` if no validator is defined.
 */
export function validateListingStep(
  step: ListingWizardStep,
  data: ListingWorkflowData,
): { valid: boolean; errors?: { field: string; message: string }[] } {
  if (!step.validate) return { valid: true };
  return step.validate(data);
}