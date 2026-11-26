/**
 * What the Review & publish step shows: one section per wizard step, built from
 * the canonical wizard data. Pure, so it can be tested without rendering.
 */
import {
  OWNERSHIP_OPTIONS,
  SALES_STATUS_OPTIONS,
  buildTimelineLine,
  salesChoiceOf,
  settingTagLabel,
} from './wizardBasicsAbout';
import {
  amenityLabel,
  cardHighlightSplit,
  estimatedAmount,
  levyChoiceOf,
  levyLabelFor,
} from './wizardLocationCostsAmenities';
import {
  DOCUMENT_SLOTS,
  PHOTO_SLOTS,
  groupDocuments,
  photosForSlot,
  resolveCover,
} from './wizardMedia';
import { formatRandAmount, houseTypeCard } from './wizardHouseTypes';
import { sortHouseTypes } from './houseTypes';

export type ReviewSectionId =
  | 'basics'
  | 'about'
  | 'location'
  | 'costs'
  | 'amenities'
  | 'highlights'
  | 'media'
  | 'house_types';

/** The wizard step each review section edits (ids of the residential workflows). */
export const REVIEW_SECTION_STEP: Record<ReviewSectionId, string> = {
  basics: 'configuration',
  about: 'identity_market',
  location: 'location',
  costs: 'governance_finances',
  amenities: 'amenities_features',
  highlights: 'amenities_features',
  media: 'development_media',
  house_types: 'unit_types',
};

export const REVIEW_SECTION_TITLES: Record<ReviewSectionId, string> = {
  basics: 'Basics',
  about: 'About',
  location: 'Location',
  costs: 'Monthly costs',
  amenities: 'Amenities',
  highlights: 'Highlights',
  media: 'Media',
  house_types: 'House types',
};

const STEP_TITLES: Record<string, string> = {
  configuration: 'Basics',
  identity_market: 'About',
  location: 'Location',
  governance_finances: 'Monthly costs',
  amenities_features: 'Amenities',
  development_media: 'Media',
  unit_types: 'House types',
};

export const stepTitle = (stepId: string): string => STEP_TITLES[stepId] ?? stepId;

/** Which step fixes a readiness message (the messages are plain text). */
export function stepForIssue(message: string): string | null {
  const m = message.toLowerCase();
  if (/highlight|selling point/.test(m)) return 'amenities_features';
  if (/image|photo|cover|hero|media/.test(m)) return 'development_media';
  if (/unit|house type|inventory|bedroom|bathroom|parking|price|bed\b/.test(m)) return 'unit_types';
  if (/address|coordinate|latitude|longitude|location|suburb|map|pin/.test(m)) return 'location';
  if (/levy|rates|governance/.test(m)) return 'governance_finances';
  if (/classification|setting|estate type/.test(m)) return 'configuration';
  if (/name|description|ownership|status|date|handover|tagline/.test(m)) return 'identity_market';
  return null;
}

export type ReviewRow = { label: string; value: string };

export type ReviewHouseType = {
  id: string;
  name: string;
  price: string;
  facts: string;
  parking: string;
  availability: string;
  media: string;
};

export type ReviewModel = {
  basics: ReviewRow[];
  about: ReviewRow[];
  location: ReviewRow[];
  costs: ReviewRow[];
  /** Human labels (registry label, or the custom text as entered), never raw keys. */
  amenities: string[];
  highlights: { shown: string[]; more: number };
  media: ReviewRow[];
  houseTypes: ReviewHouseType[];
};

const NOT_GIVEN = 'Not given';

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const PARKING_LABELS: Record<string, string> = {
  none: 'No parking',
  open: 'Open bay',
  covered: 'Covered bay',
  carport: 'Carport',
  garage: 'Garage',
};

