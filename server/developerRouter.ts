import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { ENV } from './_core/env';
import { EmailService } from './_core/emailService';
import { developerSubscriptionService } from './services/developerSubscriptionService';
import { developmentService } from './services/developmentService';
import { unitService } from './services/unitService';
import * as partnershipService from './services/partnershipService';
import { getDeveloperByUserId, requireDeveloperProfileByUserId } from './services/developerService'; // [NEW] Import service methods
import { getBrandProfileById } from './services/developerBrandProfileService';
import { brandEmulatorService } from './services/brandEmulatorService';
import { developerBrandProfileService } from './services/developerBrandProfileService';
import {
  calculateAffordabilityCompanion,
  matchUnitsToAffordability,
} from './services/affordabilityCompanion';
import { getActivityFeed as getActivityFeedService } from './services/activityService';
import { getKPIsWithCache } from './services/kpiService';
import { seedCleanupService } from './services/seedCleanupService';
import { capturePublicLead } from './services/publicLeadCaptureService';
import {
  assignDeveloperLead,
  getDeveloperDistributionSettings,
  getDeveloperFunnelAttention,
  getDeveloperFunnelKpis,
  listDeveloperLeads,
  logDeveloperLeadActivity,
  setDeveloperDistributionEnabled,
  setDeveloperLeadNextAction,
  transitionDeveloperLead,
} from './services/developerFunnelService';
import {
  developmentDrafts,
  developments,
  developers,
  developerBrandProfiles,
  unitTypes,
} from '../drizzle/schema';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import {
  AssignmentModeSchema,
  LeadOwnerTypeSchema,
  LeadStageSchema,
  SlaStatusSchema,
} from '../shared/developerFunnel';
import { calculateDevelopmentReadiness } from './lib/readiness';
import { sanitizeDraftData } from './lib/sanitizeDraftData';
import { requireUser } from './_core/requireUser';

console.log('[DEV ROUTER LOADED] build stamp', new Date().toISOString());

function assertDeveloperDistributionEnabled() {
  if (!ENV.distributionNetworkEnabled) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message:
        'Distribution Network is disabled. Set FEATURE_DISTRIBUTION_NETWORK=true to enable this module.',
    });
  }
}

/**
 * Wizard v2 canonical parking types.
 * NOTE: legacy "parking" strings like '1','2','garage','none' are normalized into parkingType+parkingBays.
 */
const ParkingTypeSchema = z.enum(['none', 'open', 'covered', 'carport', 'garage']);

const UnitTypeSchemaV2 = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    bedrooms: z.number().int().min(0),
    bathrooms: z.number().min(0),

    // Wizard v2 prefers unitSize (range fields are legacy and should not be validated here)
    unitSize: z.number().int().positive().optional(),

    // Wizard v2 canonical pricing
    basePriceFrom: z.number().positive(),
    extras: z
      .array(
        z
          .object({
            price: z.number().nonnegative(),
          })
          .passthrough(),
      )
      .optional(),

    // Wizard v2 canonical parking
    parkingType: ParkingTypeSchema,
    parkingBays: z.number().int().min(0),

    totalUnits: z.number().int().min(0).optional(),
    availableUnits: z.number().int().min(0).optional(),
    reservedUnits: z.number().int().min(0).optional(),

    // isActive exists but is not a publish blocker (defaulting happens server-side)
    isActive: z.boolean().optional(),
  })
  .passthrough();

/**
 * Legacy firewall: normalize "UnitTypeData" from old + new shapes into Wizard v2 shape.
 * - Accepts legacy u.parking (e.g. '1','2','garage','none') and maps to parkingType+parkingBays.
 * - Accepts missing parkingType and defaults safely.
 * - Accepts missing parkingBays and defaults safely.
 * - Accepts legacy priceFrom and maps to basePriceFrom as fallback.
 */
function normalizeUnitType(raw: any) {
  const u = raw ?? {};

  // --- Parking ---
  let parkingType: string | undefined = u.parkingType ?? u.parking_type ?? undefined;

  let parkingBaysRaw = u.parkingBays ?? u.parking_bays ?? undefined;

  // If parkingType is absent, attempt legacy mapping from u.parking
  if (!parkingType && u.parking != null) {
    const p = String(u.parking).trim().toLowerCase();

    // numeric strings -> open bays
    if (p === '1') {
      parkingType = 'open';
      parkingBaysRaw = 1;
    } else if (p === '2') {
      parkingType = 'open';
      parkingBaysRaw = 2;
    } else if (p === '0' || p === 'none' || p === '') {
      parkingType = 'none';
      parkingBaysRaw = 0;
    } else if (p === 'garage') {
      parkingType = 'garage';
      parkingBaysRaw = typeof parkingBaysRaw === 'number' ? parkingBaysRaw : 1;
    } else if (p === 'carport') {
      parkingType = 'carport';
      parkingBaysRaw = typeof parkingBaysRaw === 'number' ? parkingBaysRaw : 1;
    } else {
      // Unknown legacy value -> safest fallback
      parkingType = 'none';
      parkingBaysRaw = 0;
    }
  }

  // Coerce bays into a safe integer
  let parkingBays = Number(parkingBaysRaw ?? 0);
  if (!Number.isFinite(parkingBays)) parkingBays = 0;
  parkingBays = Math.max(0, Math.floor(parkingBays));

  // Hard defaults
  if (!parkingType) parkingType = 'none';

  // If parkingType is none, enforce 0 bays
  if (parkingType === 'none') parkingBays = 0;

  // --- Pricing ---
  // Wizard v2: basePriceFrom is canonical. Fall back to legacy priceFrom ONLY as a firewall.
  const basePriceFrom = Number(
    u.basePriceFrom ?? u.base_price_from ?? u.priceFrom ?? u.price_from ?? 0,
  );

  const toStockInt = (value: unknown): number => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  };
  const totalUnits = toStockInt(u.totalUnits);
  const availableUnits = toStockInt(u.availableUnits);
  const reservedUnits = toStockInt(u.reservedUnits);

  return {
    ...u,
    parkingType,
    parkingBays,
    basePriceFrom,
    totalUnits,
    availableUnits,
    reservedUnits,
  };
}

