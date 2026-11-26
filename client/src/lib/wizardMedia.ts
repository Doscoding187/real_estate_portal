/**
 * Development media rules for the wizard Media step (pure, no React).
 *
 * Guided photo slots map ONE-TO-ONE onto the existing media categories, so the
 * public gallery labels (IMAGE_CATEGORY_LABELS in DevelopmentDetailPage.tsx)
 * keep working and a saved draft can be re-sorted back into slots:
 *
 *   Cover photo            -> 'featured'  (isPrimary)  public label "Development"
 *   Entrance & security    -> 'outdoors'               "Exteriors & outdoors"
 *   Amenities & lifestyle  -> 'amenities'              "Lifestyle & amenities"
 *   Streetscape & site     -> 'general'                "Development overview"
 *   Neighbourhood          -> 'photo'                  "Location & views"
 *
 * Legacy drafts: 'hero' counts as the cover, 'render' (aerial) is shown under
 * Streetscape & site. No new categories, columns or migrations.
 */

/** Same numbers as the server (server/_core/mediaStorage.ts lines 28-32, used by the developer upload authority). */
export const MEDIA_MAX_BYTES = {
  image: 15 * 1024 * 1024,
  video: 80 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
} as const;

export const MEDIA_MAX_MB = { image: 15, video: 80, pdf: 25 } as const;

/** Content types the server accepts (server/uploadRouter.ts inferUploadMediaType). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
export const PDF_TYPE = 'application/pdf';

export type PhotoSlotId = 'cover' | 'entrance' | 'amenities' | 'streetscape' | 'neighbourhood';
export type PhotoCategory = 'featured' | 'outdoors' | 'amenities' | 'general' | 'photo';

export type PhotoSlot = {
  id: PhotoSlotId;
  title: string;
  need: string;
  guide: string;
  category: PhotoCategory;
  max: number | null;
};

export const PHOTO_SLOTS: PhotoSlot[] = [
  {
    id: 'cover',
    title: 'Cover photo',
    need: 'Required · 1',
    guide:
      'The first thing buyers see. A wide aerial or street-front view of the whole development works best.',
    category: 'featured',
    max: 1,
  },
  {
    id: 'entrance',
    title: 'Entrance & security',
    need: 'Recommended',
    guide: 'The gate, guardhouse and perimeter. Buyers in security estates look for this first.',
    category: 'outdoors',
    max: null,
  },
  {
    id: 'amenities',
    title: 'Amenities & lifestyle',
    need: 'Recommended',
    guide: 'Clubhouse, pool, courts, gym, parks: one photo per amenity you ticked.',
    category: 'amenities',
    max: null,
  },
  {
    id: 'streetscape',
    title: 'Streetscape & site',
    need: 'Optional',
    guide: 'Streets, landscaping and aerial site views that show the layout and the finished feel.',
    category: 'general',
    max: null,
  },
  {
    id: 'neighbourhood',
    title: 'Neighbourhood',
    need: 'Optional',
    guide:
      'Nearby shopping centres, schools and transport, taken from or close to the development.',
    category: 'photo',
    max: null,
  },
];

export const slotById = (id: PhotoSlotId): PhotoSlot =>
  PHOTO_SLOTS.find(slot => slot.id === id) as PhotoSlot;

type PhotoLike = { category?: string | null; isPrimary?: boolean; url?: string };

/** Photos the guided slots do not cover (for example legacy 'interior') are listed as "Other photos". */
export type PhotoGroupId = PhotoSlotId | 'other';

/**
 * ONE cover rule, used by validation, slotting, saving and the preview:
 * the cover is the draft's heroImage. When a draft has no explicit heroImage
 * (older drafts) it is the photo marked featured/hero/primary, else the first
 * photo. An explicit `heroImage: null` means the cover was removed on purpose.
 */
export const isCoverCategory = (photo: PhotoLike | null | undefined): boolean =>
  photo?.category === 'featured' || photo?.category === 'hero' || photo?.isPrimary === true;

export function resolveCover<T extends PhotoLike>(
  media: { heroImage?: T | string | null; photos?: T[] | null } | null | undefined,
): T | null {
  if (!media) return null;
  if (media.heroImage === null) return null;
  const hero = media.heroImage;
  if (hero && typeof hero === 'object' && hero.url) return hero;
  const photos = (media.photos ?? []).filter(p => Boolean(p?.url));
  if (typeof hero === 'string' && hero) {
    return photos.find(p => p.url === hero) ?? ({ url: hero } as T);
  }
  return photos.find(isCoverCategory) ?? photos[0] ?? null;
}

/**
 * Which guided slot a saved photo belongs to. Pass the resolved cover URL to
 * apply the single cover rule; without it the stored category decides.
 */
