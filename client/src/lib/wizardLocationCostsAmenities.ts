/**
 * Pure rules for the wizard's "Location", "Monthly costs" and "Amenities"
 * steps (highlights live at the end of Amenities). No React here so the rules
 * are easy to test.
 *
 * STORAGE (no migration; every answer lands in something that already exists)
 *   Location       stepData.location.address / postalCode / latitude / longitude   (existing columns)
 *                  stepData.location.suburbPlaceId / suburbLabel   curated only: the Place the
 *                  super admin picked. It is not a column; after the development is saved it is
 *                  recorded through the existing adminReviewDevelopmentPlaceAssignment mutation
 *                  (accepted "site" assignment). See suburbAssignmentRequest().
 *   Monthly costs  stepData.governance_finances.rightsAndTaxes {min,max}  -> ratesFrom / ratesTo
 *                  stepData.governance_finances.levyRange {min,max}        -> monthlyLevyFrom / To
 *                  stepData.governance_finances.hasGoverningBody + governanceType
 *                  ("hoa" | "body_corporate") -> estateSpecs.hasHOA / governanceType
 *                  One estimated amount is saved as min = max.
 *   Amenities      stepData.amenities_features.amenities   registry keys + custom labels (as before)
 *                  stepData.amenities_features.customGroups  which group a custom label was added to
 *   Highlights     stepData.marketing_summary.keySellingPoints -> developments.highlights (as before)
 */

import {
  AMENITY_REGISTRY,
  getAmenityByKey,
  type AmenityCategory,
} from '@/config/amenityRegistry';
import {
  DEFAULT_ESTATE_TYPE,
  ESTATE_TYPE_OPTIONS,
  HIGHLIGHTS_MAX,
  HIGHLIGHTS_MIN,
  HIGHLIGHT_MAX_LENGTH,
  ownershipTagLabel,
  type StepIssue,
} from '@/lib/wizardBasicsAbout';

// -----------------------------------------------------------------------------
// Location
// -----------------------------------------------------------------------------

const parseCoordinate = (value: unknown): number | null => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : Number.NaN;
};

/**
 * The server's readiness check (developmentSubmissionReadiness.ts) requires an
 * address and does not require coordinates, so the wizard requires the address
 * and treats the map pin as optional. If coordinates are entered they must be a
 * valid pair, so a half-typed pin is never saved.
 */
export function validateLocationStep(location: Record<string, any> | null | undefined): StepIssue[] {
  const loc = location ?? {};
  const errors: StepIssue[] = [];

  if (!String(loc.address ?? '').trim()) {
    errors.push({ field: 'address', message: 'Street address is required' });
  }

  const lat = parseCoordinate(loc.latitude);
  const lng = parseCoordinate(loc.longitude);
  if (lat !== null || lng !== null) {
    if (lat === null || Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.push({ field: 'latitude', message: 'Latitude must be a number between -90 and 90' });
    }
    if (lng === null || Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.push({
        field: 'longitude',
        message: 'Longitude must be a number between -180 and 180',
      });
    }
  }
  return errors;
}

export const SUBURB_EVIDENCE_REFERENCE =
  'Suburb selected in the development wizard by a platform operator';

export interface SuburbAssignmentRequest {
  developmentId: number;
  phaseId: null;
  placeId: string;
  evidenceReference: string;
}

/**
 * The call that records the curated suburb as the development's accepted
 * "site" Place assignment (adminReviewDevelopmentPlaceAssignment). Null when no
 * suburb was picked in this wizard session, or the picked one is already recorded.
 */
export function suburbAssignmentRequest(
  developmentId: number,
  location: Record<string, any> | null | undefined,
): SuburbAssignmentRequest | null {
  const placeId = String(location?.suburbPlaceId ?? '').trim();
  if (!placeId || !Number.isSafeInteger(developmentId) || developmentId <= 0) return null;
  if (String(location?.suburbAssignedPlaceId ?? '').trim() === placeId) return null;
  return {
    developmentId,
    phaseId: null,
    placeId,
    evidenceReference: SUBURB_EVIDENCE_REFERENCE,
  };
}

// -----------------------------------------------------------------------------
// Monthly costs
// -----------------------------------------------------------------------------

