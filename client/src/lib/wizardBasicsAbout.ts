/**
 * Pure rules for the wizard's "Basics" and "About" steps: the choices on
 * offer, how each answer is stored, and the text the live preview shows.
 * No React here so the rules are easy to test.
 *
 * STORAGE (no migration; every answer lands in something that already exists)
 *   Basics   stepData.configuration.setting     "standalone" | "gated" | "estate"
 *            stepData.configuration.estateType  one of ESTATE_TYPE_OPTIONS (estate only)
 *            residentialConfig.communityTypes   mapped by communityTypesForSetting()
 *   About    stepData.identity_market.status          launching-soon | selling | sold-out (DB enum)
 *            stepData.identity_market.salesStage      off_plan | ready (only with "selling")
 *            stepData.identity_market.phaseLabel      optional "Phase 2" (nature = phase | new)
 *            stepData.identity_market.launchDate / completionDate / expectedFirstHandoverDate
 *            stepData.identity_market.handoverDuringConstruction  "handed over in phases"
 *            stepData.identity_market.ownershipTypes  one value (see OWNERSHIP_OPTIONS)
 *            stepData.marketing_summary.tagline / description / keySellingPoints
 *   Submit   salesStage, phaseLabel, setting, estateType, handover timeline -> estateSpecs JSON,
 *            setting / estate type also as "cfg:" feature tags, dates -> existing columns.
 */

import type { CommunityType } from '@/types/wizardTypes';

// -----------------------------------------------------------------------------
// Basics
// -----------------------------------------------------------------------------

export type WizardSetting = 'standalone' | 'gated' | 'estate';

export const SETTING_OPTIONS: Array<{
  value: WizardSetting;
  label: string;
  description: string;
}> = [
  {
    value: 'standalone',
    label: 'Standalone',
    description: 'Homes on their own, with no shared gate or home owners’ association.',
  },
  {
    value: 'gated',
    label: 'Gated community',
    description: 'A development behind a shared gate, run by a body corporate or association.',
  },
  {
    value: 'estate',
    label: 'Security estate',
    description: 'A large estate with controlled access, 24-hour security and shared facilities.',
  },
];

export type EstateType =
  | 'standard'
  | 'lifestyle'
  | 'golf'
  | 'eco'
  | 'equestrian'
  | 'country'
  | 'nature'
  | 'coastal'
  | 'mountain';

export const DEFAULT_ESTATE_TYPE: EstateType = 'standard';

/** Standard security estate first: it is the default. */
export const ESTATE_TYPE_OPTIONS: Array<{
  value: EstateType;
  label: string;
  description: string;
}> = [
  {
    value: 'standard',
    label: 'Standard security estate',
    description:
      'Controlled access and 24-hour security. Homes and basic shared facilities, without a specific theme.',
  },
  {
    value: 'lifestyle',
    label: 'Lifestyle estate',
    description:
      'Built around shared facilities such as a clubhouse, pool, gym, courts and walking or running tracks.',
  },
  {
    value: 'golf',
    label: 'Golf estate',
    description: 'Homes on or beside a golf course, usually with a clubhouse and club membership.',
  },
  {
    value: 'eco',
    label: 'Eco estate',
    description:
      'Designed around the environment: protected land, indigenous planting and low-impact living.',
  },
  {
    value: 'equestrian',
    label: 'Equestrian estate',
    description: 'Horse-friendly living with stables, riding trails and paddocks.',
  },
  {
    value: 'country',
    label: 'Country estate',
    description: 'Larger stands and open space, in a quiet semi-rural setting.',
  },
  {
    value: 'nature',
    label: 'Nature or wildlife estate',
    description: 'Set in a nature reserve or game area, where wildlife shares the land.',
  },
  {
    value: 'coastal',
    label: 'Coastal estate',
    description: 'Close to the sea, a lagoon or the beach, with a relaxed holiday feel.',
  },
  {
    value: 'mountain',
    label: 'Mountain estate',
    description: 'On a mountain or hillside, with views and a cooler, quieter setting.',
  },
];

