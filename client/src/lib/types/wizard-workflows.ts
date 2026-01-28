import { DevelopmentType } from './wizardTypes';

export type WorkflowId = 'residential_sale' | 'residential_rent' | 'residential_auction';

export type WizardStepId =
  | 'development_type' // Step 1 (selector screen)
  | 'configuration' // Step 2
  | 'identity_market' // Step 3
  | 'location' // Step 4
  | 'governance_finances' // Step 5
  | 'amenities_features' // Step 6
  | 'marketing_summary' // Step 7
  | 'development_media' // Step 8
  | 'unit_types' // Step 9
  | 'review_publish'; // Step 10

export interface FieldError {
  field: string;
  message: string;
}

export interface WizardData {
  developmentType?: DevelopmentType;
  transactionType?: 'for_sale' | 'for_rent' | 'auction';
  name?: string;
  subtitle?: string;
  status?: import('../../../types/wizardTypes').DevelopmentStatus;
  marketingRole?: 'exclusive' | 'joint' | 'open';
  nature?: string;
  auctionType?: import('../../../types/wizardTypes').AuctionType;
  ownershipTypes?: import('../../../types/wizardTypes').OwnershipType[];
  propertyStructure?: string; // rent only (optional)
  latitude?: number;
  longitude?: number;
  heroImage?: string;
  unitTypes?: any[];
  description?: string;
  keySellingPoints?: string[];
  [key: string]: any; // Allow loose typing for now to support existing data structures
}

export interface WizardStep {
  id: WizardStepId;
  title: string;
  componentKey: string;
  required: boolean;
  shouldShow?: (data: WizardData) => boolean;
  validate?: (data: WizardData) => { valid: boolean; errors?: FieldError[] };
  description?: string;
}

export interface WizardWorkflow {
  id: WorkflowId;
  title: string;
  steps: WizardStep[];
}
