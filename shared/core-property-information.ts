import type {
  ActiveManualPropertyType,
  PropertyListingIntent,
  ListingPropertyType,
} from './property-taxonomy';
import { isActiveManualPropertyType } from './property-taxonomy';

/**
 * Canonical Step 3 contract.
 *
 * The listing JSON remains the source-of-truth storage boundary for authored
 * property facts, but this typed object is the only approved interpretation of
 * those facts. Legacy flat keys are read as compatibility input and generated
 * aliases are projection/read-model compatibility only.
 */

export const CORE_PROPERTY_INFORMATION_VERSION = 1 as const;

export const CORE_VALUE_STATES = ['known', 'unknown', 'not_applicable'] as const;
export type CoreValueState = (typeof CORE_VALUE_STATES)[number];

export const FARM_LAND_AREA_UNITS = ['m2', 'hectares', 'acres'] as const;
export type FarmLandAreaUnit = (typeof FARM_LAND_AREA_UNITS)[number];

export const FARM_PROPERTY_USES = [
  'crop_farm',
  'livestock_farm',
  'mixed_farm',
  'game_farm',
  'aquaculture',
  'smallholding',
] as const;
export type FarmPropertyUse = (typeof FARM_PROPERTY_USES)[number];

export type CoreNumericFact =
  | { status: 'known'; value: number }
  | { status: 'unknown' | 'not_applicable' };

export type CoreMeasurementFact =
  | { status: 'known'; valueM2: number; unit: 'm2' }
  | { status: 'unknown' | 'not_applicable'; unit: 'm2' };

export type FarmLandAreaFact =
  | {
      status: 'known';
      value: number;
      sourceUnit: FarmLandAreaUnit;
      normalizedM2: number;
    }
  | {
      status: 'unknown' | 'not_applicable';
      sourceUnit?: FarmLandAreaUnit;
    };

export interface CorePropertyInformation {
  version: typeof CORE_PROPERTY_INFORMATION_VERSION;
  bedrooms?: CoreNumericFact;
  bathrooms?: CoreNumericFact;
  internalArea?: CoreMeasurementFact;
  erfArea?: CoreMeasurementFact;
  farmLandArea?: FarmLandAreaFact;
  parkingBays?: CoreNumericFact;
  garages?: CoreNumericFact;
  floorLevel?: CoreNumericFact;
  farmUse?: FarmPropertyUse;
  residenceIncluded?: boolean;
}

export type CorePropertyFieldKey =
  | 'bedrooms'
  | 'bathrooms'
  | 'internalArea'
  | 'erfArea'
  | 'farmLandArea'
  | 'parkingBays'
  | 'garages'
  | 'floorLevel'
  | 'farmUse'
  | 'residenceIncluded';

export type CorePropertyFieldRequirement = 'required' | 'conditional' | 'optional';

export interface CorePropertyFieldDefinition {
  key: CorePropertyFieldKey;
  label: string;
  requirement: CorePropertyFieldRequirement;
  meaning: string;
}

export interface CoreValidationIssue {
  field: CorePropertyFieldKey | 'propertyType' | 'intent';
  message: string;
}

const RESIDENTIAL_TYPES: readonly ActiveManualPropertyType[] = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
];

export const CORE_FIELD_DEFINITIONS: Record<
  CorePropertyFieldKey,
  Omit<CorePropertyFieldDefinition, 'requirement'>
