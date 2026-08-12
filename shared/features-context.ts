import type { CorePropertyInformation } from './core-property-information';
import type {
  ActiveManualPropertyType,
  ListingPropertyType,
  PropertyListingIntent,
} from './property-taxonomy';
import { isActiveManualPropertyType } from './property-taxonomy';

/**
 * Canonical Step 4 contract.
 *
 * Step 4 is deliberately stored inside the existing listing JSON boundary for
 * now, but this object is the only approved interpretation of new authoring
 * data. Legacy flat keys are accepted by the normalizer for existing records;
 * they are not another authoring authority.
 */
export const FEATURES_CONTEXT_VERSION = 1 as const;

/** Flat Step 4 keys that must not leak from an old browser draft into a new payload. */
export const LEGACY_STEP4_PROPERTY_DETAIL_KEYS = [
  'propertyHighlights',
  'additionalRooms',
  'propertySetting',
  'estateType',
  'powerBackup',
  'electricitySupply',
  'electricitySource',
  'waterSupply',
  'waterHeating',
  'internetAccess',
  'internetAvailability',
  'security',
  'securityLevel',
  'securityFeatures',
  'ownershipType',
  'flooring',
  'flooringType',
  'parkingType',
  'petFriendly',
  'petPolicy',
  'featuresContext',
] as const;

export const STEP4_SPACE_KEYS = [
  'study_office',
  'staff_quarters',
  'scullery',
  'laundry_room',
  'pantry',
  'storage_room',
  'gym',
  'entertainment_area',
  'balcony_patio',
  'garden',
  'pool',
] as const;
export type Step4SpaceKey = (typeof STEP4_SPACE_KEYS)[number];

export const STEP4_HIGHLIGHT_KEYS = [
  'high_ceilings',
  'modern_finishes',
  'open_plan',
  'natural_light',
  'scenic_outlook',
] as const;
export type Step4HighlightKey = (typeof STEP4_HIGHLIGHT_KEYS)[number];

export const STEP4_CUSTOM_TEXT_MAX_LENGTH = 80;
export const STEP4_CUSTOM_VALUE_LIMIT = 20;

export const STEP4_SECURITY_FEATURE_KEYS = [
  'alarm',
  'electric_fence',
  'outdoor_beams',
  'cctv',
  'guard_24hr',
  'access_control',
  'intercom',
  'security_gates',
] as const;
export type Step4SecurityFeatureKey = (typeof STEP4_SECURITY_FEATURE_KEYS)[number];

export const STEP4_PROPERTY_SETTINGS = ['standalone', 'complex', 'estate', 'unknown'] as const;
export type Step4PropertySetting = (typeof STEP4_PROPERTY_SETTINGS)[number];

export const STEP4_CONTROLLED_ACCESS_VALUES = ['controlled', 'not_controlled', 'unknown'] as const;
export type Step4ControlledAccess = (typeof STEP4_CONTROLLED_ACCESS_VALUES)[number];

export const STEP4_ELECTRICITY_VALUES = [
  'prepaid',
  'municipal',
  'eskom',
  'off_grid',
  'unknown',
] as const;
export type Step4ElectricitySupply = (typeof STEP4_ELECTRICITY_VALUES)[number];

export const STEP4_BACKUP_POWER_VALUES = [
  'none',
  'generator',
  'inverter',
  'solar',
  'ups',
  'unknown',
] as const;
export type Step4BackupPower = (typeof STEP4_BACKUP_POWER_VALUES)[number];

export const STEP4_WATER_SUPPLY_VALUES = ['municipal', 'prepaid', 'borehole', 'unknown'] as const;
export type Step4WaterSupply = (typeof STEP4_WATER_SUPPLY_VALUES)[number];

export const STEP4_WATER_HEATING_VALUES = [
  'electric_geyser',
  'solar_geyser',
  'hybrid',
  'unknown',
] as const;
export type Step4WaterHeating = (typeof STEP4_WATER_HEATING_VALUES)[number];

