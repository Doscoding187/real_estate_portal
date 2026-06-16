/**
 * Listing Wizard Workflow Types
 *
 * Type definitions for the workflow-driven listing wizard engine.
 * Follows the same architectural pattern as the development wizard.
 */

import type {
  ListingAction,
  PropertyType,
  ListingWizardState,
} from './listing-types';

// ─── Workflow Identity ───────────────────────────────────────────────

export type ListingWorkflowId =
  | 'listing_sell'
  | 'listing_rent'
  | 'listing_auction';

// ─── Step Identity ───────────────────────────────────────────────────

export type ListingStepId =
  | 'action'
  | 'property_type'
  | 'basic_information'
  | 'additional_information'
  | 'pricing'
  | 'location'
  | 'media_upload'
  | 'preview_publish';

// ─── Validation ──────────────────────────────────────────────────────

export interface ListingFieldError {
  field: string;
  message: string;
  step?: ListingStepId;
}

export interface ListingStepValidationResult {
  valid: boolean;
  errors?: ListingFieldError[];
}

// ─── Wizard Data (subset used for workflow resolution) ────────────────

export interface ListingWorkflowData {
  action?: ListingAction;
  propertyType?: PropertyType;
  [key: string]: any;
}

// ─── Step Definition ─────────────────────────────────────────────────

export interface ListingWizardStep {
  id: ListingStepId;
  title: string;
  description?: string;
  componentKey: string;
  required: boolean;
  /** Dynamic visibility — if omitted the step is always shown */
  shouldShow?: (data: ListingWorkflowData) => boolean;
  /** Step-level validation invoked before advancing */
  validate?: (data: ListingWorkflowData) => ListingStepValidationResult;
}

// ─── Workflow Definition ─────────────────────────────────────────────

export interface ListingWizardWorkflow {
  id: ListingWorkflowId;
  title: string;
  description?: string;
  steps: ListingWizardStep[];
}

// ─── Wizard Engine Props (shared between engine & orchestrator) ──────

export interface ListingWizardEngineProps {
  onExit?: () => void;
  onSaveDraft?: () => Promise<void> | void;
  isSavingDraft?: boolean;
  saveStatus?: 'saved' | 'saving' | 'error';
  lastSavedAt?: Date;
}

// ─── Step Component Registry Key ─────────────────────────────────────

export type ListingStepComponentKey =
  | 'ActionStep'
  | 'PropertyTypeStep'
  | 'BasicInformationStep'
  | 'AdditionalInformationStep'
  | 'PricingStep'
  | 'LocationStep'
  | 'MediaUploadStep'
  | 'PreviewStep';