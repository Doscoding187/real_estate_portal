import type { CorePropertyInformation } from './core-property-information';
import {
  getStep4HighlightLabel,
  getStep4SecurityFeatureLabel,
  getStep4SpaceLabel,
  type FeaturesContext,
} from './features-context';
import type {
  ActivePricingContract,
  RecurringChargeFact,
  RecurringCosts,
} from './pricing-contract';
import { normalizeCoordinatePair } from './location-contract';
import { PROPERTY_TYPE_DEFINITIONS, type ListingPropertyType } from './property-taxonomy';

/**
 * Buyer-facing presentation is derived once, at the approved public DTO
 * boundary. It deliberately contains display-ready facts only: the browser
 * must not re-interpret extensible authoring JSON or pricing aliases.
 */
export const PUBLIC_PROPERTY_DETAIL_PRESENTATION_VERSION = 2 as const;

export type PublicPropertyDetailIcon =
  | 'area'
  | 'floorSize'
  | 'yardSize'
  | 'landSize'
  | 'bedrooms'
  | 'bathrooms'
  | 'parking'
  | 'property'
  | 'electricity'
  | 'water'
  | 'backupPower'
  | 'sewerage'
  | 'security'
  | 'internet'
  | 'cost'
  | 'pets'
  | 'location'
  | 'feature';

export type PublicPropertyDetailFactStatus = 'known' | 'not_supplied' | 'not_applicable';

export interface PublicPropertyDetailFact {
  key: string;
  label: string;
  value: string;
  icon: PublicPropertyDetailIcon;
  status: PublicPropertyDetailFactStatus;
}

export interface PublicPropertyDetailFeatureGroup {
  key: string;
  title: string;
  items: Array<{
    key: string;
    label: string;
  }>;
}

export interface PublicPropertyDetailMediaSummary {
  photoCount: number;
  videoCount: number;
  floorPlanCount: number;
  documentCount: number;
  hasVirtualTour: boolean;
}

/**
 * The public location is a presentation boundary in its own right. It carries
 * only the approved public projection, never authoring address evidence or a
 * provider place ID. Approximate coordinates are useful for orienting a buyer
 * to an area, but are deliberately labelled so they are never mistaken for a
 * property pin.
 */
export interface PublicPropertyLocationPresentation {
  label: string;
  precision: 'approximate' | 'exact';
  precisionLabel: string;
  description: string;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  mapsUrl: string | null;
}

export interface PublicPropertyDetailPresentation {
  version: typeof PUBLIC_PROPERTY_DETAIL_PRESENTATION_VERSION;
  listingIntent: 'sale' | 'rent';
  price: {
    label: string;
    value: string;
    supportingText?: string;
  };
  heroFacts: PublicPropertyDetailFact[];
  buyerChecks: PublicPropertyDetailFact[];
  /**
   * Sale costs are intentionally supporting detail rather than hero facts.
   * We expose only confirmed figures, so the page never fills a card with
   * speculative or unavailable financial information.
   */
  runningCosts: PublicPropertyDetailFact[];
  featureGroups: PublicPropertyDetailFeatureGroup[];
  propertyContext: PublicPropertyDetailFact[];
  location: PublicPropertyLocationPresentation;
  media: PublicPropertyDetailMediaSummary;
}

export interface BuildPublicPropertyDetailPresentationInput {
  listingType: unknown;
  propertyType: unknown;
  price: unknown;
  corePropertyInformation: CorePropertyInformation;
  featuresContext: FeaturesContext;
  pricingContract?: ActivePricingContract;
  /**
   * This must be populated from the public listing projection. It is kept
   * separate from raw listing fields so callers cannot accidentally pass
   * private authoring location evidence into a browser-facing detail payload.
   */
  publicLocation: {
    address?: unknown;
    city?: unknown;
    province?: unknown;
    precision?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  };
  media: ReadonlyArray<{
    mediaType: 'image' | 'video' | 'floorplan' | 'pdf';
    presentationKind?: 'floorplan' | 'document';
  }>;
  photoCount: number;
  hasVirtualTour: boolean;
}

const humanize = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-ZA', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);

