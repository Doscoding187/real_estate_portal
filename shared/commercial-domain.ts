export const COMMERCIAL_SPACE_CLASSES = ['office', 'industrial_logistics', 'retail'] as const;
export type CommercialSpaceClass = (typeof COMMERCIAL_SPACE_CLASSES)[number];

/**
 * `propertyType=commercial` is only the Listing Engine's marketing/review
 * transport marker. Commercial identity and availability live in the
 * dedicated Asset → Space → Availability authority, so generic residential
 * authoring actions must hand off instead of mutating the marker directly.
 */
export const COMMERCIAL_INVENTORY_MANAGEMENT_MESSAGE =
  'Commercial leasing listings are managed through Commercial inventory.';

/**
 * Public Buy/Rent is a separate journey from Commercial leasing. Keep this
 * hand-off copy in the shared Commercial authority so service and router
 * boundaries cannot drift into accepting `propertyType=commercial` as a
 * generic filter.
 */
export const COMMERCIAL_PUBLIC_JOURNEY_HANDOFF_MESSAGE =
  'Commercial leasing is available through the dedicated Commercial journey only.';

export function isCommercialMarketingPropertyType(value: unknown): boolean {
  return (
    String(value || '')
      .trim()
      .toLowerCase() === 'commercial'
  );
}

/**
 * The public Commercial MVP is deliberately narrower than the database enum:
 * it exposes the three independently searchable leasing uses that have a
 * coherent decision model. `mixed_use` and `other` remain storage values, not
 * a catch-all public classification.
 */
export const COMMERCIAL_ASSET_KINDS = [
  'office_building',
  'industrial_park',
  'retail_centre',
  'standalone_premises',
  'mixed_use',
] as const;
export type CommercialAssetKind = (typeof COMMERCIAL_ASSET_KINDS)[number];
export function isCommercialAssetKind(value: unknown): value is CommercialAssetKind {
  return COMMERCIAL_ASSET_KINDS.includes(value as CommercialAssetKind);
}

export const COMMERCIAL_SPACE_KINDS = [
  'office_suite',
  'warehouse',
  'retail_unit',
  'whole_building',
  'yard',
] as const;
export type CommercialSpaceKind = (typeof COMMERCIAL_SPACE_KINDS)[number];
export function isCommercialSpaceKind(value: unknown): value is CommercialSpaceKind {
  return COMMERCIAL_SPACE_KINDS.includes(value as CommercialSpaceKind);
}

export const COMMERCIAL_CONFIRMATION_SOURCES = [
  'broker',
  'landlord',
  'owner',
  'asset_manager',
  'property_fund',
  'other',
] as const;
export type CommercialConfirmationSource = (typeof COMMERCIAL_CONFIRMATION_SOURCES)[number];
export function isCommercialConfirmationSource(
  value: unknown,
): value is CommercialConfirmationSource {
  return COMMERCIAL_CONFIRMATION_SOURCES.includes(value as CommercialConfirmationSource);
}

/** Human-readable labels for the controlled availability-provenance vocabulary. */
export const COMMERCIAL_CONFIRMATION_SOURCE_LABELS: Record<CommercialConfirmationSource, string> = {
  broker: 'Broker / agent',
  landlord: 'Landlord',
  owner: 'Owner',
  asset_manager: 'Asset manager',
  property_fund: 'Property fund',
  other: 'Other (describe)',
};

export type CommercialUseTypeDefinition = {
  label: string;
  shortLabel: string;
  assetKinds: readonly CommercialAssetKind[];
  spaceKinds: readonly CommercialSpaceKind[];
  relevantSpecificationCodes: readonly CommercialSpecificationCode[];
};

/**
 * One governed definition drives authoring, filtering and presentation. It is
 * intentionally not inferred from the free-form marketing Listing.
 */
export const COMMERCIAL_USE_TYPE_DEFINITIONS: Record<
  CommercialSpaceClass,
  CommercialUseTypeDefinition
