import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { EmailService } from './_core/emailService';
import { developerSubscriptionService } from './services/developerSubscriptionService';
import { developmentService } from './services/developmentService';
import { unitService } from './services/unitService';
import * as partnershipService from './services/partnershipService';
import { getDeveloperByUserId, requireDeveloperProfileByUserId } from './services/developerService'; // [NEW] Import service methods
import { developerBrandProfileService } from './services/developerBrandProfileService';
import {
  calculateAffordabilityCompanion,
  matchUnitsToAffordability,
} from './services/affordabilityCompanion';
import { getActivityFeed } from './services/activityService';
import { getKPIsWithCache } from './services/kpiService';
import {
  developmentDrafts,
  developments,
  developers,
  developerBrandProfiles,
  unitTypes,
} from '../drizzle/schema';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { calculateDevelopmentReadiness } from './lib/readiness';
import { sanitizeDraftData } from './lib/sanitizeDraftData';

console.log('[DEV ROUTER LOADED] build stamp', new Date().toISOString());

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

  return {
    ...u,
    parkingType,
    parkingBays,
    basePriceFrom,
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

      if (isRent) {
        const rentFrom = Number(u?.monthlyRentFrom ?? u?.monthlyRent ?? 0);
        const rentTo = Number(u?.monthlyRentTo ?? 0);
        if ((!Number.isFinite(rentFrom) || rentFrom <= 0) && (!Number.isFinite(rentTo) || rentTo <= 0)) {
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
// ===========================================================================
// ROUTER DEFINITION
// ===========================================================================

export const developerRouter = router({
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
      const existingProfile = await getDeveloperByUserId(ctx.user.id);
      if (existingProfile) return existingProfile;

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
        userId: ctx.user.id,
      });

      const brandProfile = await developerBrandProfileService.createBrandProfile({
        brandName: input.name,
        logoUrl: input.logo || null,
        about: input.description || null,
        foundedYear: input.establishedYear ?? null,
        headOfficeLocation: input.city && input.province ? `${input.city}, ${input.province}` : null,
        operatingProvinces: input.province ? [input.province] : [],
        propertyFocus: input.specializations || [],
        websiteUrl: input.website || null,
        publicContactEmail: input.email || null,
        identityType: 'developer',
        isVisible: true,
        createdBy: ctx.user.id,
      });

      await developerBrandProfileService.updateBrandProfile(brandProfile.id, {
        isSubscriber: true,
        isClaimable: false,
        ownerType: 'developer',
        linkedDeveloperAccountId: developerId,
      });

      const profile = await getDeveloperByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Profile creation failed.' });
      }

      return profile;
    }),
  getPublishedDevelopments: publicProcedure
    .input(
      z.object({
        province: z.string().optional(),
        limit: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await developmentService.listPublicDevelopments({
        province: input.province,
        limit: input.limit,
      });
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
      const development = await developmentService.createDevelopment(ctx.user.id, input as any);
      return { development };
    }),

  getDashboardKPIs: protectedProcedure
    .input(z.object({ timeRange: z.enum(['7d', '30d', '90d']).optional() }))
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(ctx.user.id);
      return await getKPIsWithCache(profile.id, input.timeRange);
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(ctx.user.id);
    return await developerSubscriptionService.getSubscription(profile.id);
  }),

  getActivityFeed: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(ctx.user.id);
    return await getActivityFeed(profile.id);
  }),

  /**
   * Get Developer Profile (Dashboard)
   * Secured by role guard: property_developer or super_admin
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    // Auth is guaranteed by protectedProcedure; still enforce role
    const role = ctx.user?.role;

    if (role !== 'property_developer' && role !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient role for developer profile.',
      });
    }

    const profile = await getDeveloperByUserId(ctx.user.id);

    if (!profile) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer profile not found.' });
    }

    return profile;
  }),

  // -- [NEW] Dashboard Procedures --
  getDashboardKPIs: protectedProcedure
    .input(z.object({ timeRange: z.enum(['7d', '30d', '90d']).optional() }))
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(ctx.user.id);
      return await getKPIsWithCache(profile.id, input.timeRange);
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(ctx.user.id);
    return await developerSubscriptionService.getSubscription(profile.id);
  }),

  getActivityFeed: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(ctx.user.id);
    return await getActivityFeed(profile.id);
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
      await requireDeveloperProfileByUserId(ctx.user.id);
      return await developmentService.updateDevelopment(input.id, ctx.user.id, input.data as any);
    }),

  getDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(ctx.user.id);

      // NOTE: Using getDevelopmentWithPhases to ensure we return full object
      const dev = await developmentService.getDevelopmentWithPhases(input.id);
      if (!dev) throw new TRPCError({ code: 'NOT_FOUND' });

      if (dev.developerId !== profile.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this development' });
      }
      return dev;
    }),

  getDevelopments: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDeveloperProfileByUserId(ctx.user.id);
    console.log(
      `[developer.getDevelopments] userId=${ctx.user.id} developerProfileId=${profile.id} filterDeveloperId=${profile.id}`,
    );
    return await developmentService.getDevelopmentsByDeveloperId(profile.id);
  }),

  getUnreadNotificationsCount: protectedProcedure.query(async () => {
    return 0;
  }),

  publishDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Map user ID to developer profile ID using canonical helper
      const developerProfile = await requireDeveloperProfileByUserId(ctx.user.id);

      const dev = await developmentService.getDevelopmentWithPhases(input.id);
      if (!dev) throw new TRPCError({ code: 'NOT_FOUND' });

      // Compare using developer profile ID
      if (dev.developerId !== developerProfile.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // 1. Strict Validation - DB-backed unit types check
      const isLand = dev.developmentType === 'land';

      let unitTypeCount = 0;

      if (!isLand) {
        // ✅ Query DB directly instead of relying on object shape
        const dbConn = await db.getDb();
        if (!dbConn)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        const unitTypeCountRes = await dbConn
          .select({ cnt: sql<number>`count(*)`.as('cnt') })
          .from(unitTypes)
          .where(eq(unitTypes.developmentId, input.id));

        unitTypeCount = Number(unitTypeCountRes?.[0]?.cnt ?? 0);

        console.log('[publishDevelopment] id=', input.id);
        console.log('[publishDevelopment] unitTypeCountRes=', unitTypeCountRes);
        console.log('[publishDevelopment] unitTypeCount=', unitTypeCount);

        if (unitTypeCount <= 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'No unit types found. Please ensure you have added and saved at least one unit type.',
          });
        }
      }

      // Run remaining validation
      assertPublishable(dev, unitTypeCount);

      // 2. Publish
      // Using simple publish for now as confirmed by user preference
      return await developmentService.publishDevelopment(input.id, ctx.user.id);
    }),

  deleteDevelopment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await requireDeveloperProfileByUserId(ctx.user.id);
      return await developmentService.deleteDevelopment(input.id, profile.id);
    }),
});
