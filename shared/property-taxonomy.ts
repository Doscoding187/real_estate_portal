/**
 * Canonical property taxonomy authority.
 *
 * This module separates the physical kind of an inventory item from its
 * transaction intent, title/context, and future offering modes.  The source
 * listing model still carries a small number of historical values so old
 * records can be read safely; live authoring consumes only the active set.
 */

export const LISTING_INTENTS = ['sale', 'rent'] as const;
export type PropertyListingIntent = (typeof LISTING_INTENTS)[number];

export const CANONICAL_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
  'farm',
  'plot',
  'commercial',
] as const;
export type CanonicalPropertyType = (typeof CANONICAL_PROPERTY_TYPES)[number];

/** Values retained in the authored-listing column for historical compatibility. */
export const LEGACY_SOURCE_PROPERTY_TYPES = ['land', 'shared_living'] as const;
export type LegacySourcePropertyType = (typeof LEGACY_SOURCE_PROPERTY_TYPES)[number];

/** Complete source-column vocabulary, including additive future/legacy values. */
export const LISTING_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
  'farm',
  'plot',
  'commercial',
  'land',
  'shared_living',
] as const;
export type ListingPropertyType = (typeof LISTING_PROPERTY_TYPES)[number];

/** Public projection vocabulary currently understood by consumer surfaces. */
export const PUBLIC_PROPERTY_TYPES = [
  'apartment',
  'house',
  'villa',
  'plot',
  'commercial',
  'townhouse',
  'cluster_home',
  'farm',
  'shared_living',
] as const;
export type PublicPropertyType = (typeof PUBLIC_PROPERTY_TYPES)[number];

/**
 * The manual Property Listing Engine may expose only types with a coherent
 * current public journey. Land/plot and Commercial remain persisted/public
 * compatibility values until their deferred journeys are made coherent.
 */
export const ACTIVE_MANUAL_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
  'farm',
] as const;
export type ActiveManualPropertyType = (typeof ACTIVE_MANUAL_PROPERTY_TYPES)[number];

export type PropertyTypeAuthoringState = 'active' | 'deferred' | 'legacy';

export interface PropertyTypeDefinition {
  value: ListingPropertyType;
  canonicalType: CanonicalPropertyType | null;
  label: string;
  icon: string;
  description: string;
  allowedIntents: readonly PropertyListingIntent[];
  authoringState: PropertyTypeAuthoringState;
  publicType: PublicPropertyType;
  publicJourney: 'buy' | 'rent' | 'buy_and_rent' | 'legacy_shared_living' | 'deferred';
  aliases: readonly string[];
}

const SALE_AND_RENT: readonly PropertyListingIntent[] = ['sale', 'rent'];