> = {
  office: {
    label: 'Office',
    shortLabel: 'Office',
    assetKinds: ['office_building', 'standalone_premises', 'mixed_use'],
    spaceKinds: ['office_suite', 'whole_building'],
    relevantSpecificationCodes: [
      'building_grade',
      'fit_out_condition',
      'backup_power',
      'backup_water',
      'fibre_connectivity',
      'parking_bays',
    ],
  },
  industrial_logistics: {
    label: 'Industrial & logistics',
    shortLabel: 'Industrial',
    assetKinds: ['industrial_park', 'standalone_premises', 'mixed_use'],
    spaceKinds: ['warehouse', 'yard', 'whole_building'],
    relevantSpecificationCodes: [
      'parking_bays',
      'backup_power',
      'backup_water',
      'fibre_connectivity',
      'eaves_height_m',
      'yard_hardstand',
      'truck_access',
      'roller_doors',
      'loading_docks',
      'power_capacity_kva',
      'floor_loading',
      'sprinklers',
      'crane_capacity',
    ],
  },
  retail: {
    label: 'Retail',
    shortLabel: 'Retail',
    assetKinds: ['retail_centre', 'standalone_premises', 'mixed_use'],
    spaceKinds: ['retail_unit', 'whole_building'],
    relevantSpecificationCodes: [
      'parking_bays',
      'backup_power',
      'backup_water',
      'fibre_connectivity',
      'frontage_visibility',
      'footfall_context',
      'extraction_capability',
      'tenant_mix_context',
      'delivery_access',
    ],
  },
};

export function isCommercialSpaceClass(value: unknown): value is CommercialSpaceClass {
  return COMMERCIAL_SPACE_CLASSES.includes(value as CommercialSpaceClass);
}

export function commercialUseTypeDefinition(
  value: CommercialSpaceClass,
): CommercialUseTypeDefinition {
  return COMMERCIAL_USE_TYPE_DEFINITIONS[value];
}

export function assertCommercialSpaceIdentity(input: {
  spaceClass: CommercialSpaceClass;
  spaceKind: CommercialSpaceKind;
  assetKind: CommercialAssetKind;
}): void {
  if (!isCommercialSpaceClass(input.spaceClass)) {
    throw new Error('Commercial space class must use the governed public vocabulary.');
  }
  if (!isCommercialAssetKind(input.assetKind)) {
    throw new Error('Commercial asset kind must use the governed vocabulary.');
  }
  if (!isCommercialSpaceKind(input.spaceKind)) {
    throw new Error('Commercial space kind must use the governed vocabulary.');
  }
  const definition = commercialUseTypeDefinition(input.spaceClass);
  if (!definition.assetKinds.includes(input.assetKind)) {
    throw new Error(
      `${definition.label} spaces cannot be authored against a ${input.assetKind.replace(/_/g, ' ')} asset.`,
    );
  }
  if (!definition.spaceKinds.includes(input.spaceKind)) {
    throw new Error(
      `${input.spaceKind.replace(/_/g, ' ')} is not a valid ${definition.label} space kind.`,
    );
  }
}

export function assertCommercialSpaceAreas(input: {
  rentableAreaM2?: number | null;
  usableAreaM2?: number | null;
}): void {
  for (const [label, value] of [
    ['rentable area', input.rentableAreaM2],
    ['usable area', input.usableAreaM2],
  ] as const) {
    if (value === null || value === undefined) continue;
    if (!Number.isFinite(Number(value)))
      throw new Error(`Commercial ${label} must be a finite value when known.`);
    if (Number(value) <= 0)
      throw new Error(`Commercial ${label} must be greater than zero when known.`);
  }
}

export const COMMERCIAL_SPECIFICATION_CODES = [
  'building_grade',
  'fit_out_condition',
  'backup_power',
  'backup_water',
  'fibre_connectivity',
  'parking_bays',
  'eaves_height_m',
  'yard_hardstand',
  'truck_access',
  'roller_doors',
  'loading_docks',
  'power_capacity_kva',
  'floor_loading',
  'sprinklers',
  'crane_capacity',
  'frontage_visibility',
  'footfall_context',
  'extraction_capability',
  'tenant_mix_context',
  'delivery_access',
] as const;
export type CommercialSpecificationCode = (typeof COMMERCIAL_SPECIFICATION_CODES)[number];
export function isCommercialSpecificationCode(
  value: unknown,
): value is CommercialSpecificationCode {
  return COMMERCIAL_SPECIFICATION_CODES.includes(value as CommercialSpecificationCode);
}
export type CommercialSpecificationValueKind = 'text' | 'numeric' | 'boolean';