export type LevyChoice = 'hoa' | 'body_corporate' | 'none';

export const LEVY_OPTIONS: Array<{ value: LevyChoice; label: string }> = [
  { value: 'hoa', label: 'HOA levy' },
  { value: 'body_corporate', label: 'Body corporate levy' },
  { value: 'none', label: 'No levy' },
];

export const MAX_MONTHLY_AMOUNT = 10_000_000;

/** Digits only: "R 1 250" -> 1250. Empty or invalid is 0 (nothing entered). */
export function parseMonthlyAmount(text: string | number | null | undefined): number {
  const digits = String(text ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  return Math.min(Number(digits), MAX_MONTHLY_AMOUNT);
}

export interface MoneyRange {
  min?: number | null;
  max?: number | null;
}

/** One estimated amount from the saved range. A range saved by the older step shows its top end. */
export function estimatedAmount(range: MoneyRange | null | undefined): number {
  const min = Number(range?.min ?? 0) || 0;
  const max = Number(range?.max ?? 0) || 0;
  return Math.max(min, max);
}

/** True when an older saved range (from / to) differs, so the step can say so. */
export function hasSavedRange(range: MoneyRange | null | undefined): boolean {
  const min = Number(range?.min ?? 0) || 0;
  const max = Number(range?.max ?? 0) || 0;
  return min > 0 && max > 0 && min !== max;
}

export function ratesPatch(amount: number): { rightsAndTaxes: { min: number; max: number } } {
  return { rightsAndTaxes: { min: amount, max: amount } };
}

/** What the saved governance answers mean for the levy chips. null = not answered yet. */
export function levyChoiceOf(governance: Record<string, any> | null | undefined): LevyChoice | null {
  const g = governance ?? {};
  if (g.hasGoverningBody === true) {
    if (g.governanceType === 'hoa') return 'hoa';
    if (g.governanceType === 'body_corporate') return 'body_corporate';
    return null;
  }
  return g.hasGoverningBody === false ? 'none' : null;
}

/**
 * Step data for a levy choice. "No levy" also zeroes the amount so a levy that
 * is no longer asked about is never published. Architectural guidelines and
 * any other stored governance values are never touched.
 */
export function levyPatch(choice: LevyChoice, amount: number): Record<string, unknown> {
  if (choice === 'none') {
    return {
      hasGoverningBody: false,
      governanceType: undefined,
      levyRange: { min: 0, max: 0 },
    };
  }
  return {
    hasGoverningBody: true,
    governanceType: choice,
    levyRange: { min: amount, max: amount },
  };
}

export function levyLabelFor(choice: LevyChoice | null): string {
  return choice === 'body_corporate' ? 'Body corporate levy' : 'HOA levy';
}

// -----------------------------------------------------------------------------
// Amenities
// -----------------------------------------------------------------------------

export type AmenityGroupId = 'security' | 'lifestyle' | 'home';

export interface AmenityGroup {
  id: AmenityGroupId;
  title: string;
  /** Registry keys offered as chips, in order. Known keys keep public amenity groups working. */
  keys: string[];
  placeholder: string;
  addAria: string;
}

export const AMENITY_GROUPS: AmenityGroup[] = [
  {
    id: 'security',
    title: 'Security',
    keys: ['controlled_gate_access', '24_hour_security', 'electric_fencing', 'cctv_surveillance'],
    placeholder: 'Add your own, e.g. Guard patrols',
    addAria: 'Add your own security item',
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle',
    keys: [
      'clubhouse',
      'swimming_pool',
      'tennis_courts',
      'outdoor_gym',
      'jogging_trails',
      'childrens_play_area',
      'pet_park',
    ],
    placeholder: 'Add your own, e.g. Dog park',
    addAria: 'Add your own lifestyle item',
  },
  {
    id: 'home',
    title: 'In every home',
    keys: ['backup_power', 'solar_power', 'fibre_ready'],
    placeholder: 'Add your own, e.g. Built-in braai',
    addAria: 'Add your own in-home item',
  },
];

const CATEGORY_TO_GROUP: Record<AmenityCategory, AmenityGroupId> = {
  security: 'security',
  lifestyle: 'lifestyle',
  family: 'lifestyle',
  sustainability: 'home',
  convenience: 'home',
};

export function amenityLabel(keyOrLabel: string): string {
  return getAmenityByKey(keyOrLabel)?.label ?? keyOrLabel;
}

export const isRegistryAmenityKey = (value: string): boolean =>
  AMENITY_REGISTRY.some(item => item.key === value);

export type CustomAmenityGroups = Record<string, AmenityGroupId>;

/**
 * The chips shown in each group: the group's own keys, then anything else the
 * publisher already ticked (registry keys go to the group of their category,
 * custom labels to the group they were added in, or Lifestyle when unknown).
 */
export function amenityChipsByGroup(
  selected: string[],
  customGroups: CustomAmenityGroups | null | undefined,
): Record<AmenityGroupId, string[]> {
  const result: Record<AmenityGroupId, string[]> = { security: [], lifestyle: [], home: [] };
  const offered = new Set<string>();
  for (const group of AMENITY_GROUPS) {
    for (const key of group.keys) {
      result[group.id].push(key);
      offered.add(key);
    }
  }
  for (const item of selected) {
    if (offered.has(item)) continue;
    const registry = getAmenityByKey(item);
    const groupId: AmenityGroupId = registry
      ? CATEGORY_TO_GROUP[registry.category]
      : (customGroups?.[item] ?? 'lifestyle');
    result[groupId].push(item);
    offered.add(item);
  }
  return result;
}

export function toggleAmenity(
  selected: string[],
  customGroups: CustomAmenityGroups | null | undefined,
  item: string,
): { amenities: string[]; customGroups: CustomAmenityGroups } {
  const groups = { ...(customGroups ?? {}) };
  if (selected.includes(item)) {
    delete groups[item];
    return { amenities: selected.filter(key => key !== item), customGroups: groups };
  }
  return { amenities: [...selected, item], customGroups: groups };
}

export type AddCustomAmenityResult =
  | { status: 'added'; amenities: string[]; customGroups: CustomAmenityGroups }
  | { status: 'known'; amenities: string[]; customGroups: CustomAmenityGroups; label: string }
  | { status: 'duplicate' | 'empty' };

/**
 * "Add your own". A label that matches a registry amenity ticks that amenity
 * (so the public amenity groups keep working); anything else is stored as a
 * custom label, remembered against the group it was added to.
 */
export function addCustomAmenity(
  selected: string[],
  customGroups: CustomAmenityGroups | null | undefined,
  group: AmenityGroupId,
  text: string,
): AddCustomAmenityResult {
  const label = text.trim().replace(/\s+/g, ' ');
  if (!label) return { status: 'empty' };
  const lower = label.toLowerCase();

  const registry = AMENITY_REGISTRY.find(
    item => item.label.toLowerCase() === lower || item.key === lower,
  );
  if (registry) {
    if (selected.includes(registry.key)) return { status: 'duplicate' };
    return {
      status: 'known',
      amenities: [...selected, registry.key],
      customGroups: { ...(customGroups ?? {}) },
      label: registry.label,
    };
  }
  if (selected.some(item => amenityLabel(item).toLowerCase() === lower)) {
    return { status: 'duplicate' };
  }
  return {
    status: 'added',
    amenities: [...selected, label],
    customGroups: { ...(customGroups ?? {}), [label]: group },
  };
}

// -----------------------------------------------------------------------------
// Highlights (card chips)
// -----------------------------------------------------------------------------

/** Short card wording for amenities a publisher can tick. */
const AMENITY_HIGHLIGHT_LABELS: Record<string, string> = {
  controlled_gate_access: 'Controlled access',
  access_control: 'Controlled access',
  '24_hour_security': '24-hour security',
  security_patrols: 'Security patrols',
  electric_fencing: 'Electric fencing',
  cctv_surveillance: 'CCTV',
  clubhouse: 'Clubhouse',
  swimming_pool: 'Swimming pool',
  gym: 'Gym',
  outdoor_gym: 'Outdoor gym',
  tennis_courts: 'Tennis courts',
  jogging_trails: 'Jogging trails',
  childrens_play_area: 'Kids play area',
  pet_park: 'Pet park',
  golf_course: 'Golf course',
  equestrian_facilities: 'Equestrian facilities',
  backup_power: 'Backup power',
  backup_water: 'Backup water',
  solar_power: 'Solar power',
  fibre_ready: 'Fibre ready',
};

/** Trimmed, single-spaced and cut to the 24-character limit. */
export function normalizeHighlight(text: string): string {
  return String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, HIGHLIGHT_MAX_LENGTH);
}

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export interface HighlightFacts {
  setting?: string | null;
  estateType?: string | null;
  ownershipTypes?: unknown;
  amenities?: string[] | null;
}