> = {
  bedrooms: {
    key: 'bedrooms',
    label: 'Bedrooms',
    meaning: 'Number of bedrooms in the dwelling or included residence.',
  },
  bathrooms: {
    key: 'bathrooms',
    label: 'Bathrooms',
    meaning: 'Number of bathrooms in the dwelling or included residence.',
  },
  internalArea: {
    key: 'internalArea',
    label: 'Internal / floor area',
    meaning: 'Usable internal area of the dwelling, unit or building, normalized to m².',
  },
  erfArea: {
    key: 'erfArea',
    label: 'Erf / stand area',
    meaning: 'Land parcel or stand associated with the property, normalized to m².',
  },
  farmLandArea: {
    key: 'farmLandArea',
    label: 'Farm / land area',
    meaning: 'Total agricultural or smallholding extent, preserving source unit and normalized m².',
  },
  parkingBays: {
    key: 'parkingBays',
    label: 'Parking bays',
    meaning: 'Open or covered parking bays, excluding enclosed garages.',
  },
  garages: {
    key: 'garages',
    label: 'Garages',
    meaning: 'Enclosed vehicle garages.',
  },
  floorLevel: {
    key: 'floorLevel',
    label: 'Floor / level',
    meaning: 'The apartment level; ground floor is represented as known value 0.',
  },
  farmUse: {
    key: 'farmUse',
    label: 'Farm / smallholding use',
    meaning: 'The primary use category of the agricultural or lifestyle property.',
  },
  residenceIncluded: {
    key: 'residenceIncluded',
    label: 'Residence included',
    meaning: 'Whether a dwelling is included in the farm or smallholding offering.',
  },
};

export function getCorePropertyFieldDefinitions(
  propertyType: ListingPropertyType | undefined,
  core?: Partial<CorePropertyInformation>,
): CorePropertyFieldDefinition[] {
  if (!isActiveManualPropertyType(propertyType)) return [];

  const residential: CorePropertyFieldDefinition[] = [
    { ...CORE_FIELD_DEFINITIONS.bedrooms, requirement: 'required' },
    { ...CORE_FIELD_DEFINITIONS.bathrooms, requirement: 'required' },
    { ...CORE_FIELD_DEFINITIONS.internalArea, requirement: 'required' },
    { ...CORE_FIELD_DEFINITIONS.parkingBays, requirement: 'optional' },
    { ...CORE_FIELD_DEFINITIONS.garages, requirement: 'optional' },
  ];

  if (propertyType === 'apartment') {
    residential.push({ ...CORE_FIELD_DEFINITIONS.floorLevel, requirement: 'optional' });
  }

  if (propertyType === 'house') {
    residential.splice(3, 0, { ...CORE_FIELD_DEFINITIONS.erfArea, requirement: 'required' });
  }

  if (propertyType === 'farm') {
    const residenceIncluded = core?.residenceIncluded === true;
    return [
      { ...CORE_FIELD_DEFINITIONS.farmUse, requirement: 'required' },
      { ...CORE_FIELD_DEFINITIONS.farmLandArea, requirement: 'required' },
      { ...CORE_FIELD_DEFINITIONS.residenceIncluded, requirement: 'required' },
      ...(residenceIncluded
        ? [
            { ...CORE_FIELD_DEFINITIONS.bedrooms, requirement: 'conditional' as const },
            { ...CORE_FIELD_DEFINITIONS.bathrooms, requirement: 'conditional' as const },
            { ...CORE_FIELD_DEFINITIONS.internalArea, requirement: 'conditional' as const },
            { ...CORE_FIELD_DEFINITIONS.parkingBays, requirement: 'optional' as const },
            { ...CORE_FIELD_DEFINITIONS.garages, requirement: 'optional' as const },
          ]
        : []),
    ];
  }

  return residential;
}

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const finiteNonNegative = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

const finitePositive = (value: unknown): number | undefined => {
  const number = finiteNonNegative(value);
  return number !== undefined && number > 0 ? number : undefined;
};

function readNumericFact(value: unknown, legacyValue?: unknown): CoreNumericFact | undefined {
  if (isRecord(value) && CORE_VALUE_STATES.includes(value.status)) {
    if (value.status === 'known') {
      const number = finiteNonNegative(value.value);
      return number === undefined ? { status: 'unknown' } : { status: 'known', value: number };
    }
    return { status: value.status };
  }

  const number = finiteNonNegative(value ?? legacyValue);
  return number === undefined ? undefined : { status: 'known', value: number };
}