export const COMMERCIAL_SPECIFICATION_VALUE_KINDS: Record<
  CommercialSpecificationCode,
  CommercialSpecificationValueKind
> = {
  building_grade: 'text',
  fit_out_condition: 'text',
  backup_power: 'boolean',
  backup_water: 'boolean',
  fibre_connectivity: 'boolean',
  parking_bays: 'numeric',
  eaves_height_m: 'numeric',
  yard_hardstand: 'boolean',
  truck_access: 'text',
  roller_doors: 'numeric',
  loading_docks: 'numeric',
  power_capacity_kva: 'numeric',
  floor_loading: 'numeric',
  sprinklers: 'boolean',
  crane_capacity: 'numeric',
  frontage_visibility: 'text',
  footfall_context: 'text',
  extraction_capability: 'boolean',
  tenant_mix_context: 'text',
  delivery_access: 'text',
};
export type CommercialSpecificationValueState =
  | 'known'
  | 'unknown'
  | 'unavailable'
  | 'not_applicable';
export const COMMERCIAL_SPECIFICATION_VALUE_STATES = [
  'known',
  'unknown',
  'unavailable',
  'not_applicable',
] as const;
export function isCommercialSpecificationValueState(
  value: unknown,
): value is CommercialSpecificationValueState {
  return COMMERCIAL_SPECIFICATION_VALUE_STATES.includes(value as CommercialSpecificationValueState);
}

export type CommercialSpecificationInput = {
  specificationCode: CommercialSpecificationCode;
  valueState: CommercialSpecificationValueState;
  numericValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
};

export function assertCommercialSpecificationInput(input: CommercialSpecificationInput): void {
  if (!isCommercialSpecificationCode(input.specificationCode)) {
    throw new Error('Commercial specification requires a governed code.');
  }
  if (!isCommercialSpecificationValueState(input.valueState)) {
    throw new Error('Commercial specification requires a governed value state.');
  }
  if (input.numericValue !== null && !Number.isFinite(Number(input.numericValue))) {
    throw new Error(`${input.specificationCode}: numeric specification must be finite.`);
  }
  if (input.numericValue !== null && Number(input.numericValue) < 0) {
    throw new Error(`${input.specificationCode}: numeric specification cannot be negative.`);
  }
  if (
    input.textValue !== null &&
    (typeof input.textValue !== 'string' || !input.textValue.trim())
  ) {
    throw new Error(`${input.specificationCode}: text specification cannot be blank.`);
  }
  if (input.booleanValue !== null && typeof input.booleanValue !== 'boolean') {
    throw new Error(`${input.specificationCode}: boolean specification must be true or false.`);
  }
  const populated = [
    input.numericValue !== null,
    input.textValue !== null,
    input.booleanValue !== null,
  ];
  const populatedCount = populated.filter(Boolean).length;
  if (input.valueState !== 'known') {
    if (populatedCount !== 0) {
      throw new Error(
        `${input.specificationCode}: ${input.valueState} specification cannot carry a value.`,
      );
    }
    return;
  }
  if (populatedCount !== 1) {
    throw new Error(`${input.specificationCode}: known specification requires exactly one value.`);
  }
  const actualKind: CommercialSpecificationValueKind =
    input.numericValue !== null ? 'numeric' : input.textValue !== null ? 'text' : 'boolean';
  const expectedKind = COMMERCIAL_SPECIFICATION_VALUE_KINDS[input.specificationCode];
  if (actualKind !== expectedKind) {
    throw new Error(`${input.specificationCode}: requires a ${expectedKind} value.`);
  }
}