export const STEP4_INTERNET_VALUES = ['fibre', 'adsl', 'satellite', 'none', 'unknown'] as const;
export type Step4InternetAccess = (typeof STEP4_INTERNET_VALUES)[number];

export const STEP4_PET_POLICY_VALUES = [
  'allowed',
  'cats_only',
  'dogs_only',
  'allowed_with_permission',
  'not_allowed',
  'unknown',
] as const;
export type Step4PetPolicy = (typeof STEP4_PET_POLICY_VALUES)[number];

export type Step4SecurityStatus = 'known' | 'unknown';

export interface FeaturesContext {
  version: typeof FEATURES_CONTEXT_VERSION;
  spaces: Step4SpaceKey[];
  context: {
    setting?: Step4PropertySetting;
    controlledAccess?: Step4ControlledAccess;
  };
  utilities: {
    electricitySupply?: Step4ElectricitySupply;
    backupPower?: Step4BackupPower;
    waterSupply?: Step4WaterSupply;
    waterHeating?: Step4WaterHeating;
    internetAccess?: Step4InternetAccess;
  };
  security: {
    status: Step4SecurityStatus;
    features: Step4SecurityFeatureKey[];
  };
  petPolicy?: Step4PetPolicy;
  highlights: Step4HighlightKey[];
  customFeatures: string[];
  /** Advertiser-supplied merchandising text; never a structured/search fact. */
  customHighlights: string[];
}

export interface Step4OptionDefinition<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  applicableTo: readonly ActiveManualPropertyType[];
}

const RESIDENTIAL_TYPES: readonly ActiveManualPropertyType[] = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
];

const ALL_ACTIVE_TYPES: readonly ActiveManualPropertyType[] = [...RESIDENTIAL_TYPES, 'farm'];

export const STEP4_SPACE_DEFINITIONS: readonly Step4OptionDefinition<Step4SpaceKey>[] = [
  {
    value: 'study_office',
    label: 'Study / office',
    applicableTo: ['apartment', 'house', 'townhouse', 'cluster_home', 'farm'],
  },
  {
    value: 'staff_quarters',
    label: 'Staff quarters',
    applicableTo: ['house', 'cluster_home', 'farm'],
  },
  {
    value: 'scullery',
    label: 'Scullery',
    applicableTo: ['house', 'townhouse', 'cluster_home', 'farm'],
  },
  { value: 'laundry_room', label: 'Laundry room', applicableTo: ALL_ACTIVE_TYPES },
  {
    value: 'pantry',
    label: 'Pantry',
    applicableTo: ['apartment', 'house', 'townhouse', 'cluster_home', 'farm'],
  },
  { value: 'storage_room', label: 'Storage room', applicableTo: ALL_ACTIVE_TYPES },
  { value: 'gym', label: 'Gym', applicableTo: ['apartment', 'house', 'townhouse', 'cluster_home'] },
  {
    value: 'entertainment_area',
    label: 'Entertainment area',
    applicableTo: ['house', 'townhouse', 'cluster_home', 'farm'],
  },
  {
    value: 'balcony_patio',
    label: 'Balcony / patio',
    applicableTo: ['apartment', 'house', 'townhouse', 'cluster_home'],
  },
  {
    value: 'garden',
    label: 'Garden',
    applicableTo: ['house', 'townhouse', 'cluster_home', 'farm'],
  },
  { value: 'pool', label: 'Pool', applicableTo: ['house', 'townhouse', 'cluster_home', 'farm'] },
];

export const STEP4_HIGHLIGHT_DEFINITIONS: readonly Step4OptionDefinition<Step4HighlightKey>[] = [
  { value: 'high_ceilings', label: 'High ceilings', applicableTo: ALL_ACTIVE_TYPES },
  { value: 'modern_finishes', label: 'Modern finishes', applicableTo: ALL_ACTIVE_TYPES },
  { value: 'open_plan', label: 'Open-plan living', applicableTo: ALL_ACTIVE_TYPES },
  { value: 'natural_light', label: 'Natural light', applicableTo: ALL_ACTIVE_TYPES },
  { value: 'scenic_outlook', label: 'Scenic outlook', applicableTo: ALL_ACTIVE_TYPES },
];