/**
 * Suggested highlights. They come ONLY from what the publisher entered: the
 * setting / kind of estate, the ownership, and the amenities they ticked
 * (custom ones included, when short enough). Nothing generic or unverifiable.
 */
export function highlightSuggestions(facts: HighlightFacts): string[] {
  const out: string[] = [];
  const add = (label: string | null | undefined) => {
    const text = normalizeHighlight(label ?? '');
    if (text && !out.some(existing => sameText(existing, text))) out.push(text);
  };

  if (facts.setting === 'estate') {
    const type = facts.estateType || DEFAULT_ESTATE_TYPE;
    if (type === DEFAULT_ESTATE_TYPE) add('Security estate');
    else {
      const option = ESTATE_TYPE_OPTIONS.find(o => o.value === type);
      add(option ? option.label.replace(' or wildlife', '') : 'Security estate');
    }
  } else if (facts.setting === 'gated') {
    add('Gated community');
  }

  const ownership = Array.isArray(facts.ownershipTypes)
    ? facts.ownershipTypes[0]
    : facts.ownershipTypes;
  add(ownershipTagLabel(typeof ownership === 'string' ? ownership : null));

  for (const item of facts.amenities ?? []) {
    const known = AMENITY_HIGHLIGHT_LABELS[item];
    if (known) add(known);
    else if (!isRegistryAmenityKey(item) && item.trim().length <= HIGHLIGHT_MAX_LENGTH) add(item);
  }
  return out;
}