/**
 * Strict publish validation helper
 * Validates enums, required fields, and unit types before allowing publish.
 * Returns structured errors with field keys for UI highlighting.
 */
function assertPublishable(fullDev: any, verifiedUnitCount?: number) {
  interface ValidationError {
    field: string;
    message: string;
  }

  const errors: ValidationError[] = [];

  // Name validation
  const name = fullDev?.name ?? fullDev?.developmentData?.name;
  if (!name || String(name).trim().length < 2) {
    errors.push({ field: 'name', message: 'Development name is required.' });
  }

  // Location validation
  const address = fullDev?.address ?? fullDev?.developmentData?.location?.address;
  const city = fullDev?.city ?? fullDev?.developmentData?.location?.city;
  const province = fullDev?.province ?? fullDev?.developmentData?.location?.province;

  if (!address) errors.push({ field: 'location.address', message: 'Address is required.' });
  if (!city) errors.push({ field: 'location.city', message: 'City is required.' });
  if (!province) errors.push({ field: 'location.province', message: 'Province is required.' });

  // Nature validation (only allow: new | phase)
  const nature = fullDev?.nature ?? fullDev?.developmentData?.nature;
  if (nature && nature !== 'new' && nature !== 'phase') {
    errors.push({
      field: 'nature',
      message: `Invalid nature: ${nature}. Only 'new' or 'phase' allowed.`,
    });
  }

  // Hero image validation (support both media.heroImage and developments.images[0])
  const heroFromMedia =
    fullDev?.media?.heroImage?.url ?? fullDev?.developmentData?.media?.heroImage?.url;

  const images = Array.isArray(fullDev?.images) ? fullDev.images : [];
  const heroFromImages = (images?.[0] as any)?.url ?? images?.[0];

  if (!heroFromMedia && !heroFromImages) {
    errors.push({ field: 'media.heroImage', message: 'A hero image is required.' });
  }

  // Unit type validation (skip for land)
  const devType = fullDev?.developmentType ?? fullDev?.developmentData?.developmentType;
  const isLand = devType === 'land';
  const transactionType =
    fullDev?.transactionType ??
    fullDev?.developmentData?.transactionType ??
    fullDev?.transaction_type ??
    'for_sale';
  const isRent = transactionType === 'for_rent';
  const unitTypesRaw = Array.isArray(fullDev?.unitTypes) ? fullDev.unitTypes : [];

  if (!isLand) {
    // If verifiedUnitCount is provided, trust it. Otherwise fallback to array check.
    const hasUnits =
      verifiedUnitCount !== undefined ? verifiedUnitCount > 0 : unitTypesRaw.length > 0;

    if (!hasUnits) {
      errors.push({
        field: 'unitTypes',
        message:
          'No unit types found. Please ensure you have added and saved at least one unit type.',
      });
    }

    unitTypesRaw.forEach((raw: any, idx: number) => {
      const u = normalizeUnitType(raw);
      const unitPrefix = `unitTypes[${idx}]`;
      const unitLabel = u?.name || 'Unnamed';

      if (!u?.name) {
        errors.push({ field: `${unitPrefix}.name`, message: 'Unit type is missing a name.' });
      }
      if (u?.bedrooms == null) {
        errors.push({
          field: `${unitPrefix}.bedrooms`,
          message: `Unit "${unitLabel}" missing bedrooms.`,
        });
      }
      if (u?.bathrooms == null) {
        errors.push({
          field: `${unitPrefix}.bathrooms`,
          message: `Unit "${unitLabel}" missing bathrooms.`,
        });
      }

      // Parking validation (Wizard v2)
      const pt = String(u?.parkingType ?? '').trim();
      const pb = Number(u?.parkingBays ?? 0);

      const validParking = ['none', 'open', 'covered', 'carport', 'garage'].includes(pt);
      if (!validParking) {
        errors.push({
          field: `${unitPrefix}.parkingType`,
          message: `Unit "${unitLabel}" has invalid parking type.`,
        });
      }

      if (!Number.isInteger(pb) || pb < 0) {
        errors.push({
          field: `${unitPrefix}.parkingBays`,
          message: `Unit "${unitLabel}" has invalid parking bays.`,
        });
      }

      if (pt === 'none' && pb !== 0) {
        errors.push({
          field: `${unitPrefix}.parkingBays`,
          message: `Unit "${unitLabel}": parking bays must be 0 when parkingType is none.`,
        });
      }

      const total = Number(u?.totalUnits ?? 0);
      const available = Number(u?.availableUnits ?? 0);
      const reserved = Number(u?.reservedUnits ?? 0);

      if (!Number.isFinite(total) || total < 0) {
        errors.push({
          field: `${unitPrefix}.totalUnits`,
          message: `Unit "${unitLabel}" has invalid total units.`,
        });
      }
      if (!Number.isFinite(available) || available < 0) {
        errors.push({
          field: `${unitPrefix}.availableUnits`,
          message: `Unit "${unitLabel}" has invalid available units.`,
        });
      }
      if (!Number.isFinite(reserved) || reserved < 0) {
        errors.push({
          field: `${unitPrefix}.reservedUnits`,
          message: `Unit "${unitLabel}" has invalid reserved units.`,
        });
      }
      if (
        Number.isFinite(total) &&
        Number.isFinite(available) &&
        Number.isFinite(reserved) &&
        available + reserved > total
      ) {
        errors.push({
          field: `${unitPrefix}.reservedUnits`,
          message: `Unit "${unitLabel}" must satisfy available + reserved <= total units.`,
        });
      }

      if (isRent) {
        const rentFrom = Number(u?.monthlyRentFrom ?? u?.monthlyRent ?? 0);
        const rentTo = Number(u?.monthlyRentTo ?? 0);
        if (
          (!Number.isFinite(rentFrom) || rentFrom <= 0) &&
          (!Number.isFinite(rentTo) || rentTo <= 0)
        ) {
          errors.push({
            field: `${unitPrefix}.monthlyRentFrom`,
            message: `Unit "${unitLabel}" must have a valid monthly rent > 0.`,
          });
        }
      } else {
        // Base price validation (Wizard v2)
        const bp = Number(u?.basePriceFrom ?? 0);
        if (!Number.isFinite(bp) || bp <= 0) {
          errors.push({
            field: `${unitPrefix}.basePriceFrom`,
            message: `Unit "${unitLabel}" must have a valid base price > 0.`,
          });
        }
      }
    });
  }

  if (errors.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: errors[0].message,
      cause: {
        errors: errors.map(e => e.message), // legacy compatibility
        validationErrors: errors, // structured for UI
      },
    });
  }
}