export const STEP4_SECURITY_FEATURE_DEFINITIONS: readonly Step4OptionDefinition<Step4SecurityFeatureKey>[] =
  [
    { value: 'alarm', label: 'Alarm system', applicableTo: ALL_ACTIVE_TYPES },
    { value: 'electric_fence', label: 'Electric fencing', applicableTo: ALL_ACTIVE_TYPES },
    { value: 'outdoor_beams', label: 'Outdoor beams', applicableTo: ALL_ACTIVE_TYPES },
    { value: 'cctv', label: 'CCTV', applicableTo: ALL_ACTIVE_TYPES },
    { value: 'guard_24hr', label: '24-hour guard', applicableTo: ALL_ACTIVE_TYPES },
    { value: 'access_control', label: 'Access control', applicableTo: ALL_ACTIVE_TYPES },
    {
      value: 'intercom',
      label: 'Intercom',
      applicableTo: ['apartment', 'house', 'townhouse', 'cluster_home'],
    },
    {
      value: 'security_gates',
      label: 'Security gates',
      applicableTo: ['house', 'townhouse', 'cluster_home', 'farm'],
    },
  ];

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const unique = <T extends string>(values: readonly T[], allowed: readonly T[]): T[] =>
  Array.from(new Set(values.filter(value => allowed.includes(value))));

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeCustomFeatures = (value: unknown): string[] => {
  const output: string[] = [];
  for (const raw of stringArray(value)) {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed || trimmed.length > STEP4_CUSTOM_TEXT_MAX_LENGTH) continue;
    if (!output.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
      output.push(trimmed);
    }
  }
  return output.slice(0, STEP4_CUSTOM_VALUE_LIMIT);
};

const labelKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[&/]/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const LEGACY_SPACE_KEYS: Record<string, Step4SpaceKey> = {
  study_office: 'study_office',
  study: 'study_office',
  office: 'study_office',
  staff_quarters: 'staff_quarters',
  scullery: 'scullery',
  laundry_room: 'laundry_room',
  laundry: 'laundry_room',
  pantry: 'pantry',
  storage_room: 'storage_room',
  storage: 'storage_room',
  storeroom: 'storage_room',
  gym: 'gym',
  entertainment_area: 'entertainment_area',
  entertainment: 'entertainment_area',
  balcony_patio: 'balcony_patio',
  balcony: 'balcony_patio',
  patio: 'balcony_patio',
  garden: 'garden',
  pool: 'pool',
};

const LEGACY_HIGHLIGHT_KEYS: Record<string, Step4HighlightKey> = {
  high_ceilings: 'high_ceilings',
  modern_finishes: 'modern_finishes',
  open_plan: 'open_plan',
  natural_light: 'natural_light',
  scenic_view: 'scenic_outlook',
  scenic_outlook: 'scenic_outlook',
};

const LEGACY_SECURITY_KEYS: Record<string, Step4SecurityFeatureKey> = {
  alarm: 'alarm',
  electric_fence: 'electric_fence',
  beams: 'outdoor_beams',
  outdoor_beams: 'outdoor_beams',
  cctv: 'cctv',
  '24hr_guard': 'guard_24hr',
  guard_24hr: 'guard_24hr',
  access_control: 'access_control',
  intercom: 'intercom',
  security_gates: 'security_gates',
};

const mapLegacyValues = <T extends string>(values: unknown, map: Record<string, T>): T[] =>
  unique(
    stringArray(values)
      .map(value => map[labelKey(value)])
      .filter((value): value is T => Boolean(value)),
    Object.values(map),
  );

const normalizeSetting = (value: unknown): Step4PropertySetting | undefined => {
  if (STEP4_PROPERTY_SETTINGS.includes(value as Step4PropertySetting)) {
    return value as Step4PropertySetting;
  }
  if (value === 'estate_living') return 'estate';
  if (value === 'gated_community') return undefined;
  return undefined;
};

