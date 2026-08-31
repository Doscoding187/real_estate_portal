import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import {
  COMMERCIAL_ASSET_KINDS,
  COMMERCIAL_CONFIRMATION_SOURCES,
  COMMERCIAL_ECONOMIC_COMPONENT_CODES,
  COMMERCIAL_NONPUBLIC_AVAILABILITY_STATES,
  COMMERCIAL_SPACE_CLASSES,
  COMMERCIAL_SPACE_KINDS,
  COMMERCIAL_SPECIFICATION_CODES,
} from '../shared/commercial-domain';
import {
  attachCommercialMarketingMedia,
  createCommercialDraft,
  isCommercialAuthorRole,
  myCommercialInventoryForAuthor,
  publicCommercialDetail,
  reconfirmCommercialAvailability,
  setCommercialAvailabilityStatus,
  reusableCommercialAssetsForAuthor,
  searchPublicCommercial,
  submitCommercialForReview,
} from './services/commercialOfficeService';

const economics = z.object({
  componentCode: z.enum(COMMERCIAL_ECONOMIC_COMPONENT_CODES),
  valueState: z.enum(['supplied', 'estimated', 'unknown', 'not_applicable']),
  chargeBasis: z
    .enum(['per_m2_month', 'per_bay_month', 'fixed_monthly', 'annual', 'once'])
    .nullable(),
  amountMinor: z.number().int().nonnegative().nullable(),
  rangeMaximumMinor: z.number().int().nonnegative().nullable(),
});
const specification = z.object({
  specificationCode: z.enum(COMMERCIAL_SPECIFICATION_CODES),
  valueState: z.enum(['known', 'unknown', 'unavailable', 'not_applicable']),
  numericValue: z.number().nullable(),
  textValue: z.string().max(500).nullable(),
  booleanValue: z.boolean().nullable(),
});

function author(ctx: { user?: { id: number; role?: string | null } | null }) {
  const user = requireUser(ctx);
  if (!isCommercialAuthorRole(user.role))
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Commercial authoring requires an authorised supplier.',
    });
  return user;
}
function rethrow(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: error instanceof Error ? error.message : 'Commercial workflow action failed.',
  });
}