export const COMMERCIAL_AVAILABILITY_STATES = [
  'available_confirmed',
  'available_upcoming',
  'under_offer',
  'needs_reconfirmation',
  'occupied',
  'withdrawn',
] as const;
export type CommercialAvailabilityState = (typeof COMMERCIAL_AVAILABILITY_STATES)[number];
export function isCommercialAvailabilityState(
  value: unknown,
): value is CommercialAvailabilityState {
  return COMMERCIAL_AVAILABILITY_STATES.includes(value as CommercialAvailabilityState);
}

/** States that must never be discoverable until a supplier provides a fresh positive confirmation. */
export const COMMERCIAL_NONPUBLIC_AVAILABILITY_STATES = [
  'under_offer',
  'occupied',
  'withdrawn',
] as const;
export type CommercialNonpublicAvailabilityState =
  (typeof COMMERCIAL_NONPUBLIC_AVAILABILITY_STATES)[number];

export function isCommercialNonpublicAvailabilityState(
  value: unknown,
): value is CommercialNonpublicAvailabilityState {
  return COMMERCIAL_NONPUBLIC_AVAILABILITY_STATES.includes(
    value as CommercialNonpublicAvailabilityState,
  );
}

export const COMMERCIAL_ECONOMIC_VALUE_STATES = [
  'supplied',
  'estimated',
  'unknown',
  'not_applicable',
] as const;
export type CommercialEconomicValueState = (typeof COMMERCIAL_ECONOMIC_VALUE_STATES)[number];
export function isCommercialEconomicValueState(
  value: unknown,
): value is CommercialEconomicValueState {
  return COMMERCIAL_ECONOMIC_VALUE_STATES.includes(value as CommercialEconomicValueState);
}
export const COMMERCIAL_ECONOMIC_COMPONENT_CODES = [
  'base_rent',
  'gross_rent',
  'operating_costs',
  'rates_recoveries',
  'parking',
  'fixed_levies',
  'utilities',
  'security_service',
  'other_recovery',
  'deposit',
  'incentive',
] as const;
export type CommercialEconomicComponentCode = (typeof COMMERCIAL_ECONOMIC_COMPONENT_CODES)[number];
export function isCommercialEconomicComponentCode(
  value: unknown,
): value is CommercialEconomicComponentCode {
  return COMMERCIAL_ECONOMIC_COMPONENT_CODES.includes(value as CommercialEconomicComponentCode);
}
export type CommercialEconomicChargeBasis =
  | 'per_m2_month'
  | 'per_bay_month'
  | 'fixed_monthly'
  | 'annual'
  | 'once';
export const COMMERCIAL_ECONOMIC_CHARGE_BASES = [
  'per_m2_month',
  'per_bay_month',
  'fixed_monthly',
  'annual',
  'once',
] as const;
export function isCommercialEconomicChargeBasis(
  value: unknown,
): value is CommercialEconomicChargeBasis {
  return COMMERCIAL_ECONOMIC_CHARGE_BASES.includes(value as CommercialEconomicChargeBasis);
}

export const COMMERCIAL_PRICING_MODES = ['componentised', 'gross_quote'] as const;
export type CommercialPricingMode = (typeof COMMERCIAL_PRICING_MODES)[number];
export function isCommercialPricingMode(value: unknown): value is CommercialPricingMode {
  return COMMERCIAL_PRICING_MODES.includes(value as CommercialPricingMode);
}

const recurringGrossIncludedCodes = new Set<CommercialEconomicComponentCode>([
  'base_rent',
  'operating_costs',
  'rates_recoveries',
]);

