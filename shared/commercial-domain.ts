export const COMMERCIAL_SPACE_CLASSES = ['office', 'industrial_logistics', 'retail'] as const;
export type CommercialSpaceClass = (typeof COMMERCIAL_SPACE_CLASSES)[number];

export function assertCommercialSpaceAreas(input: {
  rentableAreaM2?: number | null;
  usableAreaM2?: number | null;
}): void {
  for (const [label, value] of [
    ['rentable area', input.rentableAreaM2],
    ['usable area', input.usableAreaM2],
  ] as const) {
    if (value !== null && value !== undefined && value <= 0) {
      throw new Error(`Commercial ${label} must be greater than zero when known.`);
    }
  }
}

export const COMMERCIAL_SPECIFICATION_VALUE_KINDS = {
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
} as const;
export type CommercialSpecificationCode = keyof typeof COMMERCIAL_SPECIFICATION_VALUE_KINDS;
export type CommercialSpecificationValueKind =
  (typeof COMMERCIAL_SPECIFICATION_VALUE_KINDS)[CommercialSpecificationCode];
export type CommercialSpecificationValueState =
  | 'known'
  | 'unknown'
  | 'unavailable'
  | 'not_applicable';

export type CommercialSpecificationInput = {
  specificationCode: CommercialSpecificationCode;
  valueState: CommercialSpecificationValueState;
  numericValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
};

export function assertCommercialSpecificationInput(input: CommercialSpecificationInput): void {
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

export type CommercialEconomicValueState = 'supplied' | 'estimated' | 'unknown' | 'not_applicable';
export type CommercialEconomicChargeBasis =
  | 'per_m2_month'
  | 'per_bay_month'
  | 'fixed_monthly'
  | 'annual'
  | 'once';

export type CommercialEconomicsInput = {
  componentCode: string;
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
  const computable = item.valueState === 'supplied' || item.valueState === 'estimated';
  if (computable && (item.amountMinor === null || item.chargeBasis === null)) {
    throw new Error(
      `${item.componentCode}: ${item.valueState} economics require an amount and charge basis.`,
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
    (item.amountMinor === null || item.rangeMaximumMinor < item.amountMinor)
  ) {
    throw new Error(
      `${item.componentCode}: economics range maximum must be greater than or equal to its amount.`,
    );
  }
}

export function assertCommercialAvailabilityFreshness(input: {
  availabilityState: CommercialAvailabilityState;
  occupationDate?: string | null;
  lastConfirmedAt?: string | null;
  confirmationSource?: string | null;
  reconfirmationDueAt?: string | null;
}): void {
  if (input.availabilityState === 'available_upcoming' && !input.occupationDate) {
    throw new Error('Upcoming availability requires an occupation date.');
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
  if (
    input.lastConfirmedAt &&
    (!input.reconfirmationDueAt ||
      new Date(input.reconfirmationDueAt) < new Date(input.lastConfirmedAt))
  ) {
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
