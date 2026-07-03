import type {
  ListingAction,
  PropertyType,
  ListingWizardState,
} from './listing-types';

export type ListingWorkflowId =
  | 'listing_sell'
  | 'listing_rent'
  | 'listing_auction';

export type ListingStepId =
  | 'action'
  | 'property_type'
  | 'basic_information'
  | 'additional_information'
  | 'pricing'
  | 'location'
  | 'media_upload'
  | 'preview_publish';

export interface ListingFieldError {
  field: string;
  message: string;
  step?: ListingStepId;
}

export interface ListingStepValidationResult {
  valid: boolean;
  errors?: ListingFieldError[];
}

export interface ListingWorkflowData {
  action?: ListingAction;
  propertyType?: PropertyType;
  [key: string]: any;
}

export interface ListingWizardStep {
  id: ListingStepId;
  title: string;
  description?: string;
  componentKey: string;
  required: boolean;
  shouldShow?: (data: ListingWorkflowData) => boolean;
  validate?: (data: ListingWorkflowData) => ListingStepValidationResult;
}

export interface ListingWizardWorkflow {
  id: ListingWorkflowId;
  title: string;
  description?: string;
  steps: ListingWizardStep[];
}

export type ListingStepComponentKey =
  | 'ActionStep'
  | 'PropertyTypeStep'
  | 'BasicInformationStep'
  | 'AdditionalInformationStep'
  | 'PricingStep'
  | 'LocationStep'
  | 'MediaUploadStep'
  | 'PreviewStep';
