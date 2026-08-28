import {
  STEP4_HIGHLIGHT_DEFINITIONS,
  STEP4_SECURITY_FEATURE_DEFINITIONS,
  STEP4_SPACE_DEFINITIONS,
  normalizeFeaturesContext,
  type Step4HighlightKey,
  type Step4SecurityFeatureKey,
  type Step4SpaceKey,
} from './features-context';

export const LISTING_HIGHLIGHT_ICON_KEYS = [
  'access',
  'balcony',
  'building',
  'family',
  'fibre',
  'fitness',
  'garden',
  'home',
  'layout',
  'light',
  'parking',
  'pet',
  'pool',
  'power',
  'scenic',
  'security',
  'sparkles',
  'storage',
  'study',
  'sustainability',
  'water',
] as const;

export type ListingHighlightIconKey = (typeof LISTING_HIGHLIGHT_ICON_KEYS)[number];

export type ListingCardHighlightSource =
  | 'space'
  | 'utility'
  | 'security'
  | 'highlight'
  | 'amenity'
  | 'custom';

export interface ListingCardHighlight {
  key: string;
  label: string;
  iconKey: ListingHighlightIconKey;
  source: ListingCardHighlightSource;
  /** True only when public text has no governed presentation entry yet. */
  fallback?: boolean;
}

export interface ListingHighlightDefinition extends ListingCardHighlight {
  aliases?: readonly string[];
  cardPriority: number;
}

const SPACE_ICON_KEYS: Record<Step4SpaceKey, ListingHighlightIconKey> = {
  study_office: 'study',
  staff_quarters: 'home',
  scullery: 'home',
  laundry_room: 'water',
  pantry: 'storage',
  storage_room: 'storage',
  gym: 'fitness',
  entertainment_area: 'sparkles',
  balcony_patio: 'balcony',
  garden: 'garden',
  pool: 'pool',
};

const SPACE_PRIORITIES: Record<Step4SpaceKey, number> = {
  pool: 96,
  study_office: 98,
  garden: 86,
  balcony_patio: 84,
  gym: 82,
  entertainment_area: 78,
  staff_quarters: 76,
  scullery: 74,
  laundry_room: 72,
  pantry: 70,
  storage_room: 68,
};

const HIGHLIGHT_ICON_KEYS: Record<Step4HighlightKey, ListingHighlightIconKey> = {
  high_ceilings: 'building',
  modern_finishes: 'sparkles',
  open_plan: 'layout',
  natural_light: 'light',
  scenic_outlook: 'scenic',
};

const SECURITY_ICON_KEYS: Record<Step4SecurityFeatureKey, ListingHighlightIconKey> = {
  alarm: 'security',
  electric_fence: 'security',
  outdoor_beams: 'security',
  cctv: 'security',
  guard_24hr: 'security',
  access_control: 'access',
  intercom: 'access',
  security_gates: 'security',
};