function readMeasurementFact(
  value: unknown,
  legacyValue?: unknown,
): CoreMeasurementFact | undefined {
  if (isRecord(value) && CORE_VALUE_STATES.includes(value.status)) {
    if (value.status === 'known') {
      const number = finitePositive(value.valueM2 ?? value.value);
      return number === undefined
        ? { status: 'unknown', unit: 'm2' }
        : { status: 'known', valueM2: number, unit: 'm2' };
    }
    return { status: value.status, unit: 'm2' };
  }

  const number = finitePositive(value ?? legacyValue);
  return number === undefined ? undefined : { status: 'known', valueM2: number, unit: 'm2' };
}

function normalizeFarmArea(value: number, sourceUnit: FarmLandAreaUnit): number {
  const multiplier = sourceUnit === 'hectares' ? 10_000 : sourceUnit === 'acres' ? 4_046.8564224 : 1;
  return Math.round(value * multiplier * 100) / 100;
}

export function normalizeFarmLandArea(
  value: unknown,
  sourceUnit: unknown,
): FarmLandAreaFact | undefined {
  const unit = FARM_LAND_AREA_UNITS.includes(sourceUnit as FarmLandAreaUnit)
    ? (sourceUnit as FarmLandAreaUnit)
    : undefined;
  const number = finitePositive(value);
  if (!unit || number === undefined) return undefined;
  return {
    status: 'known',
    value: number,
    sourceUnit: unit,
    normalizedM2: normalizeFarmArea(number, unit),
  };
}

function readFarmLandArea(source: Record<string, any>): FarmLandAreaFact | undefined {
  const candidate = source.farmLandArea;
  if (isRecord(candidate) && CORE_VALUE_STATES.includes(candidate.status)) {
    if (candidate.status !== 'known') {
      return {
        status: candidate.status,
        ...(FARM_LAND_AREA_UNITS.includes(candidate.sourceUnit) && {
          sourceUnit: candidate.sourceUnit,
        }),
      };
    }
    const normalized = normalizeFarmLandArea(candidate.value, candidate.sourceUnit);
    return normalized ?? { status: 'unknown' };
  }

  const sourceUnit =
    source.landAreaSourceUnit ?? source.landSizeUnit ?? source.landSizeUnitName ?? 'hectares';
  const value = source.landAreaValue ?? source.landSizeValue ?? source.landSizeHa;
  return normalizeFarmLandArea(value, sourceUnit);
}

function readFarmUse(source: Record<string, any>): FarmPropertyUse | undefined {
  const value = source.farmUse ?? source.farmType ?? source.propertyCategory;
  return FARM_PROPERTY_USES.includes(value as FarmPropertyUse)
    ? (value as FarmPropertyUse)
    : undefined;
}