const normalizePetPolicy = (value: unknown): Step4PetPolicy | undefined => {
  if (STEP4_PET_POLICY_VALUES.includes(value as Step4PetPolicy)) {
    return value as Step4PetPolicy;
  }
  if (value === 'yes' || value === true) return 'allowed';
  if (value === 'no' || value === false || value === 'no_pets') return 'not_allowed';
  if (value === 'with_permission' || value === 'by_arrangement') return 'allowed_with_permission';
  return undefined;
};

const readCanonical = (raw: Record<string, any>): FeaturesContext | undefined => {
  if (raw.version !== FEATURES_CONTEXT_VERSION) return undefined;
  if (!isRecord(raw.context) || !isRecord(raw.utilities) || !isRecord(raw.security))
    return undefined;

  return {
    version: FEATURES_CONTEXT_VERSION,
    spaces: unique(stringArray(raw.spaces) as Step4SpaceKey[], STEP4_SPACE_KEYS),
    context: {
      setting: STEP4_PROPERTY_SETTINGS.includes(raw.context.setting)
        ? raw.context.setting
        : undefined,
      controlledAccess: STEP4_CONTROLLED_ACCESS_VALUES.includes(raw.context.controlledAccess)
        ? raw.context.controlledAccess
        : undefined,
    },
    utilities: {
      electricitySupply: STEP4_ELECTRICITY_VALUES.includes(raw.utilities.electricitySupply)
        ? raw.utilities.electricitySupply
        : undefined,
      backupPower: STEP4_BACKUP_POWER_VALUES.includes(raw.utilities.backupPower)
        ? raw.utilities.backupPower
        : undefined,
      waterSupply: STEP4_WATER_SUPPLY_VALUES.includes(raw.utilities.waterSupply)
        ? raw.utilities.waterSupply
        : undefined,
      waterHeating: STEP4_WATER_HEATING_VALUES.includes(raw.utilities.waterHeating)
        ? raw.utilities.waterHeating
        : undefined,
      internetAccess: STEP4_INTERNET_VALUES.includes(raw.utilities.internetAccess)
        ? raw.utilities.internetAccess
        : undefined,
    },
    security: {
      status: raw.security.status === 'known' ? 'known' : 'unknown',
      features: unique(
        stringArray(raw.security.features) as Step4SecurityFeatureKey[],
        STEP4_SECURITY_FEATURE_KEYS,
      ),
    },
    petPolicy: normalizePetPolicy(raw.petPolicy),
    highlights: unique(stringArray(raw.highlights) as Step4HighlightKey[], STEP4_HIGHLIGHT_KEYS),
    customFeatures: normalizeCustomFeatures(raw.customFeatures),
    customHighlights: normalizeCustomFeatures(raw.customHighlights),
  };
};

export function createEmptyFeaturesContext(): FeaturesContext {
  return {
    version: FEATURES_CONTEXT_VERSION,
    spaces: [],
    context: {},
    utilities: {},
    security: { status: 'unknown', features: [] },
    highlights: [],
    customFeatures: [],
    customHighlights: [],
  };
}

/**
 * Normalize either the new nested object or known historical Step 4 fields.
 * This function is intentionally loss-aware: subjective legacy highlights that
 * had no canonical meaning (Secure, Pet Friendly, Newly Renovated) are not
 * promoted into the structured contract.
 */