/** One definition per value that can be stored on a manual listing. */
export const PROPERTY_TYPE_DEFINITIONS: Record<ListingPropertyType, PropertyTypeDefinition> = {
  apartment: {
    value: 'apartment',
    canonicalType: 'apartment',
    label: 'Apartment / Flat',
    icon: 'Building2',
    description: 'Flats, units, and sectional-title properties',
    allowedIntents: SALE_AND_RENT,
    authoringState: 'active',
    publicType: 'apartment',
    publicJourney: 'buy_and_rent',
    aliases: ['flat', 'unit'],
  },
  house: {
    value: 'house',
    canonicalType: 'house',
    label: 'House',
    icon: 'Home',
    description: 'Freestanding homes with their own residential site',
    allowedIntents: SALE_AND_RENT,
    authoringState: 'active',
    publicType: 'house',
    publicJourney: 'buy_and_rent',
    aliases: ['freestanding_house'],
  },
  townhouse: {
    value: 'townhouse',
    canonicalType: 'townhouse',
    label: 'Townhouse',
    icon: 'Home',
    description: 'Attached or semi-attached home, usually within a complex',
    allowedIntents: SALE_AND_RENT,
    authoringState: 'active',
    publicType: 'townhouse',
    publicJourney: 'buy_and_rent',
    aliases: ['town_home'],
  },
  cluster_home: {
    value: 'cluster_home',
    canonicalType: 'cluster_home',
    label: 'Cluster Home',
    icon: 'Home',
    description: 'A freestanding home within a managed complex or estate',
    allowedIntents: SALE_AND_RENT,
    authoringState: 'active',
    publicType: 'cluster_home',
    publicJourney: 'buy_and_rent',
    aliases: ['cluster'],
  },
  farm: {
    value: 'farm',
    canonicalType: 'farm',
    label: 'Farm / Smallholding',
    icon: 'Wheat',
    description: 'Agricultural land, farms, and smallholdings',
    allowedIntents: SALE_AND_RENT,
    authoringState: 'active',
    publicType: 'farm',
    publicJourney: 'buy_and_rent',
    aliases: ['smallholding', 'agricultural_property'],
  },
  plot: {
    value: 'plot',
    canonicalType: 'plot',
    label: 'Land / Plot',
    icon: 'Map',
    description: 'Vacant land and development plots',
    allowedIntents: ['sale'],
    authoringState: 'deferred',
    publicType: 'plot',
    publicJourney: 'deferred',
    aliases: ['vacant_land', 'plot_land'],
  },
  commercial: {
    value: 'commercial',
    canonicalType: 'commercial',
    label: 'Commercial',
    icon: 'Store',
    description: 'Office, retail, industrial, and mixed-use property',
    allowedIntents: SALE_AND_RENT,
    authoringState: 'deferred',
    publicType: 'commercial',
    publicJourney: 'deferred',
    aliases: ['business_property'],
  },
  land: {
    value: 'land',
    canonicalType: 'plot',
    label: 'Land / Plot',
    icon: 'Map',
    description: 'Historical vacant-land source value; maps publicly to plot',
    allowedIntents: ['sale'],
    authoringState: 'legacy',
    publicType: 'plot',
    publicJourney: 'deferred',
    aliases: ['plot'],
  },
  shared_living: {
    value: 'shared_living',
    canonicalType: null,
    label: 'Shared Living',
    icon: 'Users',
    description: 'Historical room or co-living source value',
    allowedIntents: ['rent'],
    authoringState: 'legacy',
    publicType: 'shared_living',
    publicJourney: 'legacy_shared_living',
    aliases: ['shared', 'co_living', 'room_rental'],
  },
};

export type PropertyTypeTemplate = Pick<PropertyTypeDefinition, 'label' | 'icon' | 'description'>;

/** Compatibility export for older wizard consumers; it has no fake validation metadata. */
export const PROPERTY_TYPE_TEMPLATES = Object.fromEntries(
  Object.entries(PROPERTY_TYPE_DEFINITIONS).map(([value, definition]) => [
    value,
    {
      label: definition.label,
      icon: definition.icon,
      description: definition.description,
    },
  ]),
) as Record<ListingPropertyType, PropertyTypeTemplate>;

/**
 * Types that a buyer may select in the current Buy journey. These values must
 * be backed by an active inventory producer; this is intentionally not a
 * mirror of every value the public projection can still read.
 */
export const BUY_ACTIVE_PUBLIC_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
  'farm',
] as const satisfies readonly PublicPropertyType[];

/**
 * Compatibility-only Buy values. Villa remains queryable for existing public
 * inventory and historical shared URLs, but has no active manual or
 * development inventory producer and must not be offered as a new selection.
 */
export const BUY_LEGACY_PUBLIC_PROPERTY_TYPES = ['villa'] as const satisfies readonly PublicPropertyType[];

/**
 * Complete Buy read vocabulary. Keep this distinct from the active selection
 * list above so compatibility does not silently become product capability.
 */
