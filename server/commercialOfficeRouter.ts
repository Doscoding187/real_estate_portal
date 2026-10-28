import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import {
  COMMERCIAL_ASSET_KINDS,
  COMMERCIAL_CANONICAL_ASSIGNMENT_BLOCKER,
  COMMERCIAL_CONFIRMATION_SOURCES,
  COMMERCIAL_ECONOMIC_COMPONENT_CODES,
  COMMERCIAL_NONPUBLIC_AVAILABILITY_STATES,
  COMMERCIAL_SPACE_CLASSES,
  COMMERCIAL_SPACE_KINDS,
  COMMERCIAL_SPECIFICATION_CODES,
} from '../shared/commercial-domain';
import { PLACE_ID_REGEX } from '../shared/placeAuthority';

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
  if (!['agent', 'agency_admin'].includes(String(user.role)))
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Commercial authoring requires an authorised supplier.',
    });
  return user;
}
function requireCanonicalCommercialAssignments<T = never>(): T {
  throw new TRPCError({ code: 'PRECONDITION_FAILED', message: COMMERCIAL_CANONICAL_ASSIGNMENT_BLOCKER });
}

export const commercialRouter = router({
  createDraft: protectedProcedure
    .input(
      z.object({
        asset: z.object({
            mode: z.literal('new'),
            assetKind: z.enum(COMMERCIAL_ASSET_KINDS),
            name: z.string().trim().min(2).max(255),
            canonicalPlaceId: z.string().trim().min(1).max(40),
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
          }).strict(),
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
    .mutation(({ ctx }) => {
      author(ctx);
      return requireCanonicalCommercialAssignments<{ listingId: number }>();
    }),
  reusableAssets: protectedProcedure
    .input(z.object({ spaceClass: z.enum(COMMERCIAL_SPACE_CLASSES) }))
    .query(({ ctx }) => {
      author(ctx);
      requireCanonicalCommercialAssignments();
    }),
  myInventory: protectedProcedure.query(({ ctx }): unknown[] => {
    author(ctx);
    return requireCanonicalCommercialAssignments<unknown[]>();
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
    .mutation(({ ctx }) => {
      author(ctx);
      requireCanonicalCommercialAssignments();
    }),
  setAvailabilityStatus: protectedProcedure
    .input(
      z.object({
        commercialAvailabilityId: z.number().int().positive(),
        availabilityState: z.enum(COMMERCIAL_NONPUBLIC_AVAILABILITY_STATES),
      }),
    )
    .mutation(({ ctx }) => {
      author(ctx);
      requireCanonicalCommercialAssignments();
    }),
  submit: protectedProcedure
    .input(z.object({ listingId: z.number().int().positive() }))
    .mutation(({ ctx }) => {
      author(ctx);
      requireCanonicalCommercialAssignments();
    }),
  attachMarketingMedia: protectedProcedure
    .input(z.object({ listingId: z.number().int().positive(), uploadToken: z.string().min(1) }))
    .mutation(({ ctx }) => {
      author(ctx);
      requireCanonicalCommercialAssignments();
    }),
  search: publicProcedure
    .input(
      z
        .object({
          canonicalPlaceId: z.string().trim().regex(PLACE_ID_REGEX),
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
        .strict(),
    )
    .query(() => requireCanonicalCommercialAssignments()),
  detail: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(255) }).strict())
    .query(() => requireCanonicalCommercialAssignments()),
});