/** Suggestions first, then any chosen highlight that is not a suggestion (so it can be un-chosen). */
export function highlightChoices(suggestions: string[], chosen: string[]): string[] {
  const out = [...suggestions];
  for (const item of chosen) {
    if (!out.some(existing => sameText(existing, item))) out.push(item);
  }
  return out;
}

/** Tap to choose, tap again to un-choose. At the maximum, choosing more does nothing. */
export function toggleHighlight(chosen: string[], text: string): string[] {
  const value = normalizeHighlight(text);
  if (!value) return chosen;
  if (chosen.some(item => sameText(item, value))) {
    return chosen.filter(item => !sameText(item, value));
  }
  if (chosen.length >= HIGHLIGHTS_MAX) return chosen;
  return [...chosen, value];
}

export type AddHighlightResult =
  | { status: 'added'; highlights: string[] }
  | { status: 'duplicate' | 'full' | 'empty' };

export function addHighlight(chosen: string[], text: string): AddHighlightResult {
  const value = normalizeHighlight(text);
  if (!value) return { status: 'empty' };
  if (chosen.some(item => sameText(item, value))) return { status: 'duplicate' };
  if (chosen.length >= HIGHLIGHTS_MAX) return { status: 'full' };
  return { status: 'added', highlights: [...chosen, value] };
}

/** At least three highlights to publish (the server's readiness rule is the same). */
export function validateAmenitiesStep(data: Record<string, any> | null | undefined): StepIssue[] {
  const d = data ?? {};
  const raw: unknown[] = Array.isArray(d.highlights)
    ? d.highlights
    : Array.isArray(d.keySellingPoints)
      ? d.keySellingPoints
      : [];
  const count = raw.filter(item => String(item ?? '').trim()).length;
  return count < HIGHLIGHTS_MIN
    ? [{ field: 'highlights', message: `Add at least ${HIGHLIGHTS_MIN} highlights` }]
    : [];
}

/** First three highlights show on the search card; the rest are "+N more". */
export function cardHighlightSplit(highlights: string[], visible = 3) {
  return {
    shown: highlights.slice(0, visible),
    more: Math.max(0, highlights.length - visible),
  };
}