/** Gross rent replaces—not supplements—the component schedule it includes. */
export function assertCommercialPricingContract(input: {
  pricingMode: CommercialPricingMode;
  economics: readonly CommercialEconomicsInput[];
}): void {
  if (!isCommercialPricingMode(input.pricingMode)) {
    throw new Error('Commercial pricing requires a governed pricing mode.');
  }
  const seen = new Set<CommercialEconomicComponentCode>();
  for (const item of input.economics) {
    assertCommercialEconomicsInput(item);
    if (seen.has(item.componentCode)) {
      throw new Error(`Commercial pricing cannot declare ${item.componentCode} more than once.`);
    }
    seen.add(item.componentCode);
  }
  const codes = new Set(input.economics.map(item => item.componentCode));
  if (input.pricingMode === 'componentised') {
    if (codes.has('gross_rent')) {
      throw new Error('Componentised pricing cannot contain a gross rental component.');
    }
    const baseRent = input.economics.find(item => item.componentCode === 'base_rent');
    if (!baseRent || !['supplied', 'estimated'].includes(baseRent.valueState)) {
      throw new Error('Componentised pricing requires a supplied or estimated base rental.');
    }
    assertCommercialPrimaryRental(baseRent, 'Componentised pricing');
    return;
  }
  const gross = input.economics.find(item => item.componentCode === 'gross_rent');
  if (!gross || !['supplied', 'estimated'].includes(gross.valueState)) {
    throw new Error('Gross-quote pricing requires a supplied or estimated gross rental.');
  }
  assertCommercialPrimaryRental(gross, 'Gross-quote pricing');
  for (const code of recurringGrossIncludedCodes) {
    if (codes.has(code)) {
      throw new Error(
        `Gross-quote pricing cannot also include ${code}; this would double-count rent.`,
      );
    }
  }
}

export type CommercialEconomicsInput = {
  componentCode: CommercialEconomicComponentCode;
  valueState: CommercialEconomicValueState;
  chargeBasis: CommercialEconomicChargeBasis | null;
  amountMinor: number | null;
  rangeMaximumMinor: number | null;
};

export type CommercialCalculatedCost = {
  componentCode: string;
  valueState: 'calculated';
  monthlyMinimumMinor: number;
  monthlyMaximumMinor: number;
};

export function assertCommercialEconomicsInput(item: CommercialEconomicsInput): void {
  if (!isCommercialEconomicComponentCode(item.componentCode)) {
    throw new Error('Commercial economics requires a governed component code.');
  }
  if (!isCommercialEconomicValueState(item.valueState)) {
    throw new Error('Commercial economics requires a governed value state.');
  }
  if (item.chargeBasis !== null && !isCommercialEconomicChargeBasis(item.chargeBasis)) {
    throw new Error('Commercial economics requires a governed charge basis.');
  }
  const computable = item.valueState === 'supplied' || item.valueState === 'estimated';
  if (
    computable &&
    (item.amountMinor === null ||
      item.chargeBasis === null ||
      !Number.isSafeInteger(item.amountMinor) ||
      item.amountMinor < 0)
  ) {
    throw new Error(
      `${item.componentCode}: ${item.valueState} economics require an amount and charge basis; the amount must be a non-negative whole-cent value.`,
    );
  }
  if (
    !computable &&
    (item.amountMinor !== null || item.rangeMaximumMinor !== null || item.chargeBasis !== null)
  ) {
    throw new Error(
      `${item.componentCode}: ${item.valueState} economics cannot carry a cost value.`,
    );
  }
  if (
    item.rangeMaximumMinor !== null &&
    (item.amountMinor === null ||
      !Number.isSafeInteger(item.rangeMaximumMinor) ||
      item.rangeMaximumMinor < item.amountMinor)
  ) {
    throw new Error(
      `${item.componentCode}: economics range maximum must be greater than or equal to its amount.`,
    );
  }
}

function assertCommercialPrimaryRental(item: CommercialEconomicsInput, pricingLabel: string): void {
  if (item.amountMinor == null || item.amountMinor <= 0) {
    throw new Error(`${pricingLabel} requires a rental greater than zero.`);
  }
  if (!['per_m2_month', 'fixed_monthly'].includes(item.chargeBasis || '')) {
    throw new Error(`${pricingLabel} requires a per-m² monthly or fixed-monthly rental basis.`);
  }
}