export function slotForPhoto(photo: PhotoLike | null | undefined, coverUrl?: string | null): PhotoGroupId {
  const category = photo?.category ?? '';
  if (coverUrl !== undefined) {
    if (coverUrl && photo?.url === coverUrl) return 'cover';
    // A leftover featured/hero/primary photo that is not the cover is an ordinary site photo.
    if (category === 'featured' || category === 'hero') return 'streetscape';
  } else if (category === 'featured' || category === 'hero') {
    return 'cover';
  }
  if (category === 'outdoors') return 'entrance';
  if (category === 'amenities') return 'amenities';
  if (category === 'photo') return 'neighbourhood';
  if (category === 'interior') return 'other';
  // 'general' and legacy 'render' (aerial)
  return 'streetscape';
}

export const photosForSlot = <T extends PhotoLike>(
  photos: T[] | null | undefined,
  slot: PhotoGroupId,
  coverUrl?: string | null,
): T[] => (photos ?? []).filter(photo => slotForPhoto(photo, coverUrl) === slot);

/** A cover photo exists (matches the server's "persisted image" readiness need). */
export function hasCoverPhoto(
  media: { heroImage?: PhotoLike | string | null; photos?: PhotoLike[] | null } | null | undefined,
): boolean {
  return Boolean(resolveCover(media as any)?.url);
}

/**
 * Photos as they are saved: exactly one photo is the cover (featured +
 * primary); no other photo keeps a featured/hero/primary mark. Stored
 * categories otherwise stay unchanged.
 */
export function normalizePhotosForCover<T extends PhotoLike>(
  photos: T[],
  coverUrl: string | null,
): T[] {
  return photos.map(photo => {
    if (coverUrl && photo.url === coverUrl) {
      return { ...photo, category: 'featured', isPrimary: true };
    }
    const wasCover = photo.category === 'featured' || photo.category === 'hero';
    if (!wasCover && !photo.isPrimary) return photo;
    return { ...photo, category: wasCover ? 'general' : photo.category, isPrimary: false };
  });
}

export type DocumentSlotId = 'brochure' | 'site_plan' | 'spec_sheet' | 'price_list';

export type DocumentSlot = {
  id: DocumentSlotId;
  title: string;
  guide: string;
};

/** Order matters: the public brochure button uses the first document, so the brochure sorts first. */
export const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    id: 'brochure',
    title: 'Brochure',
    guide: 'The developer’s marketing brochure. Buyers can download it.',
  },
  { id: 'site_plan', title: 'Site plan', guide: 'Layout of stands, roads and amenities.' },
  {
    id: 'spec_sheet',
    title: 'Specification sheet',
    guide: 'Finishes and fittings included in every home.',
  },
  {
    id: 'price_list',
    title: 'Price list',
    guide:
      'Only if the developer publishes one. Spreadsheets (.xlsx) stay private; export a PDF to show it.',
  },
];

export const documentSlotById = (id: DocumentSlotId): DocumentSlot =>
  DOCUMENT_SLOTS.find(slot => slot.id === id) as DocumentSlot;

/**
 * Metadata stored on a document so the public page can tell them apart. The
 * public spec-sheet link looks for "spec/finish/fitting" in title, label,
 * fileName or documentType (DevelopmentDetail.tsx specificationSheetUrl).
 */
export function documentMeta(slot: DocumentSlotId): {
  documentType: DocumentSlotId;
  title: string;
  label: string;
  category: 'document';
} {
  const title = documentSlotById(slot).title;
  return { documentType: slot, title, label: title, category: 'document' };
}

type DocLike = {
  documentType?: string | null;
  fileName?: string | null;
  title?: string | null;
  label?: string | null;
  name?: string | null;
  url?: string | null;
};

/** The slot a document was saved with (its documentType), or null for untyped documents. */
export function documentSlotOf(doc: DocLike | null | undefined): DocumentSlotId | null {
  const type = doc?.documentType;
  return DOCUMENT_SLOTS.some(slot => slot.id === type) ? (type as DocumentSlotId) : null;
}

/** Best guess for an untyped (legacy) document from its file name or title. */
export function guessDocumentSlot(doc: DocLike | null | undefined): DocumentSlotId | null {
  const text = [doc?.fileName, doc?.title, doc?.label, doc?.name]
    .filter((v): v is string => typeof v === 'string')
    .join(' ');
  if (/brochure/i.test(text)) return 'brochure';
  if (/site[\s_-]*plan|layout/i.test(text)) return 'site_plan';
  if (/spec(?:ification)?|finish(?:es)?|fitting/i.test(text)) return 'spec_sheet';
  if (/price/i.test(text)) return 'price_list';
  return null;
}

/**
 * Sorts documents into the four slots: saved type first, then the file-name
 * guess for legacy documents. One document per slot; anything else (a second
 * document for a slot, or one that cannot be placed) goes to `other`, so no
 * saved document is ever invisible.
 */
