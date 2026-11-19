import { z } from 'zod';

/**
 * Development seed pack, format version 1.
 *
 * A pack is a reviewable, text-only description of one launch development and
 * its catalogue publisher. Facts that are not known stay absent: every string
 * must be non-empty, unknown keys are rejected, and nothing is defaulted to an
 * invented value. Asset files (images, documents) are referenced by a path
 * relative to an asset root that is supplied at load time and never committed.
 */
export const DEVELOPMENT_SEED_PACK_VERSION = 1 as const;

export const SEED_PACK_MEDIA_CATEGORIES = [
  'development_image',
  'development_video',
  'development_document',
  'development_floorplan',
  'unit_gallery',
  'unit_floorplan',
] as const;

export const SEED_PACK_IMAGE_CATEGORIES = [
  'featured',
  'general',
  'interior',
  'amenities',
  'outdoors',
  'photo',
  'render',
] as const;

export const SEED_PACK_DOCUMENT_KINDS = ['brochure', 'price_list', 'spec_sheet'] as const;

export const SEED_PACK_STRUCTURAL_TYPES = [
  'apartment',
  'freestanding-house',
  'simplex',
  'duplex',
  'penthouse',
  'plot-and-plan',
  'townhouse',
  'studio',
] as const;

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase-hyphen slug');

const text = (max = 255) => z.string().trim().min(1).max(max);

/** Relative asset path: no absolute paths, no traversal, no empty segments. */
const relativeFile = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(value => !value.startsWith('/') && !/^[A-Za-z]:/.test(value), {
    message: 'must be relative to the asset root',
  })
  .refine(value => !value.split(/[\\/]/).some(part => part === '..' || part === ''), {
    message: 'must not contain empty or parent segments',
  });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:[T ][0-9:.]+Z?)?$/, 'must be an ISO date');

const nonNegativeInt = z.number().int().min(0);
const positiveMoney = z.number().positive().max(1_000_000_000);