/** Read canonical facts first, then known historical flat keys. */
export function readCorePropertyInformation(
  propertyType: ListingPropertyType | undefined,
  propertyDetails?: unknown,
  basicInfo?: unknown,
): CorePropertyInformation {
  const details = isRecord(propertyDetails) ? propertyDetails : {};
  const basic = isRecord(basicInfo) ? basicInfo : {};
  const nested = isRecord(details.corePropertyInformation) ? details.corePropertyInformation : {};
  const source = { ...details, ...nested };

  const core: CorePropertyInformation = { version: CORE_PROPERTY_INFORMATION_VERSION };
  const bedrooms = readNumericFact(source.bedrooms);
  const bathrooms = readNumericFact(source.bathrooms);
  const parkingBays = readNumericFact(source.parkingBays, source.parkingCount);
  const garages = readNumericFact(source.garages);
  const internalArea = readMeasurementFact(
    source.internalArea,
    source.internalAreaM2 ?? source.unitSizeM2 ?? source.houseAreaM2 ?? source.floorAreaM2,
  );
  const erfArea = readMeasurementFact(source.erfArea, source.erfAreaM2 ?? source.erfSizeM2);
  const floorLevel = readNumericFact(source.floorLevel, source.floorNumber);

  if (bedrooms) core.bedrooms = bedrooms;
  if (bathrooms) core.bathrooms = bathrooms;
  if (parkingBays) core.parkingBays = parkingBays;
  if (garages) core.garages = garages;
  if (internalArea) core.internalArea = internalArea;
  if (erfArea) core.erfArea = erfArea;
  if (floorLevel) core.floorLevel = floorLevel;

  if (propertyType === 'farm') {
    const farmLandArea = readFarmLandArea({ ...basic, ...source });
    const farmUse = readFarmUse({ ...basic, ...source });
    const residenceIncluded =
      typeof source.residenceIncluded === 'boolean'
        ? source.residenceIncluded
        : typeof basic.residenceIncluded === 'boolean'
          ? basic.residenceIncluded
          : undefined;
    if (farmLandArea) core.farmLandArea = farmLandArea;
    if (farmUse) core.farmUse = farmUse;
    if (residenceIncluded !== undefined) core.residenceIncluded = residenceIncluded;
  }

  return core;
}

function unknownNumericFact(): CoreNumericFact {
  return { status: 'unknown' };
}

function unknownMeasurementFact(): CoreMeasurementFact {
  return { status: 'unknown', unit: 'm2' };
}

/**
 * Complete the applicable shape without inventing numeric zeroes. Required
 * missing values become explicit `unknown` facts so server and client agree.
 */
export function buildCorePropertyInformation(
  propertyType: ListingPropertyType | undefined,
  propertyDetails?: unknown,
  basicInfo?: unknown,
): CorePropertyInformation {
  const source = readCorePropertyInformation(propertyType, propertyDetails, basicInfo);
  const result: CorePropertyInformation = { version: CORE_PROPERTY_INFORMATION_VERSION };

  if (RESIDENTIAL_TYPES.includes(propertyType as ActiveManualPropertyType)) {
    result.bedrooms = source.bedrooms ?? unknownNumericFact();
    result.bathrooms = source.bathrooms ?? unknownNumericFact();
    result.internalArea = source.internalArea ?? unknownMeasurementFact();
    result.parkingBays = source.parkingBays ?? unknownNumericFact();
    result.garages = source.garages ?? unknownNumericFact();
    if (propertyType === 'house') result.erfArea = source.erfArea ?? unknownMeasurementFact();
    if (propertyType === 'apartment') result.floorLevel = source.floorLevel ?? unknownNumericFact();
  }

  if (propertyType === 'farm') {
    result.farmUse = source.farmUse;
    result.farmLandArea = source.farmLandArea ?? { status: 'unknown' };
    result.residenceIncluded = source.residenceIncluded;
    if (source.residenceIncluded === true) {
      result.bedrooms = source.bedrooms ?? unknownNumericFact();
      result.bathrooms = source.bathrooms ?? unknownNumericFact();
      result.internalArea = source.internalArea ?? unknownMeasurementFact();
      result.parkingBays = source.parkingBays ?? unknownNumericFact();
      result.garages = source.garages ?? unknownNumericFact();
    }
  }

  return result;
}

function isKnownNumericFact(value: unknown): value is { status: 'known'; value: number } {
  return isRecord(value) && value.status === 'known' && finiteNonNegative(value.value) !== undefined;
}

function isKnownMeasurementFact(value: unknown): value is { status: 'known'; valueM2: number } {
  return (
    isRecord(value) &&
    value.status === 'known' &&
    finitePositive(value.valueM2) !== undefined &&
    value.unit === 'm2'
  );
}

