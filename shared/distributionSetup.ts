export const DISTRIBUTION_SETUP_STATE_VALUES = [
  'not_in_program',
  'added_draft_setup',
  'config_required',
  'submit_ready_live',
] as const;

export type DistributionSetupState = (typeof DISTRIBUTION_SETUP_STATE_VALUES)[number];

export const DISTRIBUTION_SETUP_ITEM_KEYS = [
  'added',
  'commission',
  'tier_policy',
  'primary_manager',
  'sales_pack',
  'submission_checklist',
] as const;

export type DistributionSetupItemKey = (typeof DISTRIBUTION_SETUP_ITEM_KEYS)[number];

export type DistributionSetupActor = 'admin' | 'developer' | 'either' | 'none';

export type DistributionSetupProgressItem = {
  key: DistributionSetupItemKey;
  label: string;
  done: boolean;
  actor: DistributionSetupActor;
};

export type DistributionSetupSnapshot = {
  setupState: DistributionSetupState;
  setupLabel: string;
  readyToGoLive: boolean;
  progressPercent: number;
  items: DistributionSetupProgressItem[];
  missing: Array<DistributionSetupProgressItem['key']>;
  salesPackDocumentCount: number;
  submissionChecklistRequiredCount: number;
};