export function groupDocuments<T extends DocLike>(
  docs: T[] | null | undefined,
): { bySlot: Partial<Record<DocumentSlotId, T>>; other: T[] } {
  const bySlot: Partial<Record<DocumentSlotId, T>> = {};
  const rest: T[] = [];
  const list = (docs ?? []).filter(d => d && d.url);
  for (const doc of list) {
    const slot = documentSlotOf(doc);
    if (slot && !bySlot[slot]) bySlot[slot] = doc;
    else rest.push(doc);
  }
  const other: T[] = [];
  for (const doc of rest) {
    const slot = documentSlotOf(doc) ? null : guessDocumentSlot(doc);
    if (slot && !bySlot[slot]) bySlot[slot] = doc;
    else other.push(doc);
  }
  return { bySlot, other };
}

/** Keep documents in slot order (brochure first); documents without a slot go last. */
export function sortDocuments<T extends DocLike>(docs: T[]): T[] {
  const rank = (doc: T) => {
    const slot = documentSlotOf(doc);
    return slot ? DOCUMENT_SLOTS.findIndex(s => s.id === slot) : DOCUMENT_SLOTS.length;
  };
  return docs
    .map((doc, index) => ({ doc, index }))
    .sort((a, b) => rank(a.doc) - rank(b.doc) || a.index - b.index)
    .map(entry => entry.doc);
}

/** Documents as they are saved: slotted ones get their type, title and label. */
export function stampDocuments<T extends DocLike>(docs: T[]): T[] {
  const { bySlot } = groupDocuments(docs);
  const slotOfDoc = new Map<T, DocumentSlotId>();
  (Object.keys(bySlot) as DocumentSlotId[]).forEach(slot => slotOfDoc.set(bySlot[slot] as T, slot));
  return sortDocuments(
    docs.map(doc => {
      const slot = slotOfDoc.get(doc);
      return slot ? { ...doc, ...documentMeta(slot) } : doc;
    }),
  );
}

export const SPREADSHEET_MESSAGE =
  'Spreadsheets stay private; export a PDF to show it to buyers.';

export type MediaKind = 'image' | 'video' | 'pdf';

const SPREADSHEET_EXT = /\.(xlsx?|xlsm|xlsb|csv|ods)$/i;
const SPREADSHEET_TYPE = /(spreadsheet|ms-excel|excel|csv|opendocument\.spreadsheet)/i;

const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

/** Returns a clear error message, or null when the file may be uploaded. */
export function validateMediaFile(
  file: { name: string; type: string; size: number },
  kind: MediaKind,
): string | null {
  const type = (file.type || '').toLowerCase();
  if (kind === 'pdf') {
    if (SPREADSHEET_EXT.test(file.name) || SPREADSHEET_TYPE.test(type)) return SPREADSHEET_MESSAGE;
    if (type !== PDF_TYPE) return 'not a PDF; documents must be PDF files.';
  } else if (kind === 'image') {
    if (!IMAGE_TYPES.includes(type)) {
      return 'not a supported photo; use JPG, PNG, WebP, GIF or AVIF.';
    }
  } else if (!VIDEO_TYPES.includes(type)) {
    return 'not a supported video; use MP4, WebM or MOV.';
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return 'the file is empty.';
  const cap = MEDIA_MAX_BYTES[kind];
  if (file.size > cap) return `too large (max ${mb(cap)} MB).`;
  return null;
}

/** Floor plans may be a PDF or a picture; check the file against the matching rule. */
export const kindForFloorPlan = (file: { type: string }): MediaKind =>
  (file.type || '').toLowerCase() === PDF_TYPE ? 'pdf' : 'image';

/** Inline error for a rejected floor plan (picture or PDF), or null when it may be uploaded. */
export function floorPlanRejection(file: { name: string; type: string; size: number }): string | null {
  const type = (file.type || '').toLowerCase();
  if (type !== PDF_TYPE && !IMAGE_TYPES.includes(type)) {
    if (SPREADSHEET_EXT.test(file.name) || SPREADSHEET_TYPE.test(type)) {
      return `${file.name}: ${SPREADSHEET_MESSAGE}`;
    }
    return `${file.name}: floor plans must be a picture (JPG, PNG, WebP) or a PDF.`;
  }
  return rejectionMessage(file, kindForFloorPlan(file));
}

/** "<file name>: <reason>" for the inline error under a slot, or null when the file is fine. */
export function rejectionMessage(
  file: { name: string; type: string; size: number },
  kind: MediaKind,
): string | null {
  const problem = validateMediaFile(file, kind);
  return problem ? `${file.name}: ${problem}` : null;
}

export const sizeHint = (kind: MediaKind): string =>
  kind === 'image'
    ? `JPG, PNG, WebP, GIF or AVIF, up to ${MEDIA_MAX_MB.image} MB each`
    : kind === 'video'
      ? `MP4, WebM or MOV, up to ${MEDIA_MAX_MB.video} MB`
      : `PDF only, up to ${MEDIA_MAX_MB.pdf} MB`;

/** Media step validation for the sale workflow: a cover photo is required. */
export function validateDevelopmentMedia(
  media: { heroImage?: any; photos?: any[] } | null | undefined,
): Array<{ field: string; message: string }> {
  return hasCoverPhoto(media)
    ? []
    : [{ field: 'media', message: 'Add a cover photo: it is the first image buyers see.' }];
}