function isKnownFarmArea(value: unknown): value is { status: 'known'; normalizedM2: number } {
  return (
    isRecord(value) &&
    value.status === 'known' &&
    finitePositive(value.value) !== undefined &&
    finitePositive(value.normalizedM2) !== undefined &&
    FARM_LAND_AREA_UNITS.includes(value.sourceUnit)
  );
}

export function validateCorePropertyInformation(
  intent: PropertyListingIntent | undefined,
  propertyType: ListingPropertyType | undefined,
  propertyDetails?: unknown,
  basicInfo?: unknown,
): CoreValidationIssue[] {
  const issues: CoreValidationIssue[] = [];
  if (!isActiveManualPropertyType(propertyType)) return issues;
  if (intent !== 'sale' && intent !== 'rent') {
    issues.push({ field: 'intent', message: 'Choose For Sale or To Rent before adding property facts.' });
    return issues;
  }

  const core = buildCorePropertyInformation(propertyType, propertyDetails, basicInfo);
  const requireNumeric = (field: CorePropertyFieldKey, message: string) => {
    if (!isKnownNumericFact(core[field])) issues.push({ field, message });
  };
  const requireMeasurement = (field: 'internalArea' | 'erfArea', message: string) => {
    if (!isKnownMeasurementFact(core[field])) issues.push({ field, message });
  };

  if (propertyType !== 'farm' || core.residenceIncluded === true) {
    requireNumeric('bedrooms', 'Enter the number of bedrooms, or mark it as unknown where allowed.');
    requireNumeric('bathrooms', 'Enter the number of bathrooms, or mark it as unknown where allowed.');
    requireMeasurement('internalArea', 'Enter the internal / floor area in m².');
  }

  if (propertyType === 'house') {
    requireMeasurement('erfArea', 'Enter the erf / stand area in m².');
  }

  if (propertyType === 'farm') {
    if (!core.farmUse || !FARM_PROPERTY_USES.includes(core.farmUse)) {
      issues.push({ field: 'farmUse', message: 'Choose the primary farm or smallholding use.' });
    }
    if (!isKnownFarmArea(core.farmLandArea)) {
      issues.push({ field: 'farmLandArea', message: 'Enter the total farm / land area and its source unit.' });
    }
    if (typeof core.residenceIncluded !== 'boolean') {
      issues.push({ field: 'residenceIncluded', message: 'Tell us whether a residence is included.' });
    }
  }

  const optionalNumericFields: CorePropertyFieldKey[] = ['parkingBays', 'garages', 'floorLevel'];
  for (const field of optionalNumericFields) {
    const value = core[field];
    if (isRecord(value) && value.status === 'known' && !isKnownNumericFact(value)) {
      issues.push({ field, message: `${CORE_FIELD_DEFINITIONS[field].label} must be zero or a positive number.` });
    }
  }
  if (core.floorLevel?.status === 'known' && !Number.isInteger(core.floorLevel.value)) {
    issues.push({ field: 'floorLevel', message: 'Floor / level must be a whole number; ground floor is 0.' });
  }

  return issues;
}

