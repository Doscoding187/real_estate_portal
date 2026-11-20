/**
 * House types (pure helpers for the wizard House types step).
 *
 * Field mapping onto the existing unit-type columns (no migration):
 *   home type            -> unitCategory + unitSubType + structuralType
 *                           freestanding house -> house / freestanding-house / freestanding-house
 *                           townhouse / cluster -> house / townhouse / townhouse
 *                           apartment           -> apartment / apartment / apartment
 *   price from / to      -> priceFrom (+ basePriceFrom), priceTo (+ basePriceTo)
 *   beds / baths / size  -> bedrooms / bathrooms / unitSize
 *   N available          -> availableUnits (shown only when counts are supplied)
 *   Ready now            -> specifications.readyNow (JSON, no column) and readyNow on the draft
 *   ownership per unit   -> ownershipType, only when the development ownership is "Varies by house type"
 *   photos / floor plans -> baseMedia.gallery / baseMedia.floorPlans
 *   name                 -> name (auto-suggested while nameAuto is true)
 */

export type HomeTypeId = 'freestanding' | 'townhouse' | 'apartment';

export type HomeType = {
  id: HomeTypeId;
  label: string;
  /** Used inside the suggested name: "130 m² 4-bedroom freestanding house". */
  nameWord: string;
  unitCategory: 'house' | 'apartment';
  unitSubType: string;
  structuralType: string;
};

export const HOME_TYPES: HomeType[] = [
  {
    id: 'freestanding',
    label: 'Freestanding house',
    nameWord: 'house',
    unitCategory: 'house',
    unitSubType: 'freestanding-house',
    structuralType: 'freestanding-house',
  },
  {
    id: 'townhouse',
    label: 'Townhouse / cluster',
    nameWord: 'townhouse',
    unitCategory: 'house',
    unitSubType: 'townhouse',
    structuralType: 'townhouse',
  },
  {
    id: 'apartment',
    label: 'Apartment',
    nameWord: 'apartment',
    unitCategory: 'apartment',
    unitSubType: 'apartment',
    structuralType: 'apartment',
  },
];

export const homeTypeById = (id: HomeTypeId): HomeType =>
  HOME_TYPES.find(h => h.id === id) as HomeType;

const parseSpecs = (specs: unknown): any => {
  if (typeof specs === 'string') {
    try {
      return JSON.parse(specs);
    } catch {
      return null;
    }
  }
  return specs && typeof specs === 'object' ? specs : null;
};

/** The home type of a saved unit, read from the existing classification fields. */
export function homeTypeOf(unit: any): HomeTypeId {
  const specs = parseSpecs(unit?.specifications);
  const category = unit?.unitCategory ?? specs?.classification?.category;
  const sub = String(unit?.unitSubType ?? specs?.classification?.subType ?? unit?.structuralType ?? '')
    .trim()
    .toLowerCase();
  if (sub === 'freestanding-house' || sub === 'plot-and-plan') return 'freestanding';
  if (category === 'apartment') return 'apartment';
  if (['studio', 'apartment', 'loft', 'penthouse'].includes(sub)) return 'apartment';
  if (category === 'house' || ['townhouse', 'semi-detached', 'simplex', 'duplex'].includes(sub)) {
    return 'townhouse';
  }
  return 'apartment';
}

/** The three classification columns for a home type. */
export const classificationFor = (id: HomeTypeId) => {
  const h = homeTypeById(id);
  return {
    unitCategory: h.unitCategory,
    unitSubType: h.unitSubType,
    structuralType: h.structuralType,
  };
};

const num = (value: unknown): number | null => {
  const n = Number(value);
  return value !== '' && value != null && Number.isFinite(n) ? n : null;
};

const fmtNumber = (n: number) => (Number.isInteger(n) ? String(n) : String(n));

type NameFacts = { unitSize?: unknown; bedrooms?: unknown; bathrooms?: unknown };

/**
 * "{size} m² {beds}-bedroom {home type}" (studio for 0 beds). When another
 * house type has the same size and beds, "(N baths)" is added.
 */