const EMPTY_DEVELOPER_KPIS = {
  totalLeads: 0,
  qualifiedLeads: 0,
  conversionRate: 0,
  unitsSold: 0,
  unitsAvailable: 0,
  affordabilityMatchPercent: 0,
  marketingPerformanceScore: 0,
  trends: {
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    unitsSold: 0,
    affordabilityMatchPercent: 0,
    marketingPerformanceScore: 0,
  },
};
// ===========================================================================
// ROUTER DEFINITION
// ===========================================================================

export const developerRouter = router({
  adminListPendingDevelopers: protectedProcedure.input(z.void()).query(async () => {
    return { developers: [] as any[], total: 0 };
  }),

  adminListAllDevelopers: protectedProcedure.input(z.void()).query(async () => {
    return { developers: [] as any[], total: 0 };
  }),

  adminSetTrusted: protectedProcedure
    .input(z.object({ developerId: z.number(), isTrusted: z.boolean() }))
    .mutation(async () => {
      return { ok: true };
    }),
  getPublicDeveloperBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async () => {
      return null;
    }),

  getPublicDevelopmentsForProfile: publicProcedure
    .input(
      z.object({
        profileType: z.string(),
        profileId: z.number(),
      }),
    )
    .query(async () => {
      return [] as any[];
    }),
  createProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        establishedYear: z.number().int().optional().nullable(),
        website: z.string().optional().nullable(),
        email: z.string().email(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().min(2),
        province: z.string().min(2),
        logo: z.string().optional().nullable(),
        completedProjects: z.number().int().optional(),
        currentProjects: z.number().int().optional(),
        upcomingProjects: z.number().int().optional(),
        specializations: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingProfile = await getDeveloperByUserId(requireUser(ctx).id);
      if (existingProfile) return existingProfile;

      // Generate slug for seed cleanup check (use shared generator for consistency)
      const generatedSlug = seedCleanupService.generateSlug(input.name);

      // Clean up any matching seeded brand profile BEFORE creating the real one
      // This blocks registration if deletion fails (fail-fast)
      const cleanupResult = await seedCleanupService.handleSeedDeletionOnRegistration(
        requireUser(ctx).id,
        input.name,
        generatedSlug,
        undefined, // seedBatchId not known at registration
        ctx.req,
      );

      if (cleanupResult.deleted) {
        console.log(
          '[developerRouter.createProfile] Cleaned up seeded brand:',
          cleanupResult.deletedCounts,
        );
      }

      const developerId = await db.createDeveloper({
        name: input.name,
        description: input.description || undefined,
        logo: input.logo || undefined,
        website: input.website || undefined,
        email: input.email,
        phone: input.phone || undefined,
        address: input.address || undefined,
        city: input.city,
        province: input.province,
        category: (input.category as any) || undefined,
        specializations: input.specializations,
        establishedYear: input.establishedYear ?? null,
        completedProjects: input.completedProjects ?? 0,
        currentProjects: input.currentProjects ?? 0,
        upcomingProjects: input.upcomingProjects ?? 0,
        userId: requireUser(ctx).id,
      });

      const brandProfile = await developerBrandProfileService.createBrandProfile({
        brandName: input.name,
        logoUrl: input.logo || null,
        about: input.description || null,
        foundedYear: input.establishedYear ?? null,
        headOfficeLocation:
          input.city && input.province ? `${input.city}, ${input.province}` : null,
        operatingProvinces: input.province ? [input.province] : [],
        propertyFocus: input.specializations || [],
        websiteUrl: input.website || null,
        publicContactEmail: input.email || null,
        identityType: 'developer',
        isVisible: true,
        createdBy: requireUser(ctx).id,
      });

      await developerBrandProfileService.updateBrandProfile(brandProfile.id, {
        isSubscriber: true,
        isClaimable: false,
        ownerType: 'developer',
        linkedDeveloperAccountId: developerId,
      });

      const profile = await getDeveloperByUserId(requireUser(ctx).id);
      if (!profile) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Profile creation failed.' });
      }

      return profile;
    }),
  saveDraft: protectedProcedure
    .input(
      z.object({
        id: z.number().int().optional(),
        brandProfileId: z.number().int().optional(),
        draftData: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sanitized = sanitizeDraftData(input.draftData ?? {});
      const currentStep = Math.max(0, Number((sanitized as any).currentPhase ?? 0));
      const progress = Math.min(100, Math.max(0, Math.round((currentStep / 11) * 100)));
      const draftName =
        String((sanitized as any).developmentData?.name ?? (sanitized as any).name ?? '').trim() ||
        'Untitled Draft';

      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
        const dbConn = await db.getDb();
        if (!dbConn) {
          return { id: input.id ?? Date.now(), success: false, draftData: sanitized };
        }

        if (input.id) {
          const updateSet: Record<string, any> = {
            draftName,
            draftData: sanitized,
            progress,
            currentStep,
            lastModified: new Date().toISOString(),
          };
          if (input.brandProfileId !== undefined) {
            updateSet.developerBrandProfileId = input.brandProfileId;
          }

          await dbConn
            .update(developmentDrafts)
            .set(updateSet)
            .where(
              and(
                eq(developmentDrafts.id, input.id),
                eq(developmentDrafts.developerId, profile.id),
              ),
            );

          return { id: input.id, success: true, draftData: sanitized };
        }

        const insertResult = await dbConn.insert(developmentDrafts).values({
          developerId: profile.id,
          developerBrandProfileId: input.brandProfileId ?? null,
          draftName,
          draftData: sanitized,
          progress,
          currentStep,
        });
        const inserted = Array.isArray(insertResult) ? insertResult[0] : insertResult;

        return {
          id: Number(inserted?.insertId ?? 0),
          success: true,
          draftData: sanitized,
        };
      } catch (error) {
        console.warn('[developer.saveDraft] Falling back to safe response:', error);
        return { id: input.id ?? Date.now(), success: false, draftData: sanitized };
      }
    }),

  getDraft: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
        const dbConn = await db.getDb();
        if (!dbConn) return null;

        const [draft] = await dbConn
          .select()
          .from(developmentDrafts)
          .where(
            and(eq(developmentDrafts.id, input.id), eq(developmentDrafts.developerId, profile.id)),
          )
          .limit(1);

        if (!draft) return null;

        return {
          ...draft,
          draftData: sanitizeDraftData((draft as any).draftData ?? {}),
        };
      } catch (error) {
        console.warn('[developer.getDraft] Returning null due to error:', error);
        return null;
      }
    }),

  getDrafts: protectedProcedure.query(async ({ ctx }) => {
    try {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      const dbConn = await db.getDb();
      if (!dbConn) return [];

      const drafts = await dbConn
        .select()
        .from(developmentDrafts)
        .where(eq(developmentDrafts.developerId, profile.id))
        .orderBy(desc(developmentDrafts.lastModified));

      return drafts.map((draft: any) => ({
        ...draft,
        draftData: sanitizeDraftData(draft?.draftData ?? {}),
      }));
    } catch (error) {
      console.warn('[developer.getDrafts] Returning empty list due to error:', error);
      return [];
    }
  }),

  deleteDraft: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false, id: input.id };

        await dbConn
          .delete(developmentDrafts)
          .where(
            and(eq(developmentDrafts.id, input.id), eq(developmentDrafts.developerId, profile.id)),
          );

        return { success: true, id: input.id };
      } catch (error) {
        console.warn('[developer.deleteDraft] Safe fallback after error:', error);
        return { success: false, id: input.id };
      }
    }),
  getPublishedDevelopments: publicProcedure
    .input(
      z.object({
        province: z.string().optional(),
        limit: z.number().optional(),
        transactionType: z.enum(['for_sale', 'for_rent', 'auction']).optional(),
        developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'land']).optional(),
        enableFallback: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      // Primary Query
      let results = await developmentService.listPublicDevelopments({
        province: input.province,
        limit: input.limit,
        developmentType: input.developmentType,
      } as any);

      let usedFallback = false;
      let fallbackLevel: 'none' | 'province' | 'nationwide' = 'none';

      // Fallback Logic
      if (input.enableFallback && results.length === 0) {
        usedFallback = true;

        // Fallback A: Residential For Sale in SAME province
        if (input.province) {
          fallbackLevel = 'province';
          results = await developmentService.listPublicDevelopments({
            province: input.province,
            limit: input.limit,
            developmentType: 'residential',
          } as any);
        }

        // Fallback B: Residential For Sale NATIONWIDE (if Fallback A empty or no province)
        if (results.length === 0) {
          fallbackLevel = 'nationwide';
          results = await developmentService.listPublicDevelopments({
            limit: input.limit,
            developmentType: 'residential',
          } as any);
        }
      }

      return {
        developments: results,
        meta: {
          usedFallback,
          fallbackLevel,
          primaryCount: usedFallback ? 0 : results.length,
        },
      };
    }),

  getHomeTrendingFeed: publicProcedure
    .input(
      z.object({
        tab: z.enum(['buy', 'rent', 'developments', 'shared_living', 'plot_land', 'commercial']),
        province: z.string().optional(),
        city: z.string().optional(),
        suburb: z.string().optional(),
        limit: z.number().min(1).max(8).optional(),
      }),
    )
    .query(async ({ input }) => {
      const limit = input.limit ?? 5;
      const requestedProvince = input.province?.trim() || undefined;
      const requestedCity = input.city?.trim() || undefined;
      const requestedSuburb = input.suburb?.trim() || undefined;

      type LocationScope = 'suburb' | 'city' | 'province' | 'national';
      type LocationFilter = {
        province?: string;
        city?: string;
        suburb?: string;
      };

      const normalizeDevImage = (images: any): string => {
        if (!images) return '';
        if (Array.isArray(images) && images.length > 0) {
          const first = images[0];
          if (typeof first === 'string') return first;
          if (first && typeof first === 'object' && typeof first.url === 'string') return first.url;
        }
        return '';
      };

      const mapDevelopment = (dev: any) => ({
        id: String(dev.id),
        kind: 'development' as const,
        title: dev.name,
        city: dev.city || '',
        suburb: dev.suburb || '',
        priceFrom: Number(dev.priceFrom || 0),
        priceTo: Number(dev.priceTo || 0),
        image: normalizeDevImage(dev.images),
        href: `/development/${dev.slug || dev.id}`,
      });

      const mapListing = (prop: any) => ({
        id: String(prop.id),
        kind: 'listing' as const,
        title: prop.title || 'Property Listing',
        city: prop.city || '',
        suburb: prop.suburb || '',
        priceFrom: Number(prop.price || 0),
        priceTo: Number(prop.price || 0),
        image: Array.isArray(prop.images) && prop.images[0]?.url ? prop.images[0].url : '',
        href: `/property/${prop.id}`,
      });

      const fetchTabItems = async (
        locationFilter: LocationFilter,
      ): Promise<{
        items: Array<{
          id: string;
          kind: 'development' | 'listing';
          title: string;
          city: string;
          suburb: string;
          priceFrom: number;
          priceTo: number;
          image: string;
          href: string;
        }>;
        source: 'developments' | 'listings';
      }> => {
        if (input.tab === 'buy') {
          const { propertySearchService } = await import('./services/propertySearchService');
          const residentialListingTypes: Array<'house' | 'apartment' | 'townhouse' | 'plot'> = [
            'house',
            'apartment',
            'townhouse',
            'plot',
          ];
          const result = await propertySearchService.searchProperties(
            {
              province: locationFilter.province,
              city: locationFilter.city,
              suburb: locationFilter.suburb ? [locationFilter.suburb] : undefined,
              listingType: 'sale',
              propertyType: residentialListingTypes,
            } as any,
            'date_desc',
            1,
            limit,
          );
          return { items: (result.properties || []).slice(0, limit).map(mapListing), source: 'listings' };
        }

        if (input.tab === 'rent') {
          const { propertySearchService } = await import('./services/propertySearchService');
          const residentialListingTypes: Array<'house' | 'apartment' | 'townhouse'> = [
            'house',
            'apartment',
            'townhouse',
          ];
          const result = await propertySearchService.searchProperties(
            {
              province: locationFilter.province,
              city: locationFilter.city,
              suburb: locationFilter.suburb ? [locationFilter.suburb] : undefined,
              listingType: 'rent',
              propertyType: residentialListingTypes,
            } as any,
            'date_desc',
            1,
            limit,
          );
          return { items: (result.properties || []).slice(0, limit).map(mapListing), source: 'listings' };
        }

        if (input.tab === 'developments') {
          const devs = await developmentService.listPublicDevelopments({
            province: locationFilter.province,
            city: locationFilter.city,
            suburb: locationFilter.suburb,
            limit,
            developmentType: 'residential',
          });
          return { items: devs.map(mapDevelopment), source: 'developments' };
        }

        if (input.tab === 'plot_land') {
          const devs = await developmentService.listPublicDevelopments({
            province: locationFilter.province,
            city: locationFilter.city,
            suburb: locationFilter.suburb,
            limit,
            developmentType: 'land',
          });
          return { items: devs.map(mapDevelopment), source: 'developments' };
        }

        if (input.tab === 'shared_living') {
          const { propertySearchService } = await import('./services/propertySearchService');
          const sharedListingTypes: Array<'rent' | 'sale'> = ['rent'];
          const results = await Promise.all(
            sharedListingTypes.map(listingType =>
              propertySearchService.searchProperties(
                {
                  province: locationFilter.province,
                  city: locationFilter.city,
                  suburb: locationFilter.suburb ? [locationFilter.suburb] : undefined,
                  listingType,
                } as any,
                'date_desc',
                1,
                limit,
              ),
            ),
          );
          const merged = results.flatMap(r => r.properties || []).slice(0, limit);
          return { items: merged.map(mapListing), source: 'listings' };
        }

        // commercial
        const { propertySearchService } = await import('./services/propertySearchService');
        const commercialResults = await Promise.all(
          (['sale', 'rent'] as const).map(listingType =>
            propertySearchService.searchProperties(
              {
                province: locationFilter.province,
                city: locationFilter.city,
                suburb: locationFilter.suburb ? [locationFilter.suburb] : undefined,
                propertyType: ['commercial'],
                listingType,
              } as any,
              'date_desc',
              1,
              limit,
            ),
          ),
        );
        const deduped = Array.from(
          new Map(
            commercialResults
              .flatMap(r => r.properties || [])
              .map((prop: any) => [String(prop.id), prop]),
          ).values(),
        ).slice(0, limit);

        return { items: deduped.map(mapListing), source: 'listings' };
      };

      const requestedScope: LocationScope = requestedSuburb
        ? 'suburb'
        : requestedCity
          ? 'city'
          : requestedProvince
            ? 'province'
            : 'national';

      const locationCandidates: Array<{ scope: LocationScope; filters: LocationFilter }> = [];

      if (requestedSuburb) {
        locationCandidates.push({
          scope: 'suburb',
          filters: {
            province: requestedProvince,
            city: requestedCity,
            suburb: requestedSuburb,
          },
        });
      }

      if (requestedCity) {
        locationCandidates.push({
          scope: 'city',
          filters: {
            province: requestedProvince,
            city: requestedCity,
          },
        });
      }

      if (requestedProvince) {
        locationCandidates.push({
          scope: 'province',
          filters: {
            province: requestedProvince,
          },
        });
      }

      locationCandidates.push({ scope: 'national', filters: {} });

      const dedupedCandidates = locationCandidates.filter(
        (candidate, idx, all) =>
          all.findIndex(
            c =>
              c.scope === candidate.scope &&
              (c.filters.province || '') === (candidate.filters.province || '') &&
              (c.filters.city || '') === (candidate.filters.city || '') &&
              (c.filters.suburb || '') === (candidate.filters.suburb || ''),
          ) === idx,
      );

      let items: Array<{
        id: string;
        kind: 'development' | 'listing';
        title: string;
        city: string;
        suburb: string;
        priceFrom: number;
        priceTo: number;
        image: string;
        href: string;
      }> = [];
      let source: 'developments' | 'listings' = 'developments';
      let selectedScope: LocationScope = requestedScope;

      for (const candidate of dedupedCandidates) {
        const result = await fetchTabItems(candidate.filters);
        if (result.items.length > 0 || candidate.scope === 'national') {
          items = result.items;
          source = result.source;
          selectedScope = candidate.scope;
          break;
        }
      }

      const usedFallback = requestedScope !== selectedScope;
      const fallbackLevel = usedFallback ? `${requestedScope}_to_${selectedScope}` : 'none';

      return {
        items,
        meta: {
          tab: input.tab,
          source,
          usedFallback,
          fallbackLevel,
          requestedScope,
          selectedScope,
          requestedProvince: requestedProvince ?? null,
          requestedCity: requestedCity ?? null,
          requestedSuburb: requestedSuburb ?? null,
          resultCount: items.length,
        },
      };
    }),

  getPublicDevelopmentBySlug: publicProcedure
    .input(z.object({ slugOrId: z.string().min(1) }))
    .query(async ({ input }) => {
      return await developmentService.getPublicDevelopmentBySlug(input.slugOrId);
    }),

  listPublicDevelopments: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await developmentService.listPublicDevelopments({
        limit: input.limit,
      });
    }),

  createLead: publicProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        developerBrandProfileId: z.number().int().positive().optional(),
        unitId: z.string().trim().max(36).optional(),
        unitName: z.string().trim().max(255).optional(),
        unitPriceFrom: z.number().nonnegative().optional(),
        unitBedrooms: z.number().int().nonnegative().optional(),
        unitBathrooms: z.number().nonnegative().optional(),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        message: z.string().optional(),
        affordabilityData: z
          .object({
            monthlyIncome: z.number().optional(),
            monthlyExpenses: z.number().optional(),
            monthlyDebts: z.number().optional(),
            availableDeposit: z.number().optional(),
            maxAffordable: z.number().optional(),
            calculatedAt: z.string().optional(),
          })
          .optional(),
        referrerUrl: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        leadSource: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await capturePublicLead({
        developmentId: input.developmentId,
        developerBrandProfileId: input.developerBrandProfileId,
        unitId: input.unitId,
        unitName: input.unitName,
        unitPriceFrom: input.unitPriceFrom,
        unitBedrooms: input.unitBedrooms,
        unitBathrooms: input.unitBathrooms,
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        leadType: 'inquiry',
        source: input.leadSource || 'development_detail',
        leadSource: input.leadSource || 'development_detail',
        referrerUrl: input.referrerUrl,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        affordabilityData: input.affordabilityData,
      });
    }),

  getLeads: protectedProcedure
    .input(
      z
        .object({
          developmentId: z.number().int().positive().optional(),
          stage: LeadStageSchema.optional(),
          owner: LeadOwnerTypeSchema.optional(),
          source: z.string().trim().max(120).optional(),
          q: z.string().trim().max(120).optional(),
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
          limit: z.number().int().min(1).max(200).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await listDeveloperLeads({
        developerId: profile.id,
        developmentId: input?.developmentId,
        stage: input?.stage,
        owner: input?.owner,
        source: input?.source,
        q: input?.q,
        from: input?.from,
        to: input?.to,
        limit: input?.limit,
        offset: input?.offset,
      });
    }),

  assignLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        ownerType: LeadOwnerTypeSchema,
        ownerId: z.number().int().positive().nullable().optional(),
        assignmentMode: AssignmentModeSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await assignDeveloperLead({
        developerId: profile.id,
        leadId: input.leadId,
        ownerType: input.ownerType,
        ownerId: input.ownerId ?? null,
        assignmentMode: input.assignmentMode,
      });
    }),

  transitionLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        toStage: LeadStageSchema,
        notes: z.string().max(2000).optional(),
        force: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const profile = await requireDeveloperProfileByUserId(user.id);
      return await transitionDeveloperLead({
        developerId: profile.id,
        userId: user.id,
        leadId: input.leadId,
        toStage: input.toStage,
        notes: input.notes,
        force: input.force,
      });
    }),

  logLeadActivity: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        type: z.enum(['note', 'call', 'email', 'meeting', 'status_change', 'whatsapp']),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const profile = await requireDeveloperProfileByUserId(user.id);
      return await logDeveloperLeadActivity({
        developerId: profile.id,
        userId: user.id,
        leadId: input.leadId,
        type: input.type,
        description: input.description,
      });
    }),

  setLeadNextAction: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        at: z.string().datetime(),
        type: z.enum(['call', 'email', 'whatsapp', 'schedule_viewing', 'send_brochure', 'other']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const profile = await requireDeveloperProfileByUserId(user.id);
      return await setDeveloperLeadNextAction({
        developerId: profile.id,
        userId: user.id,
        leadId: input.leadId,
        at: input.at,
        type: input.type,
      });
    }),

  getDistributionSettings: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertDeveloperDistributionEnabled();
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await getDeveloperDistributionSettings({
        developerId: profile.id,
        developmentId: input.developmentId,
      });
    }),

  setDistributionEnabled: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertDeveloperDistributionEnabled();
      const user = requireUser(ctx);
      const profile = await requireDeveloperProfileByUserId(user.id);
      return await setDeveloperDistributionEnabled({
        developerId: profile.id,
        userId: user.id,
        developmentId: input.developmentId,
        enabled: input.enabled,
      });
    }),

  getFunnelKPIs: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int().positive().optional(),
        range: z.enum(['7d', '30d', '90d']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await getDeveloperFunnelKpis({
        developerId: profile.id,
        developmentId: input.developmentId,
        range: input.range ?? '30d',
      });
    }),

  getFunnelAttention: protectedProcedure
    .input(
      z
        .object({
          developmentId: z.number().int().positive().optional(),
          range: z.enum(['7d', '30d', '90d']).optional(),
          sla: SlaStatusSchema.optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await getDeveloperFunnelAttention({
        developerId: profile.id,
        developmentId: input?.developmentId,
        range: input?.range ?? '30d',
        sla: input?.sla,
        limit: input?.limit,
      });
    }),

  createDevelopment: protectedProcedure
    .input(
      z
        .object({
          name: z.string(),
          developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'land']).optional(),
        })
        .passthrough(),
    )
    .mutation(async ({ ctx, input }) => {
      const role = requireUser(ctx).role;

      // 🔒 Hard separation
      if (role === 'property_developer') {
        // Real developer: force no emulation
        (ctx as any).operatingAs = undefined;
      }

      if (role === 'super_admin') {
        // Super admin: emulation is required for this endpoint
        if (!ctx.operatingAs?.brandProfileId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Super admin must operate as a brand to create developments in emulator mode.',
          });
        }
      }

      const development = await developmentService.createDevelopment(
        requireUser(ctx).id,
        input as any,
        {},
        ctx.operatingAs ?? null,
      );

      return { development };
    }),

  deleteDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      // Use operatingAs from applyBrandContext middleware
      const operatingAs = (ctx as any).operatingAs;

      // Debug: Log context again to confirm router sees what middleware set
      console.log('[deleteDevelopment Router] Context inspection:', {
        userId: user.id,
        userRole: user.role,
        operatingAs: operatingAs,
        hasOperatingAs: !!operatingAs,
      });

      // Build operating context for super admin emulation
      const operatingContext = operatingAs?.brandProfileId
        ? { brandProfileId: operatingAs.brandProfileId }
        : null;

      console.log('[deleteDevelopment Router] Built operatingContext:', operatingContext);

      await developmentService.deleteDevelopment(input.id, user.id, operatingContext);

      return { success: true, deletedId: input.id };
    }),

  getDashboardKPIs: protectedProcedure
    .input(
      z
        .object({
          timeRange: z.enum(['7d', '30d', '90d']).optional(),
          forceRefresh: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
        return await getKPIsWithCache(profile.id, input?.timeRange, input?.forceRefresh ?? false);
      } catch (error) {
        console.warn('[developer.getDashboardKPIs] Returning safe defaults due to error:', error);
        return EMPTY_DEVELOPER_KPIS;
      }
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    return await developerSubscriptionService.getSubscription(profile.id);
  }),

  getActivityFeed: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    return await getActivityFeedService(profile.id);
  }),

  /**
   * Get Developer Profile (Dashboard)
   * Secured by role guard: property_developer or super_admin
   * Supports brand emulation for super admins
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx);
    const operatingAs = ctx.operatingAs;
    const role = user.role;

    if (role !== 'property_developer' && role !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient role for developer profile.',
      });
    }

    // Handle brand emulation mode
    if (role === 'super_admin' && operatingAs?.mode === 'seeding') {
      if (
        operatingAs.brandProfileType !== 'developer' &&
        operatingAs.brandProfileType !== 'hybrid'
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Brand emulation context must be developer or hybrid type for developer profile.',
        });
      }

      // Return brand profile instead of user profile in emulation mode
      const brandProfile = await getBrandProfileById(operatingAs.brandProfileId);
      if (!brandProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Brand profile ${operatingAs.brandProfileId} not found.`,
        });
      }

      // Transform brand profile to match expected developer profile format
      return {
        id: brandProfile.id,
        userId: user.id, // Use super admin's user ID for context
        companyName: brandProfile.brandName,
        brandProfileId: brandProfile.id,
        logoUrl: brandProfile.logoUrl,
        about: brandProfile.about,
        websiteUrl: brandProfile.websiteUrl,
        foundedYear: brandProfile.foundedYear,
        headOfficeLocation: brandProfile.headOfficeLocation,
        operatingProvinces: brandProfile.operatingProvinces,
        propertyFocus: brandProfile.propertyFocus,
        // Emulation-specific fields
        isEmulation: true,
        emulationType: 'developer',
        actualUser: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }

    if (role === 'super_admin' && !operatingAs) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'BRAND_CONTEXT_REQUIRED',
      });
    }

    // Normal real user flow
    const profile = await getDeveloperByUserId(user.id);

    if (!profile) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer profile not found.' });
    }

    return profile;
  }),

  // ------------------------------

  updateDevelopment: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.record(z.any()), // Accepts loose partial updates
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireDeveloperProfileByUserId(requireUser(ctx).id);
      return await developmentService.updateDevelopment(
        input.id,
        requireUser(ctx).id,
        input.data as any,
      );
    }),

  getDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);

        // NOTE: Using getDevelopmentWithPhases to ensure we return full object
        const dev = await developmentService.getDevelopmentWithPhases(input.id);
        if (!dev) return null;

        if (dev.developerId !== profile.id) {
          return null;
        }
        return dev;
      } catch (error) {
        console.warn('[developer.getDevelopment] Returning null due to error:', error);
        return null;
      }
    }),

  getDevelopments: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(requireUser(ctx).id);
    console.log(
      `[developer.getDevelopments] userId=${requireUser(ctx).id} developerProfileId=${profile.id} filterDeveloperId=${profile.id}`,
    );
    return await developmentService.getDevelopmentsByDeveloperId(profile.id);
  }),

  upgradeSubscription: protectedProcedure
    .input(z.object({ tier: z.string().optional() }).optional())
    .mutation(async () => {
      return { success: true };
    }),

  getUnreadNotificationsCount: protectedProcedure.query(async () => {
    return { count: 0 };
  }),

  publishDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      // Simplified: Let the service handle super admin vs developer logic
      const result = await developmentService.publishDevelopment(
        input.id,
        requireUser(ctx).id,
        ctx.operatingAs, // Pass emulation context directly
      );

      return result;
    }),

  unpublishDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const result = await developmentService.unpublishDevelopment(input.id, requireUser(ctx).id);
      return result;
    }),
});