export const BUY_PUBLIC_PROPERTY_TYPES = [
  ...BUY_ACTIVE_PUBLIC_PROPERTY_TYPES,
  ...BUY_LEGACY_PUBLIC_PROPERTY_TYPES,
] as const satisfies readonly PublicPropertyType[];

export type BuyPublicPropertyType = (typeof BUY_PUBLIC_PROPERTY_TYPES)[number];

export const RENT_PUBLIC_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
  'farm',
] as const satisfies readonly PublicPropertyType[];

export type RentPublicPropertyType = (typeof RENT_PUBLIC_PROPERTY_TYPES)[number];

/**
 * Homes selection vocabularies. Farm composes only through the dedicated
 * Farms & Smallholdings journey; it remains a readable public value for
 * historical URLs and inventory, but is never offered as a Homes refinement.
 * The `satisfies` guards keep these lists compile-time pinned to the public
 * vocabulary, and the taxonomy contract test pins their exact membership.
 */
export const HOMES_BUY_SELECTABLE_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
] as const satisfies readonly PublicPropertyType[];

export const HOMES_RENT_SELECTABLE_PROPERTY_TYPES = [
  'apartment',
  'house',
  'townhouse',
  'cluster_home',
] as const satisfies readonly PublicPropertyType[];

export function getPropertyTypeDefinition(value: unknown): PropertyTypeDefinition | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.prototype.hasOwnProperty.call(PROPERTY_TYPE_DEFINITIONS, value)
    ? PROPERTY_TYPE_DEFINITIONS[value as ListingPropertyType]
    : undefined;
}

export function isListingPropertyType(value: unknown): value is ListingPropertyType {
  return typeof value === 'string' && (LISTING_PROPERTY_TYPES as readonly string[]).includes(value);
}

export function isActiveManualPropertyType(value: unknown): value is ActiveManualPropertyType {
  return (
    typeof value === 'string' && (ACTIVE_MANUAL_PROPERTY_TYPES as readonly string[]).includes(value)
  );
}

export function getAuthorablePropertyTypes(
  intent?: PropertyListingIntent,
): ActiveManualPropertyType[] {
  return ACTIVE_MANUAL_PROPERTY_TYPES.filter(type => {
    if (!intent) return true;
    return PROPERTY_TYPE_DEFINITIONS[type].allowedIntents.includes(intent);
  });
}

export function isIntentCompatiblePropertyType(
  value: unknown,
  intent: PropertyListingIntent,
): boolean {
  return (
    isActiveManualPropertyType(value) &&
    PROPERTY_TYPE_DEFINITIONS[value].allowedIntents.includes(intent)
  );
}

/**
 * Explicit source-to-public mapping. Historical `land` is never written into
 * the public `properties.propertyType` enum; it is represented as `plot`.
 */
export function toPublicPropertyType(value: string): PublicPropertyType {
  if (value === 'villa') return 'villa';
  const definition = getPropertyTypeDefinition(value);
  if (!definition) {
    throw new Error(`Unsupported listing property type for public projection: ${value}`);
  }
  return definition.publicType;
}

export function getListingAuthoringValidationMessage(
  action: 'sell' | 'rent' | 'auction',
  propertyType: unknown,
): string | undefined {
  // Auction remains readable as legacy transport but is not a new Step 1
  // intent. Do not use this slice to rewrite existing auction records.
  if (action === 'auction') return undefined;

  const intent: PropertyListingIntent = action === 'sell' ? 'sale' : 'rent';
  if (!isListingPropertyType(propertyType)) {
    return 'Choose a supported property type.';
  }
  if (!isActiveManualPropertyType(propertyType)) {
    return `${PROPERTY_TYPE_DEFINITIONS[propertyType].label} is not available for new listings yet.`;
  }
  if (!isIntentCompatiblePropertyType(propertyType, intent)) {
    return `${PROPERTY_TYPE_DEFINITIONS[propertyType].label} is not available for this listing intent.`;
  }
  return undefined;
}
