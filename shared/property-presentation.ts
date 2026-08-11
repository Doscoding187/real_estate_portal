import { z } from 'zod';

/**
 * Property Presentation is the semantic layer above the persisted media
 * collection. File format remains useful metadata, but it does not decide
 * whether an asset is a plan or a public document.
 */
export const PROPERTY_PRESENTATION_KINDS = ['floorplan', 'document'] as const;
export type PropertyPresentationKind = (typeof PROPERTY_PRESENTATION_KINDS)[number];

export const PROPERTY_PRESENTATION_PLAN_LABELS = [
  'ground_floor',
  'first_floor',
  'lower_level',
  'site_plan',
  'property_layout',
  'unit_layout',
  'other',
] as const;
export type PropertyPresentationPlanLabel = (typeof PROPERTY_PRESENTATION_PLAN_LABELS)[number];

export const PROPERTY_PRESENTATION_PLAN_LABEL_TEXT: Record<
  PropertyPresentationPlanLabel,
  string
> = {
  ground_floor: 'Ground floor',
  first_floor: 'First floor',
  lower_level: 'Lower level',
  site_plan: 'Site plan',
  property_layout: 'Property layout',
  unit_layout: 'Unit layout',
  other: 'Other',
};

const matterportUrlSchema = z
  .string()
  .trim()
  .url()
  .max(1_024)
  .refine(value => {
    try {
      const parsed = new URL(value);
      const hostname = parsed.hostname.toLowerCase();
      return (
        parsed.protocol === 'https:' &&
        (hostname === 'my.matterport.com' || hostname === 'matterport.com' || hostname.endsWith('.matterport.com'))
      );
    } catch {
      return false;
    }
  }, 'Use a secure Matterport URL from an approved Matterport domain.');

export const propertyPresentationMediaSchema = z
  .object({
    mediaId: z.string().trim().min(1).max(1_024),
    kind: z.enum(PROPERTY_PRESENTATION_KINDS),
    label: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const propertyPresentationSchema = z
  .object({
    media: z.array(propertyPresentationMediaSchema).max(100).default([]),
    virtualTour: z
      .object({
        provider: z.literal('matterport'),
        sourceUrl: matterportUrlSchema,
        // `embedUrl` is derived by Property Listify. It is accepted for
        // backwards-compatible reads but is never trusted as authoring input.
        embedUrl: z.string().url().max(1_024).optional(),
        displayLabel: z.string().trim().min(1).max(120).optional(),
        status: z.literal('active').optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type PropertyPresentation = z.infer<typeof propertyPresentationSchema> & {
  virtualTour?: {
    provider: 'matterport';
    sourceUrl: string;
    embedUrl: string;
    displayLabel?: string;
    status: 'active';
  };
};

export type PresentationMediaLike = {
  id?: string | number | null;
  type?: string | null;
  mediaType?: string | null;
  url?: string | null;
  originalUrl?: string | null;
  fileName?: string | null;
  originalFileName?: string | null;
  presentationLabel?: string | null;
};

const normalizeMatterportEmbedUrl = (sourceUrl: string): string => {
  const parsed = new URL(sourceUrl);
  const modelId = parsed.searchParams.get('m');
  if (modelId && (parsed.hostname === 'my.matterport.com' || parsed.hostname.endsWith('.matterport.com'))) {
    return `https://my.matterport.com/show/?m=${encodeURIComponent(modelId)}`;
  }
  return parsed.toString();
};

/** Parse and normalize persisted presentation JSON at an authority boundary. */
export function normalizePropertyPresentation(value: unknown): PropertyPresentation | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = propertyPresentationSchema.parse(value);
  if (!parsed.virtualTour) return parsed as PropertyPresentation;

  const embedUrl = normalizeMatterportEmbedUrl(parsed.virtualTour.sourceUrl);
  return {
    ...parsed,
    virtualTour: {
      provider: 'matterport',
      sourceUrl: parsed.virtualTour.sourceUrl,
      embedUrl,
      ...(parsed.virtualTour.displayLabel ? { displayLabel: parsed.virtualTour.displayLabel } : {}),
      status: 'active',
    },
  };
}

export function safeParsePropertyPresentation(value: unknown) {
  try {
    return { success: true as const, data: normalizePropertyPresentation(value) };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error : new Error('Invalid property presentation.'),
    };
  }
}

export function getSafePropertyPresentationVirtualTour(value: unknown) {
  const parsed = safeParsePropertyPresentation(value);
  return parsed.success ? parsed.data?.virtualTour : undefined;
}

function mediaIdentityCandidates(media: PresentationMediaLike): string[] {
  const identities = [media.id == null ? null : String(media.id), media.url, media.originalUrl]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map(value => value.trim());

  if (media.id != null) identities.push(`existing:${String(media.id)}`);
  return Array.from(new Set(identities));
}

export function getPresentationMediaDescriptor(
  presentation: unknown,
  media: PresentationMediaLike,
): { kind?: PropertyPresentationKind; label?: string } {
  const normalized = safeParsePropertyPresentation(presentation);
  if (!normalized.success || !normalized.data) return {};

  const identities = new Set(mediaIdentityCandidates(media));
  const entry = normalized.data.media.find(item => identities.has(item.mediaId));
  if (entry) return { kind: entry.kind, label: entry.label };

  const mediaType = media.mediaType || media.type;
  if (mediaType === 'floorplan') return { kind: 'floorplan' };
  if (mediaType === 'pdf') return { kind: 'document' };
  return {};
}

export function buildPropertyPresentationForMedia(
  currentValue: unknown,
  media: PresentationMediaLike[],
): PropertyPresentation | undefined {
  const current = normalizePropertyPresentation(currentValue) || { media: [] };
  const nextMedia = media
    .filter(item => item.type === 'floorplan' || item.type === 'pdf' || item.mediaType === 'floorplan' || item.mediaType === 'pdf')
    .map(item => {
      const descriptor = getPresentationMediaDescriptor(current, item);
      const kind = descriptor.kind || (item.type === 'floorplan' || item.mediaType === 'floorplan' ? 'floorplan' : 'document');
      const mediaId = String(item.id || item.url || item.originalUrl || '').trim();
      if (!mediaId) return null;
      const label = item.presentationLabel?.trim() || descriptor.label || item.originalFileName?.trim() || item.fileName?.trim();
      return {
        mediaId,
        kind,
        ...(label ? { label: label.slice(0, 80) } : {}),
      };
    })
    .filter(Boolean) as PropertyPresentation['media'];

  const result = {
    media: nextMedia,
    ...(current.virtualTour ? { virtualTour: current.virtualTour } : {}),
  };
  return result.media.length > 0 || result.virtualTour ? (result as PropertyPresentation) : undefined;
}

export function summarizePropertyPresentation(
  media: PresentationMediaLike[],
  presentation: unknown,
) {
  const descriptors = media.map(item => getPresentationMediaDescriptor(presentation, item));
  return {
    photoCount: media.filter(item => (item.mediaType || item.type) === 'image').length,
    hasVideo: media.some(item => (item.mediaType || item.type) === 'video'),
    hasFloorplan: descriptors.some(item => item.kind === 'floorplan'),
    hasDocuments: descriptors.some(item => item.kind === 'document'),
    hasVirtualTour: Boolean(getSafePropertyPresentationVirtualTour(presentation)),
  };
}