const publisherSchema = z
  .object({
    slug,
    name: text(),
    sourceAttribution: text(),
    websiteUrl: z.string().url().max(500).optional(),
    logo: z
      .object({
        file: relativeFile.optional(),
        sourceUrl: z.string().url().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const unitTypeSchema = z
  .object({
    key: slug,
    name: text(),
    structuralType: z.enum(SEED_PACK_STRUCTURAL_TYPES),
    bedrooms: nonNegativeInt.max(20),
    bathrooms: z.number().min(0).max(20).multipleOf(0.5),
    unitSize: z.number().int().positive().max(100_000),
    yardSize: z.number().int().positive().max(1_000_000).optional(),
    priceFrom: positiveMoney,
    priceTo: positiveMoney.optional(),
    totalUnits: nonNegativeInt.optional(),
    availableUnits: nonNegativeInt.optional(),
    parkingBays: nonNegativeInt.max(20).optional(),
  })
  .strict()
  .superRefine((unit, ctx) => {
    if (unit.priceTo !== undefined && unit.priceTo < unit.priceFrom) {
      ctx.addIssue({ code: 'custom', path: ['priceTo'], message: 'must be at least priceFrom' });
    }
    if (
      unit.totalUnits !== undefined &&
      unit.availableUnits !== undefined &&
      unit.availableUnits > unit.totalUnits
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['availableUnits'],
        message: 'must not exceed totalUnits',
      });
    }
  });

const mediaSchema = z
  .object({
    file: relativeFile,
    category: z.enum(SEED_PACK_MEDIA_CATEGORIES),
    /** Public gallery label for development_image; defaults to "general" at load. */
    imageCategory: z.enum(SEED_PACK_IMAGE_CATEGORIES).optional(),
    unitKey: slug.optional(),
    isPrimary: z.boolean().optional(),
    title: text().optional(),
    /** Exporter-only review aid: where the file lived in the source database. */
    sourceUrl: z.string().max(2000).optional(),
  })
  .strict()
  .superRefine((media, ctx) => {
    const unitScoped = media.category === 'unit_gallery' || media.category === 'unit_floorplan';
    if (unitScoped && !media.unitKey) {
      ctx.addIssue({ code: 'custom', path: ['unitKey'], message: 'is required for unit media' });
    }
    if (!unitScoped && media.unitKey) {
      ctx.addIssue({
        code: 'custom',
        path: ['unitKey'],
        message: 'is only valid for unit_gallery and unit_floorplan',
      });
    }
    if (media.imageCategory && media.category !== 'development_image') {
      ctx.addIssue({
        code: 'custom',
        path: ['imageCategory'],
        message: 'is only valid for development_image',
      });
    }
  });

const documentSchema = z
  .object({
    file: relativeFile,
    kind: z.enum(SEED_PACK_DOCUMENT_KINDS),
    title: text().optional(),
    sourceUrl: z.string().max(2000).optional(),
  })
  .strict();

const developmentSchema = z
  .object({
    slug,
    name: text(),
    description: z.string().trim().min(1).max(20_000),
    developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'land']),
    transactionType: z.enum(['for_sale', 'for_rent']),
    status: z.enum(['launching-soon', 'selling', 'sold-out']),
    completionDate: isoDate.optional(),
    /** Canonical Place id of the development site; authoritative when present. */
    sitePlaceId: z
      .string()
      .regex(/^pl-[a-z0-9-]+$/, 'must be a canonical place id')
      .optional(),
    /** Human-readable fallback, most general first (for example province, city, suburb). */
    placePath: z.array(text(120)).min(1).max(8).optional(),
    amenities: z.array(text(120)).max(100),
    estateSpecs: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((development, ctx) => {
    if (!development.sitePlaceId && !development.placePath) {
      ctx.addIssue({
        code: 'custom',
        path: ['sitePlaceId'],
        message: 'sitePlaceId or placePath is required',
      });
    }
  });

const provenanceSchema = z
  .object({
    enteredBy: text(),
    sourceDocuments: z.array(text(500)).max(50),
    reviewedBy: text().optional(),
    reviewedAt: isoDate.optional(),
  })
  .strict();

export const developmentSeedPackSchema = z
  .object({
    version: z.literal(DEVELOPMENT_SEED_PACK_VERSION),
    /** Only a pack that says so is published and approved by the loader. */
    publish: z.boolean().optional(),
    publisher: publisherSchema,
    development: developmentSchema,
    unitTypes: z.array(unitTypeSchema).max(60),
    media: z.array(mediaSchema).max(500),
    documents: z.array(documentSchema).max(50),
    provenance: provenanceSchema,
  })
  .strict()
  .superRefine((pack, ctx) => {
    const keys = new Set<string>();
    pack.unitTypes.forEach((unit, index) => {
      if (keys.has(unit.key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['unitTypes', index, 'key'],
          message: 'duplicate unit key',
        });
      }
      keys.add(unit.key);
    });
    pack.media.forEach((media, index) => {
      if (media.unitKey && !keys.has(media.unitKey)) {
        ctx.addIssue({
          code: 'custom',
          path: ['media', index, 'unitKey'],
          message: 'references an unknown unit key',
        });
      }
    });
    if (pack.publish) {
      if (!pack.provenance.reviewedBy || !pack.provenance.reviewedAt) {
        ctx.addIssue({
          code: 'custom',
          path: ['provenance', 'reviewedBy'],
          message: 'a published pack must record reviewedBy and reviewedAt',
        });
      }
      if (pack.unitTypes.length === 0 && pack.development.developmentType !== 'land') {
        ctx.addIssue({
          code: 'custom',
          path: ['unitTypes'],
          message: 'a published pack needs at least one unit type',
        });
      }
    }
  });

export type DevelopmentSeedPack = z.infer<typeof developmentSeedPackSchema>;
export type DevelopmentSeedPackUnitType = DevelopmentSeedPack['unitTypes'][number];
export type DevelopmentSeedPackMedia = DevelopmentSeedPack['media'][number];

export function parseDevelopmentSeedPack(input: unknown): DevelopmentSeedPack {
  const result = developmentSeedPackSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 10)
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid development seed pack: ${details}`);
  }
  return result.data;
}