export function parkingText(unit: any): string {
  const type = clean(unit?.parkingType ?? unit?.parking_type);
  if (!type) return 'Parking not given';
  if (type === 'none') return PARKING_LABELS.none;
  const bays = Number(unit?.parkingBays ?? unit?.parking_bays ?? 0);
  const label =
    PARKING_LABELS[type] ??
    type
      .replace(/[_-]+/g, ' ')
      .replace(/^./, c => c.toUpperCase());
  return bays > 0 ? `${label} · ${bays} ${bays === 1 ? 'bay' : 'bays'}` : label;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function buildReviewModel(
  data: Record<string, any>,
  amenityValues: string[] = [],
  transaction: string = 'for_sale',
): ReviewModel {
  // Basics
  const setting = clean(data.setting);
  const estateType = clean(data.estateType);
  const settingLabel = settingTagLabel(setting, estateType);
  const basicsValue = !settingLabel
    ? NOT_GIVEN
    : setting === 'estate' && estateType && estateType !== 'standard'
      ? `Security estate · ${settingLabel}`
      : settingLabel;
  const basics: ReviewRow[] = [{ label: 'Setting', value: basicsValue }];

  // About
  const choice = salesChoiceOf({ status: data.status, salesStage: data.salesStage });
  const statusLabel = SALES_STATUS_OPTIONS.find(o => o.value === choice)?.label ?? NOT_GIVEN;
  const timeline = buildTimelineLine(data);
  const ownershipKey = Array.isArray(data.ownershipTypes) ? data.ownershipTypes[0] : data.ownershipType;
  const ownership =
    OWNERSHIP_OPTIONS.find(o => o.value === String(ownershipKey ?? '').trim())?.label ?? NOT_GIVEN;
  const about: ReviewRow[] = [
    { label: 'Name', value: clean(data.name) || NOT_GIVEN },
    ...(clean(data.phaseLabel) ? [{ label: 'Phase', value: clean(data.phaseLabel) }] : []),
    { label: 'Tagline', value: clean(data.subtitle) || clean(data.tagline) || NOT_GIVEN },
    { label: 'Sales status', value: timeline ? `${statusLabel} · ${timeline}` : statusLabel },
    { label: 'Ownership', value: ownership },
    { label: 'Description', value: clean(data.description) || NOT_GIVEN },
  ];

  // Location
  const loc = (data.location ?? {}) as Record<string, any>;
  const address = clean(loc.address);
  const suburb =
    clean(loc.suburbLabel) ||
    [clean(loc.suburb), clean(loc.city)].filter(Boolean).join(', ');
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const location: ReviewRow[] = [
    {
      label: 'Street address',
      value: address || (loc.noOfficialStreet === true ? 'No street address yet' : NOT_GIVEN),
    },
    { label: 'Suburb', value: suburb || NOT_GIVEN },
    { label: 'Postal code', value: clean(loc.postalCode) || NOT_GIVEN },
    { label: 'Map pin', value: hasPin ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : NOT_GIVEN },
  ];

  // Monthly costs
  const rates = estimatedAmount(data.rightsAndTaxes);
  const levyChoice = levyChoiceOf(data);
  const levyAmount = estimatedAmount(data.levyRange);
  const costs: ReviewRow[] = [
    { label: 'Rates & taxes', value: rates > 0 ? `${formatRandAmount(rates)} a month (estimate)` : NOT_GIVEN },
    {
      label: levyChoice && levyChoice !== 'none' ? levyLabelFor(levyChoice) : 'Levy',
      value:
        levyChoice === 'none'
          ? 'No levy'
          : levyChoice && levyAmount > 0
            ? `${formatRandAmount(levyAmount)} a month (estimate)`
            : NOT_GIVEN,
    },
  ];

  // Amenities: human labels, de-duplicated, custom ones as entered
  const labels: string[] = [];
  for (const value of amenityValues) {
    const label = amenityLabel(String(value));
    if (label && !labels.includes(label)) labels.push(label);
  }

  // Highlights as buyers see them
  const highlightList: string[] = (Array.isArray(data.highlights) ? data.highlights : [])
    .map((h: unknown) => clean(h))
    .filter(Boolean);

  // Media
  const media = (data.media ?? {}) as Record<string, any>;
  const photos: any[] = Array.isArray(media.photos) ? media.photos : [];
  const cover = resolveCover({ heroImage: media.heroImage, photos });
  const coverUrl = cover?.url ?? null;
  const mediaRows: ReviewRow[] = PHOTO_SLOTS.map(slot => {
    const count =
      slot.id === 'cover' ? (coverUrl ? 1 : 0) : photosForSlot(photos, slot.id, coverUrl).length;
    return { label: slot.title, value: plural(count, 'photo', 'photos') };
  });
  const otherPhotos = photosForSlot(photos, 'other', coverUrl).length;
  if (otherPhotos > 0) mediaRows.push({ label: 'Other photos', value: plural(otherPhotos, 'photo', 'photos') });
  const videos: any[] = Array.isArray(media.videos) ? media.videos : [];
  mediaRows.push({ label: 'Video', value: videos.length ? plural(videos.length, 'video', 'videos') : 'None' });
  const rawDocs: any[] = (Array.isArray(media.documents) ? media.documents : media.brochures ?? []).map(
    (d: any) => (typeof d === 'string' ? { url: d, fileName: d.split('/').pop() } : d),
  );
  const { bySlot, other } = groupDocuments(rawDocs);
  for (const slot of DOCUMENT_SLOTS) {
    mediaRows.push({ label: slot.title, value: bySlot[slot.id] ? 'Added' : 'Not added' });
  }
  if (other.length > 0) mediaRows.push({ label: 'Other documents', value: String(other.length) });

  // House types
  // Same order as the public page: cheapest first, then the smaller home.
  const units: any[] = sortHouseTypes(Array.isArray(data.unitTypes) ? data.unitTypes : []);
  const houseTypes: ReviewHouseType[] = units.map(unit => {
    const card = houseTypeCard(unit, transaction);
    const available = card.tags.find(t => /available$/.test(t));
    const gallery = Array.isArray(unit?.baseMedia?.gallery) ? unit.baseMedia.gallery.length : 0;
    const plans = Array.isArray(unit?.baseMedia?.floorPlans) ? unit.baseMedia.floorPlans.length : 0;
    return {
      id: card.id,
      name: card.name,
      price: card.priceText || NOT_GIVEN,
      facts: card.facts,
      parking: parkingText(unit),
      availability: available ?? (unit?.availabilityNotProvided === true ? 'Counts not supplied' : ''),
      media: `${plural(gallery, 'photo', 'photos')} · ${plural(plans, 'floor plan', 'floor plans')}`,
    };
  });

  return {
    basics,
    about,
    location,
    costs,
    amenities: labels,
    highlights: cardHighlightSplit(highlightList),
    media: mediaRows,
    houseTypes,
  };
}

export type PublishFailure = { message: string; details: string[] };

/**
 * What to show when a create, save, publish or submit call is refused: the
 * server's own message plus any field details (readiness blockers or zod field
 * errors). Always returns something readable, never an empty string.
 */
export function describePublishFailure(error: any, fallback: string): PublishFailure {
  const message = String(error?.message ?? '').trim() || fallback;
  const details: string[] = [];
  const data = error?.data ?? error?.shape?.data ?? {};
  const blockers = data?.validationErrors ?? data?.cause?.validationErrors;
  if (Array.isArray(blockers)) {
    for (const entry of blockers) {
      const text = typeof entry === 'string' ? entry : String(entry?.message ?? '').trim();
      if (text && !details.includes(text)) details.push(text);
    }
  }
  const legacy = data?.cause?.errors;
  if (Array.isArray(legacy)) {
    for (const entry of legacy) {
      const text = String(entry ?? '').trim();
      if (text && !details.includes(text)) details.push(text);
    }
  }
  const zod = data?.zodError ?? data?._zod;
  const fieldErrors = zod?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const [field, messages] of Object.entries(fieldErrors as Record<string, unknown>)) {
      if (Array.isArray(messages)) {
        for (const m of messages) {
          const text = `${field}: ${String(m)}`;
          if (!details.includes(text)) details.push(text);
        }
      }
    }
  }
  if (Array.isArray(zod?.formErrors)) {
    for (const m of zod.formErrors) {
      const text = String(m ?? '').trim();
      if (text && !details.includes(text)) details.push(text);
    }
  }
  return { message, details };
}

/** The sentence the publish confirmation shows, stating exactly what happens. */
export function publishConfirmText(input: {
  name: string;
  publisherName?: string | null;
  houseTypeCount: number;
  curated: boolean;
}): string {
  const name = input.name.trim() || 'this development';
  const types = plural(input.houseTypeCount, 'house type', 'house types');
  if (input.curated) {
    const who = input.publisherName ? ` for ${input.publisherName}` : '';
    return `Publishes ${name}${who} with ${types}. It becomes visible to the public on the site.`;
  }
  return `Submits ${name} with ${types} for review. It will not be visible publicly until an authorised reviewer approves and publishes it.`;
}