export const commercialRouter = router({
  createDraft: protectedProcedure
    .input(
      z.object({
        asset: z.discriminatedUnion('mode', [
          z.object({
            mode: z.literal('new'),
            assetKind: z.enum(COMMERCIAL_ASSET_KINDS),
            name: z.string().trim().min(2).max(255),
            provinceId: z.number().int().positive(),
            cityId: z.number().int().positive(),
            suburbId: z.number().int().positive().nullable().optional(),
            privateAddress: z.object({
              streetNumber: z.string().trim().min(1).max(32).optional(),
              streetName: z.string().trim().min(1).max(255),
              buildingName: z.string().trim().min(1).max(255).optional(),
              complexOrEstateName: z.string().trim().min(1).max(255).optional(),
              unitNumber: z.string().trim().min(1).max(64).optional(),
              postalCode: z.string().trim().min(1).max(20).optional(),
              farmOrHoldingName: z.string().trim().min(1).max(255).optional(),
              portionReference: z.string().trim().min(1).max(128).optional(),
            }),
            coordinateSource: z.enum(['autocomplete', 'map', 'manual_confirmed']),
            latitude: z.number().finite().nullable().optional(),
            longitude: z.number().finite().nullable().optional(),
            providerLocationPlaceId: z.string().trim().min(1).max(255).nullable().optional(),
            publicLocationPrecision: z.enum(['approximate', 'exact']).optional(),
            confirmPhysicalLocation: z.literal(true),
          }),
          z.object({ mode: z.literal('existing'), commercialAssetId: z.number().int().positive() }),
        ]),
        space: z.object({
          spaceClass: z.enum(COMMERCIAL_SPACE_CLASSES),
          spaceKind: z.enum(COMMERCIAL_SPACE_KINDS),
          identifier: z.string().trim().min(1).max(255),
          rentableAreaM2: z.number().positive(),
          usableAreaM2: z.number().positive().nullable().optional(),
        }),
        availability: z.object({
          availabilityState: z.enum(['available_confirmed', 'available_upcoming']),
          occupationDate: z.string().date().nullable().optional(),
          confirmationSource: z.enum(COMMERCIAL_CONFIRMATION_SOURCES),
          confirmationSourceLabel: z.string().trim().max(255).nullable().optional(),
          lastConfirmedAt: z.string().datetime(),
          reconfirmationDueAt: z.string().datetime(),
          pricingMode: z.enum(['componentised', 'gross_quote']),
          vatTreatment: z.enum(['included', 'excluded', 'not_applicable', 'unknown']),
        }),
        economics: z.array(economics).min(1),
        specifications: z.array(specification),
        leaseTerms: z
          .object({
            minimumLeaseMonths: z.number().int().positive().nullable().optional(),
            quotedLeaseMonths: z.number().int().positive().nullable().optional(),
            annualEscalationPercent: z.number().nonnegative().max(100).nullable().optional(),
            depositMinor: z.number().int().nonnegative().nullable().optional(),
            tenantInstallationAllowanceMinor: z.number().int().nonnegative().nullable().optional(),
            beneficialOccupationDays: z.number().int().nonnegative().nullable().optional(),
            sourceLabel: z.string().trim().max(255).nullable().optional(),
            suppliedAt: z.string().datetime().nullable().optional(),
          })
          .optional(),
        marketing: z.object({
          title: z.string().trim().min(10).max(255),
          description: z.string().trim().min(50).max(5000),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCommercialDraft({ ...input, userId: author(ctx).id } as any);
      } catch (error) {
        return rethrow(error);
      }
    }),
  reusableAssets: protectedProcedure
    .input(z.object({ spaceClass: z.enum(COMMERCIAL_SPACE_CLASSES) }))
    .query(async ({ ctx, input }) => {
      try {
        return await reusableCommercialAssetsForAuthor(author(ctx).id, input.spaceClass);
      } catch (error) {
        return rethrow(error);
      }
    }),
  myInventory: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await myCommercialInventoryForAuthor(author(ctx).id);
    } catch (error) {
      return rethrow(error);
    }
  }),
  reconfirmAvailability: protectedProcedure
    .input(
      z.object({
        commercialAvailabilityId: z.number().int().positive(),
        availabilityState: z.enum(['available_confirmed', 'available_upcoming']),
        occupationDate: z.string().date().nullable().optional(),
        confirmationSource: z.enum(COMMERCIAL_CONFIRMATION_SOURCES),
        confirmationSourceLabel: z.string().trim().max(255).nullable().optional(),
        lastConfirmedAt: z.string().datetime(),
        reconfirmationDueAt: z.string().datetime(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await reconfirmCommercialAvailability({ ...input, userId: author(ctx).id });
      } catch (error) {
        return rethrow(error);
      }
    }),
  setAvailabilityStatus: protectedProcedure
    .input(
      z.object({
        commercialAvailabilityId: z.number().int().positive(),
        availabilityState: z.enum(COMMERCIAL_NONPUBLIC_AVAILABILITY_STATES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await setCommercialAvailabilityStatus({ ...input, userId: author(ctx).id });
      } catch (error) {
        return rethrow(error);
      }
    }),
  submit: protectedProcedure
    .input(z.object({ listingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitCommercialForReview({ ...input, userId: author(ctx).id });
      } catch (error) {
        return rethrow(error);
      }
    }),
  attachMarketingMedia: protectedProcedure
    .input(z.object({ listingId: z.number().int().positive(), uploadToken: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await attachCommercialMarketingMedia({ ...input, userId: author(ctx).id });
      } catch (error) {
        return rethrow(error);
      }
    }),
  search: publicProcedure
    .input(
      z
        .object({
          location: z.string().trim().min(1).max(200).optional(),
          locationIds: z.array(z.string().trim().min(1).max(128)).max(10).optional(),
          useTypes: z.array(z.enum(COMMERCIAL_SPACE_CLASSES)).min(1).max(3).optional(),
          pricingMode: z.enum(['componentised', 'gross_quote']).optional(),
          minAreaM2: z.number().positive().optional(),
          maxAreaM2: z.number().positive().optional(),
          maxMonthlyBudgetMinor: z.number().int().nonnegative().optional(),
          availability: z.enum(['now', 'future']).optional(),
          fitOutCondition: z.string().trim().max(100).optional(),
          backupPower: z.literal(true).optional(),
          backupWater: z.literal(true).optional(),
          fibreConnectivity: z.literal(true).optional(),
          minParkingBays: z.number().nonnegative().optional(),
          minEavesHeightM: z.number().nonnegative().optional(),
          minPowerCapacityKva: z.number().nonnegative().optional(),
          minLoadingDocks: z.number().int().nonnegative().optional(),
          yardHardstand: z.literal(true).optional(),
          extractionCapability: z.literal(true).optional(),
        })
        .optional(),
    )
    .query(({ input }) => searchPublicCommercial(input)),
  detail: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(255) }))
    .query(({ input }) => publicCommercialDetail(input.slug)),
});