const PROPERTY_DEFINITIONS: ListingHighlightDefinition[] = [
  {
    key: 'security_24_hour',
    label: '24-hour security',
    iconKey: 'security',
    source: 'amenity',
    aliases: ['24 hour security', '24hr security'],
    cardPriority: 89,
  },
  {
    key: 'prime_location',
    label: 'Prime location',
    iconKey: 'scenic',
    source: 'amenity',
    aliases: ['well located'],
    cardPriority: 60,
  },
  {
    key: 'lifestyle_amenities',
    label: 'Lifestyle amenities',
    iconKey: 'sparkles',
    source: 'amenity',
    aliases: ['lifestyle facilities'],
    cardPriority: 58,
  },
  ...STEP4_SPACE_DEFINITIONS.map(definition => ({
    key: definition.value,
    label: definition.label,
    iconKey: SPACE_ICON_KEYS[definition.value],
    source: 'space' as const,
    aliases:
      definition.value === 'pool'
        ? ['swimming_pool', 'swimming pool']
        : definition.value === 'study_office'
          ? ['study', 'office', 'home office']
          : definition.value === 'balcony_patio'
            ? ['balcony', 'patio', 'private balcony']
            : undefined,
    cardPriority: SPACE_PRIORITIES[definition.value],
  })),
  ...STEP4_HIGHLIGHT_DEFINITIONS.map(definition => ({
    key: definition.value,
    label: definition.label,
    iconKey: HIGHLIGHT_ICON_KEYS[definition.value],
    source: 'highlight' as const,
    cardPriority: 55,
  })),
  ...STEP4_SECURITY_FEATURE_DEFINITIONS.map(definition => ({
    key: definition.value,
    label: definition.label,
    iconKey: SECURITY_ICON_KEYS[definition.value],
    source: 'security' as const,
    cardPriority: 64,
  })),
  {
    key: 'solar_backup',
    label: 'Solar backup',
    iconKey: 'power',
    source: 'utility',
    aliases: ['solar', 'solar power', 'solar_power', 'solar ready', 'solar-ready'],
    cardPriority: 92,
  },
  {
    key: 'inverter_backup',
    label: 'Inverter backup',
    iconKey: 'power',
    source: 'utility',
    aliases: ['inverter', 'inverter battery', 'battery backup'],
    cardPriority: 90,
  },
  {
    key: 'generator_backup',
    label: 'Generator backup',
    iconKey: 'power',
    source: 'utility',
    aliases: ['generator', 'backup generator', 'backup_power'],
    cardPriority: 88,
  },
  {
    key: 'ups_backup',
    label: 'UPS backup',
    iconKey: 'power',
    source: 'utility',
    aliases: ['ups', 'uninterruptible power supply'],
    cardPriority: 86,
  },
  {
    key: 'fibre_ready',
    label: 'Fibre ready',
    iconKey: 'fibre',
    source: 'utility',
    aliases: ['fibre', 'fiber', 'fiber ready', 'high speed internet'],
    cardPriority: 80,
  },
  {
    key: 'backup_water',
    label: 'Backup water',
    iconKey: 'water',
    source: 'utility',
    aliases: ['backup water supply', 'water backup'],
    cardPriority: 78,
  },
  {
    key: 'borehole',
    label: 'Borehole',
    iconKey: 'water',
    source: 'utility',
    cardPriority: 76,
  },
  {
    key: 'pet_friendly',
    label: 'Pet friendly',
    iconKey: 'pet',
    source: 'amenity',
    aliases: ['pets allowed', 'pet friendly area', 'pet_friendly_area'],
    cardPriority: 66,
  },
  {
    key: 'pets_with_permission',
    label: 'Pets with permission',
    iconKey: 'pet',
    source: 'amenity',
    aliases: ['pet friendly with permission'],
    cardPriority: 65,
  },
  {
    key: 'parking',
    label: 'Parking',
    iconKey: 'parking',
    source: 'amenity',
    aliases: ['visitor parking', 'covered parking', 'undercover parking', 'parking bays'],
    cardPriority: 62,
  },
  {
    key: 'clubhouse',
    label: 'Clubhouse',
    iconKey: 'family',
    source: 'amenity',
    aliases: ['club house'],
    cardPriority: 60,
  },
];

const normalizeToken = (value: unknown): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[&/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const definitionByToken = new Map<string, ListingHighlightDefinition>();
for (const definition of PROPERTY_DEFINITIONS) {
  for (const token of [definition.key, definition.label, ...(definition.aliases || [])]) {
    const normalized = normalizeToken(token);
    if (normalized && !definitionByToken.has(normalized)) {
      definitionByToken.set(normalized, definition);
    }
  }
}

export const LISTING_HIGHLIGHT_REGISTRY: readonly ListingHighlightDefinition[] =
  PROPERTY_DEFINITIONS;

function inferFallbackIconKey(token: string): ListingHighlightIconKey {
  if (/pool|swim|splash/.test(token)) return 'pool';
  if (/study|office|business|meeting|cowork/.test(token)) return 'study';
  if (/solar|power|generator|inverter|battery|electric/.test(token)) return 'power';
  if (/water|borehole|rainwater/.test(token)) return 'water';
  if (/fibre|fiber|internet|wifi/.test(token)) return 'fibre';
  if (/garden|landscap|outdoor|trail|picnic|(^|_)park(_|$)/.test(token)) return 'garden';
  if (/balcony|patio|deck/.test(token)) return 'balcony';
  if (/(^|_)(pet|pets|dog|dogs|cat|cats)(_|$)/.test(token)) return 'pet';
  if (/security|guard|alarm|cctv|fence|gate|access|intercom|patrol/.test(token)) {
    return 'security';
  }
  if (/gym|fitness|sport|tennis|padel|squash|basketball|golf|yoga/.test(token)) {
    return 'fitness';
  }
  if (/parking|garage|car|vehicle/.test(token)) return 'parking';
  if (/storage|locker|pantry|parcel/.test(token)) return 'storage';
  if (/child|family|playground|nursery|creche|kids|teen/.test(token)) return 'family';
  if (/green|sustain|recycl|energy|grey_water|rainwater|compost|ev_charging/.test(token)) {
    return 'sustainability';
  }
  if (/view|outlook|mountain|sea|scenic|location|near|close|transport/.test(token)) {
    return 'scenic';
  }
  if (/light|bright|sun/.test(token)) return 'light';
  if (/home|house|residence|room|suite|kitchen|scullery|laundry/.test(token)) return 'home';
  return 'sparkles';
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase());
}