const ESTATE_COMMUNITY_TYPES: Record<EstateType, CommunityType> = {
  standard: 'security_estate_general',
  lifestyle: 'lifestyle_estate',
  golf: 'golf_estate',
  eco: 'eco_estate',
  equestrian: 'equestrian_estate',
  country: 'country_estate',
  nature: 'nature_estate',
  coastal: 'coastal_security_estate',
  mountain: 'mountain_estate',
};

/**
 * The old wizard saved a list of "community types" with the development
 * (they become "cfg:comm_type:*" feature tags). The new Basics answer is mapped
 * onto the same values so anything that reads them keeps working.
 */
export function communityTypesForSetting(
  setting: WizardSetting | null | undefined,
  estateType: EstateType | null | undefined,
): CommunityType[] {
  if (setting === 'standalone') return ['non_estate'];
  if (setting === 'gated') return ['housing_estate_non_security'];
  if (setting === 'estate') {
    return [ESTATE_COMMUNITY_TYPES[estateType ?? DEFAULT_ESTATE_TYPE] ?? 'security_estate_general'];
  }
  return [];
}

/** "Security estate" for a standard estate, otherwise the estate's full name. */
export function settingTagLabel(
  setting: string | null | undefined,
  estateType: string | null | undefined,
): string | null {
  if (setting === 'standalone') return 'Standalone';
  if (setting === 'gated') return 'Gated community';
  if (setting === 'estate') {
    if (!estateType || estateType === DEFAULT_ESTATE_TYPE) return 'Security estate';
    return ESTATE_TYPE_OPTIONS.find(option => option.value === estateType)?.label ?? 'Security estate';
  }
  return null;
}

// -----------------------------------------------------------------------------
// About
// -----------------------------------------------------------------------------

export type SalesChoice = 'launching' | 'off_plan' | 'ready' | 'sold_out';

export const SALES_STATUS_OPTIONS: Array<{
  value: SalesChoice;
  label: string;
  description: string;
}> = [
  {
    value: 'launching',
    label: 'Launching soon',
    description: 'Sales have not opened yet. You can say when they will.',
  },
  {
    value: 'off_plan',
    label: 'Selling – off-plan / under construction',
    description: 'Buyers can buy now; the homes are still being built.',
  },
  {
    value: 'ready',
    label: 'Selling – ready to move in',
    description: 'Finished homes that buyers can move into.',
  },
  {
    value: 'sold_out',
    label: 'Sold out',
    description: 'No homes are left to buy.',
  },
];

/** The database status (and, for "selling", the stage) each choice is saved as. */
export function salesChoicePatch(choice: SalesChoice): {
  status: 'launching-soon' | 'selling' | 'sold-out';
  salesStage: 'off_plan' | 'ready' | null;
} {
  switch (choice) {
    case 'launching':
      return { status: 'launching-soon', salesStage: null };
    case 'off_plan':
      return { status: 'selling', salesStage: 'off_plan' };
    case 'ready':
      return { status: 'selling', salesStage: 'ready' };
    default:
      return { status: 'sold-out', salesStage: null };
  }
}

/** Reads the choice back. A "selling" development saved before stages existed counts as off-plan. */
export function salesChoiceOf(data: {
  status?: unknown;
  salesStage?: unknown;
}): SalesChoice | null {
  switch (String(data.status ?? '')) {
    case 'launching-soon':
    case 'launching_soon':
      return 'launching';
    case 'selling':
    case 'now_selling':
      return data.salesStage === 'ready' ? 'ready' : 'off_plan';
    case 'ready_to_move_in':
      return 'ready';
    case 'sold-out':
    case 'sold_out':
      return 'sold_out';
    default:
      return null;
  }
}

export interface OwnershipOption {
  value: string;
  label: string;
}

