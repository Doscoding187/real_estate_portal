import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import {
  attachOfficeMarketingMedia,
  createOfficeDraft,
  isCommercialAuthorRole,
  publicOfficeDetail,
  reusableOfficeAssetsForAuthor,
  searchPublicOffice,
  submitOfficeForReview,
} from './services/commercialOfficeService';

const economics = z.object({
  componentCode: z.enum([
    'base_rent',
    'gross_rent',
    'operating_costs',
    'rates_recoveries',
    'parking',
    'fixed_levies',
    'utilities',
    'security_service',
    'other_recovery',
    'deposit',
    'incentive',
  ]),
  valueState: z.enum(['supplied', 'estimated', 'unknown', 'not_applicable']),
  chargeBasis: z
    .enum(['per_m2_month', 'per_bay_month', 'fixed_monthly', 'annual', 'once'])
    .nullable(),
  amountMinor: z.number().int().nonnegative().nullable(),
  rangeMaximumMinor: z.number().int().nonnegative().nullable(),
});
const specification = z.object({
  specificationCode: z.enum([
    'building_grade',
    'fit_out_condition',
    'backup_power',
    'backup_water',
    'fibre_connectivity',
    'parking_bays',
    'eaves_height_m',
    'yard_hardstand',
    'truck_access',
    'roller_doors',
    'loading_docks',
    'power_capacity_kva',
    'floor_loading',
    'sprinklers',
    'crane_capacity',
    'frontage_visibility',
    'footfall_context',
    'extraction_capability',
    'tenant_mix_context',
    'delivery_access',
  ]),
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
      message: 'Commercial Office authoring requires an authorised supplier.',
    });
  return user;
}
function rethrow(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: error instanceof Error ? error.message : 'Commercial Office workflow action failed.',
  });
}

export const commercialOfficeRouter = router({
  createDraft: protectedProcedure
    .input(
      z.object({
        asset: z.discriminatedUnion('mode', [
          z.object({
            mode: z.literal('new'),
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
          identifier: z.string().trim().min(1).max(255),
          rentableAreaM2: z.number().positive(),
          usableAreaM2: z.number().positive().nullable().optional(),
          floorLevel: z.string().trim().max(100).nullable().optional(),
        }),
        availability: z.object({
          availabilityState: z.enum(['available_confirmed', 'available_upcoming']),
          occupationDate: z.string().date().nullable().optional(),
          confirmationSource: z.enum([
            'broker',
            'landlord',
            'owner',
            'asset_manager',
            'property_fund',
            'other',
          ]),
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
        return await createOfficeDraft({ ...input, userId: author(ctx).id } as any);
      } catch (error) {
        return rethrow(error);
      }
    }),
  reusableAssets: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await reusableOfficeAssetsForAuthor(author(ctx).id);
    } catch (error) {
      return rethrow(error);
    }
  }),
  submit: protectedProcedure
    .input(z.object({ listingId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitOfficeForReview({ ...input, userId: author(ctx).id });
      } catch (error) {
        return rethrow(error);
      }
    }),
  attachMarketingMedia: protectedProcedure
    .input(z.object({ listingId: z.number().int().positive(), uploadToken: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await attachOfficeMarketingMedia({ ...input, userId: author(ctx).id });
      } catch (error) {
        return rethrow(error);
      }
    }),
  search: publicProcedure
    .input(
      z
        .object({
          location: z.string().trim().min(1).max(200).optional(),
          minAreaM2: z.number().positive().optional(),
          maxAreaM2: z.number().positive().optional(),
          maxMonthlyBudgetMinor: z.number().int().nonnegative().optional(),
          availability: z.enum(['now', 'future']).optional(),
          fitOutCondition: z.string().trim().max(100).optional(),
          backupPower: z.literal(true).optional(),
          backupWater: z.literal(true).optional(),
          fibreConnectivity: z.literal(true).optional(),
          minParkingBays: z.number().nonnegative().optional(),
        })
        .optional(),
    )
    .query(({ input }) => searchPublicOffice(input)),
  detail: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(255) }))
    .query(({ input }) => publicOfficeDetail(input.slug)),
});