export function assertCommercialAvailabilityFreshness(input: {
  availabilityState: CommercialAvailabilityState;
  occupationDate?: string | null;
  lastConfirmedAt?: string | null;
  confirmationSource?: string | null;
  confirmationSourceLabel?: string | null;
  reconfirmationDueAt?: string | null;
}): void {
  if (!isCommercialAvailabilityState(input.availabilityState)) {
    throw new Error('Commercial availability requires a governed availability state.');
  }
  if (input.availabilityState === 'available_upcoming' && !input.occupationDate) {
    throw new Error('Upcoming availability requires an occupation date.');
  }
  if (input.occupationDate && Number.isNaN(new Date(input.occupationDate).getTime())) {
    throw new Error('Availability occupation date must be valid.');
  }
  if (
    (input.availabilityState === 'available_confirmed' ||
      input.availabilityState === 'available_upcoming') &&
    (!input.lastConfirmedAt || !input.confirmationSource || !input.reconfirmationDueAt)
  ) {
    throw new Error(
      'Positive availability requires confirmation source, timestamp and reconfirmation deadline.',
    );
  }
  if (input.confirmationSource && !isCommercialConfirmationSource(input.confirmationSource)) {
    throw new Error(
      'Availability confirmation source must use the governed Commercial vocabulary.',
    );
  }
  if (input.confirmationSource === 'other' && !input.confirmationSourceLabel?.trim()) {
    throw new Error('Describe the source of the availability confirmation.');
  }
  const confirmedAt = input.lastConfirmedAt ? new Date(input.lastConfirmedAt) : null;
  const reconfirmationDueAt = input.reconfirmationDueAt
    ? new Date(input.reconfirmationDueAt)
    : null;
  if (confirmedAt && Number.isNaN(confirmedAt.getTime())) {
    throw new Error('Availability confirmation timestamp must be valid.');
  }
  if (reconfirmationDueAt && Number.isNaN(reconfirmationDueAt.getTime())) {
    throw new Error('Availability reconfirmation deadline must be valid.');
  }
  if (confirmedAt && (!reconfirmationDueAt || reconfirmationDueAt < confirmedAt)) {
    throw new Error(
      'Availability reconfirmation deadline must be on or after the confirmation timestamp.',
    );
  }
}

/**
 * Deterministic Cost Passport calculation. It accepts only authoritative
 * supplied inputs or explicitly labelled estimates; unknowns never become R0.
 */
export function deriveCommercialMonthlyOccupancyCost(input: {
  rentableAreaM2?: number | null;
  parkingBays?: number | null;
  economics: readonly CommercialEconomicsInput[];
}): {
  components: CommercialCalculatedCost[];
  monthlyMinimumMinor: number;
  monthlyMaximumMinor: number;
  unknownComponentCodes: string[];
} {
  const components: CommercialCalculatedCost[] = [];
  const unknownComponentCodes: string[] = [];

  for (const item of input.economics) {
    assertCommercialEconomicsInput(item);
    if (item.valueState === 'unknown') {
      unknownComponentCodes.push(item.componentCode);
      continue;
    }
    if (item.valueState === 'not_applicable' || item.amountMinor === null || !item.chargeBasis)
      continue;

    const requiredQuantity =
      item.chargeBasis === 'per_m2_month'
        ? input.rentableAreaM2
        : item.chargeBasis === 'per_bay_month'
          ? input.parkingBays
          : undefined;
    if (
      (item.chargeBasis === 'per_m2_month' || item.chargeBasis === 'per_bay_month') &&
      (requiredQuantity === null || requiredQuantity === undefined)
    ) {
      unknownComponentCodes.push(item.componentCode);
      continue;
    }
    const multiplier =
      item.chargeBasis === 'per_m2_month' || item.chargeBasis === 'per_bay_month'
        ? Number(requiredQuantity)
        : item.chargeBasis === 'annual'
          ? 1 / 12
          : item.chargeBasis === 'fixed_monthly'
            ? 1
            : 0;
    if (multiplier === 0) continue;

    components.push({
      componentCode: item.componentCode,
      valueState: 'calculated',
      monthlyMinimumMinor: Math.round(item.amountMinor * multiplier),
      monthlyMaximumMinor: Math.round((item.rangeMaximumMinor ?? item.amountMinor) * multiplier),
    });
  }

  return {
    components,
    monthlyMinimumMinor: components.reduce((total, item) => total + item.monthlyMinimumMinor, 0),
    monthlyMaximumMinor: components.reduce((total, item) => total + item.monthlyMaximumMinor, 0),
    unknownComponentCodes,
  };
}