const formatArea = (value: number) => `${formatNumber(value)} m²`;
const formatZar = (value: number) => `R ${formatNumber(value)}`;

const finiteNumber = (value: unknown): number | undefined => {
  const candidate = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(candidate) ? candidate : undefined;
};

const textValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const knownNumber = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const fact = value as { status?: unknown; value?: unknown };
  if (fact.status !== 'known') return undefined;
  return finiteNumber(fact.value);
};

const knownArea = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const fact = value as { status?: unknown; valueM2?: unknown; normalizedM2?: unknown };
  if (fact.status !== 'known') return undefined;
  return finiteNumber(fact.valueM2 ?? fact.normalizedM2);
};

const knownFarmArea = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const fact = value as { status?: unknown; normalizedM2?: unknown };
  return fact.status === 'known' ? finiteNumber(fact.normalizedM2) : undefined;
};

const statusFor = (value: unknown): PublicPropertyDetailFactStatus =>
  value === undefined || value === null || value === '' || value === 'unknown'
    ? 'not_supplied'
    : 'known';

const fact = (
  key: string,
  label: string,
  value: string,
  icon: PublicPropertyDetailIcon,
  status: PublicPropertyDetailFactStatus = 'known',
): PublicPropertyDetailFact => ({ key, label, value, icon, status });

const suppliedOrMissing = (
  key: string,
  label: string,
  value: unknown,
  icon: PublicPropertyDetailIcon,
): PublicPropertyDetailFact => {
  const status = statusFor(value);
  return fact(
    key,
    label,
    status === 'known' ? humanize(String(value)) : 'Not supplied',
    icon,
    status,
  );
};

const parkingFact = (core: CorePropertyInformation): PublicPropertyDetailFact => {
  const parkingBays = knownNumber(core.parkingBays);
  const garages = knownNumber(core.garages);
  const parts: string[] = [];
  if (garages !== undefined) {
    parts.push(`${garages} ${garages === 1 ? 'garage' : 'garages'}`);
  }
  if (parkingBays !== undefined) {
    parts.push(`${parkingBays} ${parkingBays === 1 ? 'parking bay' : 'parking bays'}`);
  }
  return fact(
    'parking',
    'Parking',
    parts.length > 0 ? parts.join(' · ') : 'Not supplied',
    'parking',
    parts.length > 0 ? 'known' : 'not_supplied',
  );
};

const primaryPrice = (
  intent: 'sale' | 'rent',
  contract: ActivePricingContract | undefined,
  rawPrice: unknown,
) => {
  const fromContract =
    contract?.intent === 'sale'
      ? contract.askingPrice
      : contract?.intent === 'rent'
        ? contract.monthlyRent
        : undefined;
  const amount = finiteNumber(fromContract ?? rawPrice);
  return amount !== undefined && amount > 0 ? amount : undefined;
};

const formatCharge = (charge: RecurringChargeFact) => {
  if (charge.status === 'zero') return 'R 0';
  if (charge.status === 'unknown') return 'Not supplied';
  if (charge.status === 'not_applicable') return 'Not applicable';
  const amount = finiteNumber(charge.amount);
  if (amount === undefined) return 'Not supplied';
  const cadence =
    charge.cadence === 'annual' ? ' / year' : charge.cadence === 'once' ? ' once' : ' / month';
  return `${formatZar(amount)}${cadence}`;
};

const chargeFact = (
  key: string,
  label: string,
  charge: RecurringChargeFact | undefined,
): PublicPropertyDetailFact | null => {
  if (!charge) return null;
  const status: PublicPropertyDetailFactStatus =
    charge.status === 'known' || charge.status === 'zero'
      ? 'known'
      : charge.status === 'not_applicable'
        ? 'not_applicable'
        : 'not_supplied';
  return fact(key, label, formatCharge(charge), 'cost', status);
};

const chargeFactOrMissing = (
  key: string,
  label: string,
  charge: RecurringChargeFact | undefined,
): PublicPropertyDetailFact =>
  chargeFact(key, label, charge) ?? fact(key, label, 'Not supplied', 'cost', 'not_supplied');