/** Preserve only facts whose meaning remains valid after a type change. */
export function retainCorePropertyInformationForType(
  sourceType: ListingPropertyType | undefined,
  targetType: ListingPropertyType | undefined,
  propertyDetails?: unknown,
  basicInfo?: unknown,
): CorePropertyInformation | undefined {
  if (!isActiveManualPropertyType(targetType)) return undefined;
  const source = readCorePropertyInformation(sourceType, propertyDetails, basicInfo);
  const result: CorePropertyInformation = { version: CORE_PROPERTY_INFORMATION_VERSION };
  if (RESIDENTIAL_TYPES.includes(targetType as ActiveManualPropertyType)) {
    if (source.bedrooms) result.bedrooms = source.bedrooms;
    if (source.bathrooms) result.bathrooms = source.bathrooms;
    if (source.internalArea) result.internalArea = source.internalArea;
    if (source.parkingBays) result.parkingBays = source.parkingBays;
    if (source.garages) result.garages = source.garages;
    if (targetType === 'house' && sourceType === 'house' && source.erfArea) result.erfArea = source.erfArea;
    if (targetType === 'apartment' && sourceType === 'apartment' && source.floorLevel) {
      result.floorLevel = source.floorLevel;
    }
  }
  if (targetType === 'farm' && sourceType === 'farm') {
    if (source.farmUse) result.farmUse = source.farmUse;
    if (source.farmLandArea) result.farmLandArea = source.farmLandArea;
    if (source.residenceIncluded !== undefined) result.residenceIncluded = source.residenceIncluded;
    if (source.residenceIncluded === true) {
      if (source.bedrooms) result.bedrooms = source.bedrooms;
      if (source.bathrooms) result.bathrooms = source.bathrooms;
      if (source.internalArea) result.internalArea = source.internalArea;
      if (source.parkingBays) result.parkingBays = source.parkingBays;
      if (source.garages) result.garages = source.garages;
    }
  }
  return Object.keys(result).length > 1 ? result : undefined;
}

/**
 * Compatibility aliases for older readiness/detail code. These values are
 * derived from the canonical object and are never an independent authority.
 */
export function corePropertyInformationToLegacyAliases(
  propertyType: ListingPropertyType | undefined,
  core: CorePropertyInformation,
): Record<string, unknown> {
  const aliases: Record<string, unknown> = {};
  const known = (fact: unknown): number | undefined =>
    isKnownNumericFact(fact) ? fact.value : undefined;
  const measurement = (fact: unknown): number | undefined =>
    isKnownMeasurementFact(fact) ? fact.valueM2 : undefined;

  const bedrooms = known(core.bedrooms);
  const bathrooms = known(core.bathrooms);
  const parkingBays = known(core.parkingBays);
  const garages = known(core.garages);
  const internalArea = measurement(core.internalArea);
  const erfArea = measurement(core.erfArea);
  if (bedrooms !== undefined) aliases.bedrooms = bedrooms;
  if (bathrooms !== undefined) aliases.bathrooms = bathrooms;
  if (parkingBays !== undefined) {
    aliases.parkingBays = parkingBays;
    aliases.parkingCount = parkingBays;
  }
  if (garages !== undefined) aliases.garages = garages;
  if (internalArea !== undefined) {
    aliases.internalAreaM2 = internalArea;
    if (propertyType === 'house' || propertyType === 'farm') aliases.houseAreaM2 = internalArea;
    else aliases.unitSizeM2 = internalArea;
  }
  if (erfArea !== undefined) {
    aliases.erfAreaM2 = erfArea;
    aliases.erfSizeM2 = erfArea;
  }
  if (isKnownNumericFact(core.floorLevel)) {
    aliases.floorLevel = core.floorLevel.value;
    aliases.floorNumber = core.floorLevel.value;
  }
  if (core.farmLandArea?.status === 'known') {
    aliases.landAreaValue = core.farmLandArea.value;
    aliases.landAreaSourceUnit = core.farmLandArea.sourceUnit;
    aliases.landAreaM2 = core.farmLandArea.normalizedM2;
    if (core.farmLandArea.sourceUnit === 'hectares') aliases.landSizeHa = core.farmLandArea.value;
  }
  if (core.farmUse) aliases.farmUse = core.farmUse;
  if (core.residenceIncluded !== undefined) aliases.residenceIncluded = core.residenceIncluded;
  return aliases;
}

export function buildCanonicalCorePropertyDetails(
  propertyType: ListingPropertyType | undefined,
  propertyDetails?: unknown,
  basicInfo?: unknown,
): Record<string, unknown> {
  const core = buildCorePropertyInformation(propertyType, propertyDetails, basicInfo);
  return {
    corePropertyInformation: core,
    ...corePropertyInformationToLegacyAliases(propertyType, core),
  };
}
