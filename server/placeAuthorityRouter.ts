/**
 * Place Authority — internal executable boundary (Slice 3).
 *
 * This is the read/resolve surface for the admitted Place dataset. It is
 * deliberately internal: it does not switch the public platform over, and it
 * does not replace any existing consumer. Its purpose is to prove that the
 * Place dataset is executable end to end — query, canonical selection, exact
 * scope execution — and that a caller supplying mixed authority is refused
 * rather than quietly widened.
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { getDb } from './db';
import { savedSearches } from '../drizzle/schema/leads';
import {
  discoverPlaces,
  discoverSearchAreasForPlace,
  executePlace,
} from './services/placeDiscoveryService';
import {
  PLACE_DISCOVERY_KINDS,
  isPublishable,
  resolveSingleGeographyAuthority,
  type PlaceAuthorityClaim,
} from '../shared/placeAuthority';

/**
 * Exactly one authority. The procedure accepts the union of every geographic
 * input shape a caller might hold and then *rejects* any combination, so a
 * caller cannot smuggle a Place plus legacy text, a Place plus a legacy handle,
 * or a Search Area plus legacy geography into the executor.
 */
const geographyAuthorityInput = z
  .object({
    placeId: z.string().nullish(),
    searchAreaId: z.string().nullish(),
    legacyLocationId: z.union([z.string(), z.number()]).nullish(),
    legacyProvince: z.string().nullish(),
    legacyCity: z.string().nullish(),
    legacySuburb: z.string().nullish(),
  })
  .strict();

const authorityFailure = (reason: string) => ({
  ok: false as const,
  reason,
  message: `Rejected mixed or malformed geography authority: ${reason}`,
});

export const placeAuthorityRouter = router({
  /**
   * Discover canonical Places by name. Returns a first-class ambiguity outcome
   * rather than collapsing distinct Places that share a name, and records a
   * governed coverage signal for no_result and ambiguous queries.
   */
  discover: publicProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const response = await discoverPlaces(input.query);
      return {
        outcome: response.outcome,
        query: response.query,
        coverageSignalRecorded: response.coverageSignal !== null,
        results: response.results.map(candidate => ({
          kind: PLACE_DISCOVERY_KINDS[0],
          placeId: candidate.placeId,
          preferredPublicLabel: candidate.preferredPublicLabel,
          matchedName: candidate.matchedName,
          matchedNameRole: candidate.matchedNameRole,
          isAliasMatch: candidate.matchedNameRole !== 'preferred_public',
          matchReason: candidate.matchReason,
          placeType: candidate.placeType,
          classification: candidate.placeClassification,
          verificationStatus: candidate.verificationStatus,
          searchEligible: candidate.searchEligible,
          // Publication/SEO eligibility is a separate, stricter gate, surfaced
          // explicitly so a consumer cannot confuse it with searchability.
          publicationEligible: isPublishable({
            publicationEligible: candidate.publicationEligible,
            verificationStatus: candidate.verificationStatus,
            lifecycleStatus: candidate.lifecycleStatus,
          }),
          searchScope: candidate.searchScope,
          searchableNames: candidate.searchableNames,
          context: candidate.context,
        })),
      };
    }),

  /**
   * Resolve one canonical Place to its exact executable search scope.
   *
   * Fail-closed: a Place that is retired, non-searchable, scope-less, or has an
   * unresolved parent returns a refusal. There is no fallback to a name, a
   * legacy handle, or display text.
   */
  execute: publicProcedure
    .input(geographyAuthorityInput)
    .query(async ({ input }) => {
      const claim = input as PlaceAuthorityClaim;
      const resolution = resolveSingleGeographyAuthority(claim);
      if (!resolution.ok) return authorityFailure(resolution.reason);
      if (resolution.authority.kind !== 'place') {
        // Search Area and legacy shapes are not Place authority. They are
        // reported as such rather than executed against the Place dataset.
        return {
          ok: false as const,
          reason: 'not_place_authority',
          message:
            'This endpoint executes canonical Place authority only. ' +
            'A Search Area or legacy geography shape is a different authority and must be executed by its own path.',
        };
      }
      const execution = await executePlace(resolution.authority.placeId);
      if (!execution.ok) {
        return {
          ok: false as const,
          reason: execution.reason,
          message: `Place scope could not be executed: ${execution.reason}`,
        };
      }
      return { ok: true as const, execution: execution.execution };
    }),

  /**
   * Search Areas related to a Place, returned in their own typed shape. A Search
   * Area membership never establishes factual Place containment, and a Search
   * Area id is never a Place id.
   */
  relatedSearchAreas: publicProcedure
    .input(z.object({ placeId: z.string() }))
    .query(async ({ input }) => {
      const areas = await discoverSearchAreasForPlace(input.placeId);
      return { results: areas };
    }),

  /**
   * Persist a saved search against one canonical Place identity.
   *
   * The saved search is the existing governed home of a versioned geographic
   * query intent, so it can hold one canonical reference without becoming a
   * geography authority itself. When `placeId` is present it is the sole
   * geographic authority for the saved search; competing legacy geography text
   * is rejected rather than merged or preferred.
   */
  createSavedSearch: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        query: z.string().min(1).max(200),
        placeId: z.string().nullish(),
        legacyLocationId: z.union([z.string(), z.number()]).nullish(),
        legacyProvince: z.string().nullish(),
        legacyCity: z.string().nullish(),
        legacySuburb: z.string().nullish(),
        notificationFrequency: z
          .enum(['instant', 'daily', 'weekly', 'never'])
          .default('daily'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const resolution = resolveSingleGeographyAuthority({
        placeId: input.placeId,
        legacyLocationId: input.legacyLocationId,
        legacyProvince: input.legacyProvince,
        legacyCity: input.legacyCity,
        legacySuburb: input.legacySuburb,
      });
      if (!resolution.ok) {
        return authorityFailure(resolution.reason);
      }
      if (resolution.authority.kind !== 'place') {
        return {
          ok: false as const,
          reason: 'not_place_authority',
          message:
            'Slice 3 persists a canonical Place reference only. ' +
            'A saved search without a Place identity keeps its existing shape and is out of scope here.',
        };
      }
      // Execution must succeed before the reference is persisted, so a saved
      // search can never point at a Place that cannot be executed.
      const execution = await executePlace(resolution.authority.placeId);
      if (!execution.ok) {
        return {
          ok: false as const,
          reason: execution.reason,
          message: `Saved search rejected: Place scope could not be executed (${execution.reason}).`,
        };
      }
      const userId = ctx.user?.id;
      if (!userId) {
        return {
          ok: false as const,
          reason: 'unauthenticated',
          message: 'A saved search requires an authenticated user.',
        };
      }
      const db = await getDb();
      const [row] = await db
        .insert(savedSearches)
        .values({
          userId,
          name: input.name,
          // The raw query is retained as the user's own wording. It is not an
          // authority and is never resolved to geography at execution time.
          criteria: { query: input.query },
          placeId: resolution.authority.placeId,
          notificationFrequency: input.notificationFrequency,
        })
        .$returningId();
      return {
        ok: true as const,
        savedSearchId: row.id,
        placeId: row.placeId,
        execution: execution.execution,
      };
    }),
});