const SECURITY_FEATURE_PRIORITY = [
  'guard_24hr',
  'access_control',
  'cctv',
  'electric_fence',
  'alarm',
  'outdoor_beams',
  'security_gates',
  'intercom',
] as const;

const securityProfileLabel = (profile: FeaturesContext['context']['securityProfile']) => {
  if (profile === 'security_estate') return 'Security estate';
  if (profile === 'gated_community') return 'Gated community';
  if (profile === 'standard') return 'Standard security';
  return undefined;
};

const securityFeatureSummary = (context: FeaturesContext): string | undefined => {
  if (context.security.status !== 'known') return undefined;
  const features = [...context.security.features].sort((left, right) => {
    const leftIndex = SECURITY_FEATURE_PRIORITY.indexOf(
      left as (typeof SECURITY_FEATURE_PRIORITY)[number],
    );
    const rightIndex = SECURITY_FEATURE_PRIORITY.indexOf(
      right as (typeof SECURITY_FEATURE_PRIORITY)[number],
    );
    return (
      (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
    );
  });
  if (features.length === 0) return undefined;
  const primary = getStep4SecurityFeatureLabel(features[0]);
  // The hero has one narrow value column. It answers the most material
  // operational question concisely; the complete confirmed feature set stays
  // available in the Security section below.
  return primary === '24-hour guard' ? '24/7' : primary;
};

/**
 * Security is one buyer question. The hero answers the most useful operational
 * detail concisely; the direct setting (security estate, gated community or
 * standard residential setting) remains a property-context fact below the
 * fold, where it can be evaluated without overloading the decision panel.
 */
const securityFact = (context: FeaturesContext): PublicPropertyDetailFact => {
  const profile = context.context.securityProfile;
  const profileLabel = securityProfileLabel(profile);
  const featureSummary = securityFeatureSummary(context);
  if (featureSummary) return fact('security', 'Security', featureSummary, 'security');
  if (profileLabel) return fact('security', 'Security', profileLabel, 'security');
  if (context.context.controlledAccess === 'controlled') {
    return fact('security', 'Security', 'Controlled access', 'security');
  }
  return fact('security', 'Security', 'Not supplied', 'security', 'not_supplied');
};

const levyFact = (costs: RecurringCosts): PublicPropertyDetailFact => {
  const candidates = [
    { label: 'Body corporate levy', charge: costs.bodyCorporateLevy },
    { label: 'Estate levy', charge: costs.hoaEstateLevy },
    { label: 'Mandatory charge', charge: costs.otherMandatoryCharge },
    { label: 'Special levy', charge: costs.specialLevy },
  ];
  const candidate =
    candidates.find(item => item.charge?.status === 'known' || item.charge?.status === 'zero') ||
    candidates.find(item => item.charge);
  return chargeFactOrMissing('levy', candidate?.label || 'Levy', candidate?.charge);
};

const runningCostsFor = (
  pricingContract: ActivePricingContract | undefined,
): PublicPropertyDetailFact[] => {
  if (pricingContract?.intent !== 'sale') return [];

  const ratesAndTaxes = chargeFact(
    'rates-and-taxes',
    'Rates & taxes',
    pricingContract.recurringCosts.ratesAndTaxes,
  );
  const levy = levyFact(pricingContract.recurringCosts);

  return [ratesAndTaxes, levy].filter((item): item is PublicPropertyDetailFact =>
    Boolean(item && item.status === 'known'),
  );
};

const propertyTypeLabel = (propertyType: unknown) => {
  const type = String(propertyType || '')
    .trim()
    .toLowerCase() as ListingPropertyType;
  return PROPERTY_TYPE_DEFINITIONS[type]?.label || humanize(type || 'Property');
};

const heroFactsFor = (
  propertyType: string,
  core: CorePropertyInformation,
): PublicPropertyDetailFact[] => {
  const internalArea = knownArea(core.internalArea);
  const erfArea = knownArea(core.erfArea);
  const farmArea = knownFarmArea(core.farmLandArea);
  const bedrooms = knownNumber(core.bedrooms);
  const bathrooms = knownNumber(core.bathrooms);
  const floorLevel = knownNumber(core.floorLevel);
  const parking = parkingFact(core);

  const available = new Map<string, PublicPropertyDetailFact>();
  if (internalArea !== undefined) {
    available.set(
      'internal-area',
      fact('internal-area', 'Floor size', formatArea(internalArea), 'floorSize'),
    );
  }
  if (erfArea !== undefined) {
    available.set('erf-area', fact('erf-area', 'Yard size', formatArea(erfArea), 'yardSize'));
  }
  if (farmArea !== undefined) {
    available.set('farm-area', fact('farm-area', 'Land size', formatArea(farmArea), 'landSize'));
  }
  if (bedrooms !== undefined) {
    available.set('bedrooms', fact('bedrooms', 'Bedrooms', String(bedrooms), 'bedrooms'));
  }
  if (bathrooms !== undefined) {
    available.set('bathrooms', fact('bathrooms', 'Bathrooms', String(bathrooms), 'bathrooms'));
  }
  if (parking.status === 'known') available.set('parking', parking);
  if (floorLevel !== undefined) {
    available.set(
      'floor-level',
      fact(
        'floor-level',
        'Floor level',
        floorLevel === 0 ? 'Ground floor' : `Level ${floorLevel}`,
        'property',
      ),
    );
  }

  const type = propertyType.toLowerCase();
  const preferredKeys =
    type === 'apartment' || type === 'flat'
      ? ['internal-area', 'bedrooms', 'bathrooms', 'parking', 'floor-level']
      : type === 'house' || type === 'villa' || type === 'freestanding' || type === 'cluster_home'
        ? ['internal-area', 'bedrooms', 'bathrooms', 'erf-area', 'parking']
        : type === 'townhouse' || type === 'duplex'
          ? ['internal-area', 'bedrooms', 'bathrooms', 'erf-area', 'parking']
          : type === 'farm'
            ? ['farm-area', 'bedrooms', 'bathrooms', 'internal-area', 'parking']
            : ['internal-area', 'bedrooms', 'bathrooms', 'parking', 'erf-area', 'farm-area'];

  return preferredKeys
    .map(key => available.get(key))
    .filter((item): item is PublicPropertyDetailFact => Boolean(item))
    .slice(0, 4);
};

const featureGroupsFor = (context: FeaturesContext): PublicPropertyDetailFeatureGroup[] => {
  const groups = new Map<string, PublicPropertyDetailFeatureGroup>([
    ['living', { key: 'living', title: 'Living spaces', items: [] }],
    ['kitchen', { key: 'kitchen', title: 'Kitchen & utility', items: [] }],
    ['outdoor', { key: 'outdoor', title: 'Outdoor', items: [] }],
    ['other', { key: 'other', title: 'Other spaces', items: [] }],
    ['resilience', { key: 'resilience', title: 'Resilience & connectivity', items: [] }],
    ['security', { key: 'security', title: 'Security', items: [] }],
    ['highlights', { key: 'highlights', title: 'Property highlights', items: [] }],
  ]);
  const spaceGroup: Record<string, string> = {
    study_office: 'living',
    entertainment_area: 'living',
    gym: 'living',
    scullery: 'kitchen',
    laundry_room: 'kitchen',
    pantry: 'kitchen',
    balcony_patio: 'outdoor',
    garden: 'outdoor',
    pool: 'outdoor',
    staff_quarters: 'other',
    storage_room: 'other',
  };

  for (const space of context.spaces) {
    groups.get(spaceGroup[space] || 'other')?.items.push({
      key: `space-${space}`,
      label: getStep4SpaceLabel(space),
    });
  }
  for (const customFeature of context.customFeatures) {
    groups.get('other')?.items.push({ key: `custom-${customFeature}`, label: customFeature });
  }

  const resilience = groups.get('resilience')!;
  if (context.utilities.backupPower && context.utilities.backupPower !== 'unknown') {
    resilience.items.push({
      key: 'backup-power',
      label: `${humanize(context.utilities.backupPower)} backup power`,
    });
  }
  if (context.utilities.internetAccess && context.utilities.internetAccess !== 'unknown') {
    resilience.items.push({
      key: 'internet',
      label: `${humanize(context.utilities.internetAccess)} internet`,
    });
  }
  if (context.utilities.waterHeating && context.utilities.waterHeating !== 'unknown') {
    resilience.items.push({
      key: 'water-heating',
      label: humanize(context.utilities.waterHeating),
    });
  }
  if (context.utilities.wastewaterSystem && context.utilities.wastewaterSystem !== 'unknown') {
    resilience.items.push({
      key: 'wastewater-system',
      label: `Sewerage: ${humanize(context.utilities.wastewaterSystem)}`,
    });
  }

  const security = groups.get('security')!;
  const profileLabel = securityProfileLabel(context.context.securityProfile);
  if (profileLabel) {
    security.items.push({ key: 'security-profile', label: profileLabel });
  }
  if (context.security.status === 'known') {
    for (const featureKey of context.security.features) {
      security.items.push({
        key: `security-${featureKey}`,
        label: getStep4SecurityFeatureLabel(featureKey),
      });
    }
  }

  const highlights = groups.get('highlights')!;
  for (const highlight of context.highlights) {
    highlights.items.push({
      key: `highlight-${highlight}`,
      label: getStep4HighlightLabel(highlight),
    });
  }
  for (const customHighlight of context.customHighlights) {
    highlights.items.push({ key: `custom-highlight-${customHighlight}`, label: customHighlight });
  }

  return Array.from(groups.values()).filter(group => group.items.length > 0);
};

const contextFactsFor = (
  propertyType: unknown,
  core: CorePropertyInformation,
  context: FeaturesContext,
): PublicPropertyDetailFact[] => {
  const result: PublicPropertyDetailFact[] = [
    fact('property-type', 'Property type', propertyTypeLabel(propertyType), 'property'),
  ];
  const internalArea = knownArea(core.internalArea);
  const erfArea = knownArea(core.erfArea);
  const farmArea = knownFarmArea(core.farmLandArea);
  const floorLevel = knownNumber(core.floorLevel);
  if (internalArea !== undefined) {
    result.push(fact('floor-size', 'Floor size', formatArea(internalArea), 'floorSize'));
  }
  if (erfArea !== undefined) {
    result.push(fact('erf-size', 'Erf size', formatArea(erfArea), 'yardSize'));
  }
  if (farmArea !== undefined) {
    result.push(fact('land-size', 'Land size', formatArea(farmArea), 'landSize'));
  }
  if (floorLevel !== undefined) {
    result.push(
      fact(
        'floor-level',
        'Floor level',
        floorLevel === 0 ? 'Ground floor' : `Level ${floorLevel}`,
        'property',
      ),
    );
  }
  if (context.context.setting && context.context.setting !== 'unknown') {
    result.push(fact('setting', 'Setting', humanize(context.context.setting), 'location'));
  }
  if (context.context.controlledAccess && context.context.controlledAccess !== 'unknown') {
    result.push(
      fact(
        'controlled-access',
        'Access',
        context.context.controlledAccess === 'controlled' ? 'Controlled access' : 'Open access',
        'security',
      ),
    );
  }
  const profileLabel = securityProfileLabel(context.context.securityProfile);
  if (profileLabel) {
    result.push(fact('security-profile', 'Security setting', profileLabel, 'security'));
  }
  if (core.farmUse) result.push(fact('farm-use', 'Farm use', humanize(core.farmUse), 'property'));
  if (core.residenceIncluded !== undefined) {
    result.push(
      fact(
        'residence-included',
        'Residence',
        core.residenceIncluded ? 'Included' : 'Not included',
        'property',
      ),
    );
  }
  return result;
};

const mediaSummaryFor = (
  media: BuildPublicPropertyDetailPresentationInput['media'],
  photoCount: number,
  hasVirtualTour: boolean,
): PublicPropertyDetailMediaSummary => ({
  photoCount,
  videoCount: media.filter(item => item.mediaType === 'video').length,
  floorPlanCount: media.filter(
    item => item.mediaType === 'floorplan' || item.presentationKind === 'floorplan',
  ).length,
  documentCount: media.filter(
    item => item.mediaType === 'pdf' && item.presentationKind !== 'floorplan',
  ).length,
  hasVirtualTour,
});

const locationPresentationFor = (
  location: BuildPublicPropertyDetailPresentationInput['publicLocation'],
): PublicPropertyLocationPresentation => {
  const precision = location.precision === 'exact' ? 'exact' : 'approximate';
  const address = textValue(location.address);
  const areaLabel = [textValue(location.city), textValue(location.province)]
    .filter((value): value is string => Boolean(value))
    .join(', ');
  const label = address || areaLabel || 'Location available on enquiry';
  const coordinates = normalizeCoordinatePair(location.latitude, location.longitude);
  const mapsUrl = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${coordinates.latitude},${coordinates.longitude}`,
      )}`
    : null;

  return {
    label,
    precision,
    precisionLabel:
      precision === 'exact' ? 'Publicly listed location' : 'Approximate area location',
    description:
      precision === 'exact'
        ? 'This is the public location supplied with the approved listing.'
        : "The marker represents the public area, not the property's exact position.",
    coordinates,
    mapsUrl,
  };
};

export function buildPublicPropertyDetailPresentation(
  input: BuildPublicPropertyDetailPresentationInput,
): PublicPropertyDetailPresentation {
  const listingIntent = String(input.listingType).trim().toLowerCase() === 'rent' ? 'rent' : 'sale';
  const type = String(input.propertyType || '')
    .trim()
    .toLowerCase();
  const priceAmount = primaryPrice(listingIntent, input.pricingContract, input.price);
  const priceSupportingText =
    input.pricingContract?.intent === 'sale' && input.pricingContract.negotiability !== 'unknown'
      ? input.pricingContract.negotiability === 'negotiable'
        ? 'Price negotiable'
        : 'Price not negotiable'
      : input.pricingContract?.intent === 'rent' && input.pricingContract.deposit
        ? input.pricingContract.deposit.status === 'known' &&
          input.pricingContract.deposit.amount !== undefined
          ? `Deposit ${formatZar(input.pricingContract.deposit.amount)}`
          : input.pricingContract.deposit.status === 'zero'
            ? 'No deposit'
            : input.pricingContract.deposit.status === 'not_applicable'
              ? 'Deposit not applicable'
              : 'Deposit not supplied'
        : undefined;

  // This is deliberately a six-question buyer-readiness panel. It is a
  // focused scan of essential services and lifestyle constraints, not a
  // flattened extract of every property field.
  const buyerChecks: PublicPropertyDetailFact[] = [
    suppliedOrMissing(
      'electricity',
      'Electricity',
      input.featuresContext.utilities.electricitySupply,
      'electricity',
    ),
    suppliedOrMissing('water', 'Water', input.featuresContext.utilities.waterSupply, 'water'),
    suppliedOrMissing(
      'backup-power',
      'Backup power',
      input.featuresContext.utilities.backupPower,
      'backupPower',
    ),
    securityFact(input.featuresContext),
    suppliedOrMissing(
      'internet',
      'Internet',
      input.featuresContext.utilities.internetAccess,
      'internet',
    ),
    suppliedOrMissing('pet-policy', 'Pet policy', input.featuresContext.petPolicy, 'pets'),
  ];

  return {
    version: PUBLIC_PROPERTY_DETAIL_PRESENTATION_VERSION,
    listingIntent,
    price: {
      label: listingIntent === 'rent' ? 'Monthly rent' : 'Asking price',
      value: priceAmount
        ? `${formatZar(priceAmount)}${listingIntent === 'rent' ? ' / month' : ''}`
        : 'Price on request',
      ...(priceSupportingText ? { supportingText: priceSupportingText } : {}),
    },
    heroFacts: heroFactsFor(type, input.corePropertyInformation),
    buyerChecks,
    runningCosts: runningCostsFor(input.pricingContract),
    featureGroups: featureGroupsFor(input.featuresContext),
    propertyContext: contextFactsFor(
      input.propertyType,
      input.corePropertyInformation,
      input.featuresContext,
    ),
    location: locationPresentationFor(input.publicLocation),
    media: mediaSummaryFor(input.media, input.photoCount, input.hasVirtualTour),
  };
}