export function normalizeFeaturesContext(raw: unknown, legacySource?: unknown): FeaturesContext {
  const rawRecord = isRecord(raw) ? raw : {};
  const canonical = readCanonical(rawRecord);
  if (canonical) return canonical;

  const legacy = {
    ...(isRecord(legacySource) ? legacySource : {}),
    ...rawRecord,
  };
  const spaces = mapLegacyValues(
    [...stringArray(legacy.additionalRooms), ...stringArray(legacy.spaces)],
    LEGACY_SPACE_KEYS,
  );
  const highlights = mapLegacyValues(
    [...stringArray(legacy.propertyHighlights), ...stringArray(legacy.highlights)],
    LEGACY_HIGHLIGHT_KEYS,
  );
  const securityFeatures = mapLegacyValues(
    [...stringArray(legacy.securityFeatures), ...stringArray(legacy.security)],
    LEGACY_SECURITY_KEYS,
  );
  const legacySetting = normalizeSetting(legacy.propertySetting);
  const legacyGated = legacy.propertySetting === 'gated_community';
  const legacySecurity = String(legacy.security ?? legacy.securityLevel ?? '').toLowerCase();
  const petPolicy = normalizePetPolicy(legacy.petPolicy ?? legacy.petFriendly);

  return {
    version: FEATURES_CONTEXT_VERSION,
    spaces,
    context: {
      setting: legacySetting,
      controlledAccess:
        legacyGated || legacySecurity.includes('security') || legacySecurity.includes('access')
          ? 'controlled'
          : undefined,
    },
    utilities: {
      electricitySupply:
        legacy.electricitySupply === 'municipality'
          ? 'municipal'
          : STEP4_ELECTRICITY_VALUES.includes(legacy.electricitySupply)
            ? legacy.electricitySupply
            : undefined,
      backupPower:
        legacy.powerBackup === 'solar_system'
          ? 'solar'
          : legacy.powerBackup === 'inverter_battery'
            ? 'inverter'
            : STEP4_BACKUP_POWER_VALUES.includes(legacy.powerBackup)
              ? legacy.powerBackup
              : undefined,
      waterSupply:
        legacy.waterSupply === 'municipality'
          ? 'municipal'
          : STEP4_WATER_SUPPLY_VALUES.includes(legacy.waterSupply)
            ? legacy.waterSupply
            : undefined,
      waterHeating:
        legacy.waterHeating === 'hybrid_system'
          ? 'hybrid'
          : STEP4_WATER_HEATING_VALUES.includes(legacy.waterHeating)
            ? legacy.waterHeating
            : undefined,
      internetAccess:
        legacy.internetAccess === 'fibre_ready' || legacy.internetAccess === 'fiber'
          ? 'fibre'
          : STEP4_INTERNET_VALUES.includes(legacy.internetAccess)
            ? legacy.internetAccess
            : undefined,
    },
    security: {
      status: securityFeatures.length > 0 || legacy.security === 'none' ? 'known' : 'unknown',
      features: securityFeatures,
    },
    petPolicy,
    highlights,
    customFeatures: normalizeCustomFeatures(legacy.customFeatures),
    customHighlights: normalizeCustomFeatures(legacy.customHighlights),
  };
}

export function getApplicableStep4Spaces(
  propertyType: ListingPropertyType | undefined,
  core?: Partial<CorePropertyInformation>,
): Step4OptionDefinition<Step4SpaceKey>[] {
  if (!isActiveManualPropertyType(propertyType)) return [];
  const definitions = STEP4_SPACE_DEFINITIONS.filter(definition =>
    definition.applicableTo.includes(propertyType),
  );
  if (propertyType !== 'farm' || core?.residenceIncluded === true) return [...definitions];

  // A farm without an included residence should not be presented with a
  // residential catalogue. These are the few displayable additional facts
  // that can still describe the offering without inventing a dwelling.
  const farmWithoutResidence = new Set<Step4SpaceKey>([
    'staff_quarters',
    'storage_room',
    'garden',
    'pool',
  ]);
  return definitions.filter(definition => farmWithoutResidence.has(definition.value));
}

export function pruneFeaturesContextForType(
  value: unknown,
  propertyType: ListingPropertyType | undefined,
  core?: Partial<CorePropertyInformation>,
): FeaturesContext {
  const context = normalizeFeaturesContext(value);
  const allowedSpaces = getApplicableStep4Spaces(propertyType, core).map(item => item.value);
  return {
    ...context,
    spaces: context.spaces.filter(space => allowedSpaces.includes(space)),
  };
}