/** Asked once, at development level. "varies" is then asked per house type. */
export const OWNERSHIP_OPTIONS: OwnershipOption[] = [
  { value: 'full-title', label: 'Full title' },
  { value: 'sectional-title', label: 'Sectional title' },
  { value: 'life-rights', label: 'Life rights' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'share-block', label: 'Share block' },
  { value: 'varies', label: 'Varies by house type' },
];

export function ownershipTagLabel(value: string | null | undefined): string | null {
  const key = String(value ?? '').trim();
  if (!key) return null;
  const normalized = key.toLowerCase().replace(/_/g, '-');
  if (normalized === 'freehold') return 'Full title';
  return OWNERSHIP_OPTIONS.find(option => option.value === normalized)?.label ?? null;
}

export const TAGLINE_MAX_LENGTH = 100;
export const DESCRIPTION_MIN_LENGTH = 50;
export const HIGHLIGHTS_MIN = 3;
export const HIGHLIGHTS_MAX = 8;
export const HIGHLIGHT_MAX_LENGTH = 24;

// -----------------------------------------------------------------------------
// Months. Dates are asked as month and year and saved as the 1st of that month.
// -----------------------------------------------------------------------------

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function asDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2027-03" for a month input, or "" when empty or invalid. */
export function toMonthInput(value: unknown): string {
  const date = asDate(value);
  if (!date) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "2027-03" -> "2027-03-01". Anything else (including empty) is null. */
export function fromMonthInput(value: string | null | undefined): string | null {
  const text = String(value ?? '').trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? `${text}-01` : null;
}

/** "Mar 2027", or "" when empty or invalid. */
export function formatMonthYear(value: unknown): string {
  const date = asDate(value);
  if (!date) return '';
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * The timeline line under the preview card. Only dates the wizard asked for
 * are shown, so every date a publisher enters appears publicly.
 */
export function buildTimelineLine(data: {
  status?: unknown;
  salesStage?: unknown;
  launchDate?: unknown;
  completionDate?: unknown;
  expectedFirstHandoverDate?: unknown;
  handoverDuringConstruction?: unknown;
}): string | null {
  const choice = salesChoiceOf(data);
  if (choice === 'launching') {
    const launch = formatMonthYear(data.launchDate);
    return launch ? `Launching ${launch}` : null;
  }
  if (choice !== 'off_plan') return null;

  const first = formatMonthYear(data.expectedFirstHandoverDate);
  const final = formatMonthYear(data.completionDate);
  if (data.handoverDuringConstruction === true) {
    if (first && final) return `First homes handed over from ${first} · final completion ${final}`;
    if (first) return `First homes handed over from ${first}`;
    if (final) return `Final completion ${final}`;
    return null;
  }
  return final ? `Expected completion ${final}` : null;
}

// -----------------------------------------------------------------------------
// What each step still needs. Used by the workflow definitions, so a publisher
// is only ever blocked on something the wizard actually asks.
// -----------------------------------------------------------------------------

export interface StepIssue {
  field: string;
  message: string;
}

export function validateAboutStep(data: Record<string, any>): StepIssue[] {
  const errors: StepIssue[] = [];

  if (!data.name || String(data.name).trim().length < 2) {
    errors.push({ field: 'name', message: 'Development name is required' });
  }
  if (!salesChoiceOf(data)) {
    errors.push({ field: 'status', message: 'Choose the sales status' });
  }
  if (
    salesChoiceOf(data) === 'off_plan' &&
    data.handoverDuringConstruction === true &&
    !data.expectedFirstHandoverDate
  ) {
    errors.push({
      field: 'expectedFirstHandoverDate',
      message: 'Say when the first homes are handed over',
    });
  }
  if (!Array.isArray(data.ownershipTypes) || data.ownershipTypes.length === 0) {
    errors.push({ field: 'ownershipTypes', message: 'Choose the ownership' });
  }
  if (String(data.description ?? '').trim().length < DESCRIPTION_MIN_LENGTH) {
    errors.push({
      field: 'description',
      message: `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters`,
    });
  }
  // Highlights are chosen at the end of the Amenities step (validateAmenitiesStep).
  return errors;
}