export function suggestUnitName(
  unit: NameFacts & { homeType: HomeTypeId },
  others: NameFacts[] = [],
  /** Types listed before this one (defaults to all `others`); used to number identical twins. */
  earlier: NameFacts[] = others,
): string | null {
  const size = num(unit.unitSize);
  const beds = num(unit.bedrooms);
  if (size == null || size <= 0 || beds == null) return null;
  const word = homeTypeById(unit.homeType).nameWord;
  let name =
    beds === 0
      ? `${fmtNumber(size)} m² studio`
      : `${fmtNumber(size)} m² ${fmtNumber(beds)}-bedroom ${word}`;
  const collides = others.some(o => num(o.unitSize) === size && num(o.bedrooms) === beds);
  const baths = num(unit.bathrooms);
  if (collides && baths != null) {
    name = `${name} (${fmtNumber(baths)} ${baths === 1 ? 'bath' : 'baths'})`;
  }
  // Same size, beds AND baths: number the twins so every name stays unique: (2), (3), ...
  const twins = earlier.filter(
    o =>
      num(o.unitSize) === size && num(o.bedrooms) === beds && num(o.bathrooms) === baths,
  ).length;
  return twins > 0 ? `${name} (${twins + 1})` : name;
}

/** Re-suggest names for every unit still on an auto name, now that the full list is known. */
export function applyAutoNames<T extends Record<string, any>>(units: T[]): T[] {
  return units.map((unit, index) => {
    if (unit.nameAuto !== true) return unit;
    const suggested = suggestUnitName(
      { ...unit, homeType: homeTypeOf(unit) },
      units.filter((_, i) => i !== index),
      units.slice(0, index),
    );
    return suggested && suggested !== unit.name ? { ...unit, name: suggested } : unit;
  });
}

/** True when each house type needs its own ownership. */
export const needsUnitOwnership = (developmentOwnership: unknown): boolean => {
  const value = Array.isArray(developmentOwnership) ? developmentOwnership[0] : developmentOwnership;
  return value === 'varies';
};

/**
 * The ownership values the server stores for a unit type
 * (server/services/developmentService.ts, unit ownershipType sanitizeEnum).
 * Only these are offered per house type, so nothing chosen is silently dropped.
 */
export const SERVER_UNIT_OWNERSHIP_VALUES = [
  'full-title',
  'sectional-title',
  'leasehold',
  'life-rights',
] as const;

export const UNIT_OWNERSHIP_OPTIONS = [
  { value: 'full-title', label: 'Full title' },
  { value: 'sectional-title', label: 'Sectional title' },
  { value: 'life-rights', label: 'Life rights' },
  { value: 'leasehold', label: 'Leasehold' },
];

/** Share block has no server unit value and no identical neighbour, so it is not offered per house type. */
export const UNIT_OWNERSHIP_HINT = 'Share block is set at development level.';

export const isReadyNow = (unit: any): boolean =>
  unit?.readyNow === true || parseSpecs(unit?.specifications)?.readyNow === true;

export type HouseTypeCard = {
  id: string;
  name: string;
  priceText: string;
  facts: string;
  tags: string[];
  mediaText: string;
  coverUrl: string | null;
};