export function pruneFeaturesContextForIntent(
  value: unknown,
  intent: PropertyListingIntent | undefined,
): FeaturesContext {
  const context = normalizeFeaturesContext(value);
  return intent === 'rent' ? context : { ...context, petPolicy: undefined };
}

export function buildFeaturesContextFromWizardState(
  additionalInfo: unknown,
  propertyDetails: unknown,
  intent: PropertyListingIntent | undefined,
  propertyType: ListingPropertyType | undefined,
): FeaturesContext {
  const additional = isRecord(additionalInfo) ? additionalInfo : {};
  const details = isRecord(propertyDetails) ? propertyDetails : {};
  const nested = isRecord(additional.featuresContext) ? additional.featuresContext : undefined;
  const context = normalizeFeaturesContext(nested, { ...details, ...additional });
  const core = isRecord(details.corePropertyInformation)
    ? (details.corePropertyInformation as Partial<CorePropertyInformation>)
    : undefined;
  return pruneFeaturesContextForIntent(
    pruneFeaturesContextForType(context, propertyType, core),
    intent,
  );
}

export interface FeaturesContextValidationIssue {
  field: string;
  message: string;
}

const includes = (values: readonly string[], value: unknown): boolean =>
  typeof value === 'string' && values.includes(value);

export function validateFeaturesContext(
  value: unknown,
  intent: PropertyListingIntent | undefined,
  propertyType: ListingPropertyType | undefined,
  core?: Partial<CorePropertyInformation>,
): FeaturesContextValidationIssue[] {
  if (value === undefined || value === null) return [];
  if (!isRecord(value))
    return [{ field: 'featuresContext', message: 'Features & Context must be an object.' }];

  const issues: FeaturesContextValidationIssue[] = [];
  if (value.version !== FEATURES_CONTEXT_VERSION) {
    issues.push({ field: 'version', message: 'Unsupported Features & Context version.' });
  }
  if (!Array.isArray(value.spaces)) {
    issues.push({ field: 'spaces', message: 'Spaces & Features must be a list.' });
  } else {
    const allowedSpaces = getApplicableStep4Spaces(propertyType, core).map(item => item.value);
    value.spaces.forEach((space: unknown, index: number) => {
      if (!includes(STEP4_SPACE_KEYS, space)) {
        issues.push({ field: `spaces.${index}`, message: 'Unknown structured space.' });
      } else if (!allowedSpaces.includes(space as Step4SpaceKey)) {
        issues.push({
          field: `spaces.${index}`,
          message: 'This space is not applicable to the selected property type.',
        });
      }
    });
  }

  if (!isRecord(value.context)) {
    issues.push({ field: 'context', message: 'Property Context must be an object.' });
  } else {
    if (
      value.context.setting !== undefined &&
      !includes(STEP4_PROPERTY_SETTINGS, value.context.setting)
    ) {
      issues.push({ field: 'context.setting', message: 'Unknown property setting.' });
    }
    if (
      value.context.controlledAccess !== undefined &&
      !includes(STEP4_CONTROLLED_ACCESS_VALUES, value.context.controlledAccess)
    ) {
      issues.push({ field: 'context.controlledAccess', message: 'Unknown access-control state.' });
    }
  }

  if (!isRecord(value.utilities)) {
    issues.push({ field: 'utilities', message: 'Utilities & Resilience must be an object.' });
  } else {
    const utilityFields: Array<[string, readonly string[]]> = [
      ['electricitySupply', STEP4_ELECTRICITY_VALUES],
      ['backupPower', STEP4_BACKUP_POWER_VALUES],
      ['waterSupply', STEP4_WATER_SUPPLY_VALUES],
      ['waterHeating', STEP4_WATER_HEATING_VALUES],
      ['internetAccess', STEP4_INTERNET_VALUES],
    ];
    for (const [field, allowed] of utilityFields) {
      if (value.utilities[field] !== undefined && !includes(allowed, value.utilities[field])) {
        issues.push({ field: `utilities.${field}`, message: `Unknown ${field} value.` });
      }
    }
  }

  if (!isRecord(value.security)) {
    issues.push({ field: 'security', message: 'Security must be an object.' });
  } else {
    if (!['known', 'unknown'].includes(value.security.status)) {
      issues.push({ field: 'security.status', message: 'Security certainty is invalid.' });
    }
    if (!Array.isArray(value.security.features)) {
      issues.push({ field: 'security.features', message: 'Security features must be a list.' });
    } else {
      value.security.features.forEach((feature: unknown, index: number) => {
        if (!includes(STEP4_SECURITY_FEATURE_KEYS, feature)) {
          issues.push({
            field: `security.features.${index}`,
            message: 'Unknown security feature.',
          });
        }
      });
    }
  }

  if (value.petPolicy !== undefined && !includes(STEP4_PET_POLICY_VALUES, value.petPolicy)) {
    issues.push({ field: 'petPolicy', message: 'Unknown pet policy.' });
  }
  if (value.petPolicy !== undefined && intent !== 'rent') {
    issues.push({
      field: 'petPolicy',
      message: 'Pet policy is only applicable to rental listings.',
    });
  }
  if (!Array.isArray(value.highlights)) {
    issues.push({ field: 'highlights', message: 'Listing highlights must be a list.' });
  } else {
    value.highlights.forEach((highlight: unknown, index: number) => {
      if (!includes(STEP4_HIGHLIGHT_KEYS, highlight)) {
        issues.push({ field: `highlights.${index}`, message: 'Unknown listing highlight.' });
      }
    });
  }
  if (!Array.isArray(value.customFeatures)) {
    issues.push({ field: 'customFeatures', message: 'Other features must be a list.' });
  } else {
    if (value.customFeatures.length > STEP4_CUSTOM_VALUE_LIMIT) {
      issues.push({
        field: 'customFeatures',
        message: `Other features cannot contain more than ${STEP4_CUSTOM_VALUE_LIMIT} items.`,
      });
    }
    value.customFeatures.forEach((feature: unknown, index: number) => {
      if (
        typeof feature !== 'string' ||
        feature.trim().length === 0 ||
        feature.trim().length > STEP4_CUSTOM_TEXT_MAX_LENGTH
      ) {
        issues.push({
          field: `customFeatures.${index}`,
          message: 'Other features must be non-empty text of 80 characters or fewer.',
        });
      }
    });
  }
  if (value.customHighlights !== undefined && !Array.isArray(value.customHighlights)) {
    issues.push({ field: 'customHighlights', message: 'Custom listing highlights must be a list.' });
  } else if (Array.isArray(value.customHighlights)) {
    if (value.customHighlights.length > STEP4_CUSTOM_VALUE_LIMIT) {
      issues.push({
        field: 'customHighlights',
        message: `Custom listing highlights cannot contain more than ${STEP4_CUSTOM_VALUE_LIMIT} items.`,
      });
    }
    value.customHighlights.forEach((highlight: unknown, index: number) => {
      if (
        typeof highlight !== 'string' ||
        highlight.trim().length === 0 ||
        highlight.trim().length > STEP4_CUSTOM_TEXT_MAX_LENGTH
      ) {
        issues.push({
          field: `customHighlights.${index}`,
          message: 'Custom listing highlights must be non-empty text of 80 characters or fewer.',
        });
      }
    });
  }
  return issues;
}

export function getStep4Label(
  value: string,
  definitions: readonly Step4OptionDefinition<string>[],
): string {
  return definitions.find(definition => definition.value === value)?.label ?? value;
}

export function getStep4SecurityFeatureLabel(value: Step4SecurityFeatureKey): string {
  return getStep4Label(value, STEP4_SECURITY_FEATURE_DEFINITIONS);
}

export function getStep4SpaceLabel(value: Step4SpaceKey): string {
  return getStep4Label(value, STEP4_SPACE_DEFINITIONS);
}

export function getStep4HighlightLabel(value: Step4HighlightKey): string {
  return getStep4Label(value, STEP4_HIGHLIGHT_DEFINITIONS);
}