function resolveInternal(
  value: unknown,
  source: ListingCardHighlightSource,
): ListingHighlightDefinition | null {
  const raw = String(value || '').trim();
  const token = normalizeToken(raw);
  if (!token) return null;

  const governed = definitionByToken.get(token);
  if (governed) return governed;

  return {
    key: `custom:${token}`,
    label: titleCase(raw),
    iconKey: inferFallbackIconKey(token),
    source,
    fallback: true,
    cardPriority: 30,
  };
}

export function resolveListingCardHighlight(
  value: unknown,
  source: ListingCardHighlightSource = 'custom',
): ListingCardHighlight | null {
  const resolved = resolveInternal(value, source);
  if (!resolved) return null;
  const { cardPriority: _cardPriority, aliases: _aliases, ...highlight } = resolved;
  return highlight;
}

export function selectListingCardHighlights(
  values: ReadonlyArray<{ value: unknown; source?: ListingCardHighlightSource }>,
  limit = 3,
): ListingCardHighlight[] {
  const selected = new Map<string, ListingHighlightDefinition>();

  values.forEach(({ value, source = 'custom' }, index) => {
    const resolved = resolveInternal(value, source);
    if (!resolved) return;
    const dedupeKey = resolved.key.startsWith('custom:')
      ? normalizeToken(resolved.label)
      : resolved.key;
    const existing = selected.get(dedupeKey);
    const candidate = { ...resolved, cardPriority: resolved.cardPriority - index / 1000 };
    if (!existing || candidate.cardPriority > existing.cardPriority) {
      selected.set(dedupeKey, candidate);
    }
  });

  return Array.from(selected.values())
    .sort((left, right) => right.cardPriority - left.cardPriority)
    .slice(0, Math.max(0, limit))
    .map(({ cardPriority: _cardPriority, aliases: _aliases, ...highlight }) => highlight);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

export function buildManualPropertyCardHighlights(input: {
  propertyDetails?: unknown;
  legacyHighlights?: unknown;
  limit?: number;
}): ListingCardHighlight[] {
  const details = isRecord(input.propertyDetails) ? input.propertyDetails : {};
  const context = normalizeFeaturesContext(details.featuresContext, details);
  const values: Array<{ value: unknown; source?: ListingCardHighlightSource }> = [
    ...context.spaces.map(value => ({ value, source: 'space' as const })),
  ];

  const backupPower = context.utilities.backupPower;
  if (backupPower && backupPower !== 'none' && backupPower !== 'unknown') {
    values.push({
      value:
        backupPower === 'solar'
          ? 'solar_backup'
          : backupPower === 'inverter'
            ? 'inverter_backup'
            : backupPower === 'generator'
              ? 'generator_backup'
              : backupPower,
      source: 'utility',
    });
  }
  if (context.utilities.internetAccess === 'fibre') {
    values.push({ value: 'fibre_ready', source: 'utility' });
  }
  if (context.utilities.waterSupply === 'borehole') {
    values.push({ value: 'borehole', source: 'utility' });
  }
  if (context.petPolicy === 'allowed') {
    values.push({ value: 'pet_friendly', source: 'amenity' });
  } else if (context.petPolicy === 'allowed_with_permission') {
    values.push({ value: 'pets_with_permission', source: 'amenity' });
  }
  values.push(
    ...context.security.features.map(value => ({ value, source: 'security' as const })),
    ...context.highlights.map(value => ({ value, source: 'highlight' as const })),
    ...context.customFeatures.map(value => ({ value, source: 'custom' as const })),
    ...context.customHighlights.map(value => ({ value, source: 'custom' as const })),
  );

  const legacyValues = Array.isArray(input.legacyHighlights)
    ? input.legacyHighlights
    : typeof input.legacyHighlights === 'string'
      ? input.legacyHighlights.split(',')
      : [];
  values.push(...legacyValues.map(value => ({ value, source: 'custom' as const })));

  return selectListingCardHighlights(values, input.limit ?? 3);
}

export function buildDevelopmentCardHighlights(
  values: readonly unknown[],
  limit = 3,
): ListingCardHighlight[] {
  return selectListingCardHighlights(
    values.map(value => ({ value, source: 'amenity' as const })),
    limit,
  );
}