export const formatRandAmount = (n: number): string =>
  `R${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What a house type card shows. `transaction` comes from the start screen, never from the unit. */
export function houseTypeCard(unit: any, transaction: 'for_sale' | 'for_rent' | 'auction' | string): HouseTypeCard {
  const isRent = transaction === 'for_rent';
  const isAuction = transaction === 'auction';
  const from = num(isRent ? (unit?.monthlyRentFrom ?? unit?.monthlyRent) : isAuction ? unit?.startingBid : (unit?.basePriceFrom ?? unit?.priceFrom));
  const to = num(isRent ? unit?.monthlyRentTo : isAuction ? null : (unit?.basePriceTo ?? unit?.priceTo));
  let priceText = '';
  if (from && from > 0) {
    priceText = `${formatRandAmount(from)}${to && to > from ? ` – ${formatRandAmount(to)}` : ''}`;
    if (isRent) priceText += ' / month';
  }

  const home = homeTypeById(homeTypeOf(unit));
  const beds = num(unit?.bedrooms);
  const baths = num(unit?.bathrooms);
  const size = num(unit?.unitSize);
  const facts = [
    beds != null ? (beds === 0 ? 'Studio' : plural(beds, 'bed', 'beds')) : null,
    baths != null ? plural(baths, 'bath', 'baths') : null,
    size != null && size > 0 ? `${fmtNumber(size)} m²` : null,
    home.label,
  ]
    .filter(Boolean)
    .join(' · ');

  const tags: string[] = [isRent ? 'To rent' : isAuction ? 'Auction' : 'For sale'];
  const available = num(unit?.availableUnits);
  if (unit?.availabilityNotProvided !== true && available != null && available > 0) {
    tags.push(`${available} available`);
  }
  if (isReadyNow(unit)) tags.push('Ready now');

  const gallery: any[] = Array.isArray(unit?.baseMedia?.gallery) ? unit.baseMedia.gallery : [];
  const plans: any[] = Array.isArray(unit?.baseMedia?.floorPlans) ? unit.baseMedia.floorPlans : [];
  const mediaParts = [
    gallery.length ? plural(gallery.length, 'photo', 'photos') : null,
    plans.length ? plural(plans.length, 'floor plan', 'floor plans') : null,
  ].filter(Boolean);
  const first = gallery.find(g => g?.isPrimary && g?.url) ?? gallery.find(g => g?.url);

  return {
    id: String(unit?.id ?? ''),
    name: String(unit?.name ?? '').trim() || 'House type',
    priceText,
    facts,
    tags,
    mediaText: mediaParts.length ? mediaParts.join(' · ') : 'No photos yet',
    coverUrl: first?.url ?? null,
  };
}

/** A copy of a house type with a new id and a "(copy)" name suffix. */
export function duplicateUnitType<T extends Record<string, any>>(
  unit: T,
  newId: string,
): T {
  return {
    ...unit,
    id: newId,
    name: `${unit.name} (copy)`,
    nameAuto: false,
    baseMedia: {
      ...(unit.baseMedia ?? {}),
      gallery: [...(unit.baseMedia?.gallery ?? [])],
      floorPlans: [...(unit.baseMedia?.floorPlans ?? [])],
      renders: [...(unit.baseMedia?.renders ?? [])],
    },
    features: unit.features ? { ...unit.features } : unit.features,
    extras: Array.isArray(unit.extras) ? unit.extras.map(e => ({ ...e })) : unit.extras,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Problems that block a house type (sale workflow: price from is asked). */
export function houseTypeProblems(
  unit: any,
  opts: { transaction: string; unitOwnershipRequired: boolean },
): string[] {
  const problems: string[] = [];
  const label = String(unit?.name ?? '').trim() || 'This house type';
  if (!String(unit?.name ?? '').trim()) problems.push(`${label} needs a name`);
  const size = num(unit?.unitSize);
  if (size == null || size <= 0) problems.push(`${label} needs a size`);
  if (num(unit?.bedrooms) == null) problems.push(`${label} needs bedrooms`);
  if (num(unit?.bathrooms) == null) problems.push(`${label} needs bathrooms`);
  if (opts.transaction === 'for_rent') {
    const rent = num(unit?.monthlyRentFrom);
    if (rent == null || rent <= 0) problems.push(`${label} needs a monthly rent`);
  } else if (opts.transaction !== 'auction') {
    const price = num(unit?.priceFrom ?? unit?.basePriceFrom);
    if (price == null || price <= 0) problems.push(`${label} needs a price from`);
    const to = num(unit?.priceTo);
    if (price != null && to != null && to > 0 && to < price) {
      problems.push(`${label}: price to cannot be lower than price from`);
    }
  }
  if (opts.unitOwnershipRequired && !unit?.ownershipType) {
    problems.push(`${label} needs an ownership type`);
  }
  return problems;
}

/** Marks a unit's Ready now flag in both places it is stored. */
export function withReadyNow<T extends Record<string, any>>(unit: T, ready: boolean): T {
  const specs = parseSpecs(unit.specifications) ?? {};
  return { ...unit, readyNow: ready, specifications: { ...specs, readyNow: ready } };
}
