/** Read, select, execute, and publish routes from the admitted Place Authority. */

import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';
import {
  discoverPlaces,
  executePlace,
} from './services/placeDiscoveryService';
import {
  canonicalPlaceUrlByPath,
  canonicalPlaceUrlByPlaceId,
} from './services/canonicalPlaceUrlService';
import { loadCanonicalPlaceSearchProjection } from './services/canonicalPlaceSearchService';
import { isCanonicalPlaceId } from '../shared/placeAuthority';
import {
  PLACE_DISCOVERY_KINDS,
  isPublishable,
  resolveSingleGeographyAuthority,
  type PlaceAuthorityClaim,
} from '../shared/placeAuthority';

const geographyAuthorityInput = z
  .object({
    placeId: z.string().nullish(),
  })
  .strict();

const authorityFailure = (reason: string) => ({
  ok: false as const,
  reason,
  message: `Rejected mixed or malformed geography authority: ${reason}`,
});

async function resolveCanonicalSearchPlaces(placeIds: readonly string[]) {
  const validIds = [...new Set(placeIds.filter(isCanonicalPlaceId))];
  if (!validIds.length) return placeIds.map(() => null);
  const projection = await loadCanonicalPlaceSearchProjection(undefined, { placeIds: validIds });
  return placeIds.map(placeId => {
    if (!isCanonicalPlaceId(placeId)) return null;
    const execution = projection.executions.get(placeId);
    const label = projection.labels.get(placeId);
    if (!execution || !label) return null;
    const path = canonicalPlaceUrlByPlaceId(placeId)?.path ?? null;
    const administrativeContext =
      execution.scope === 'province'
        ? null
        : execution.scope === 'metro_city'
          ? label.province
          : [label.city, label.province].filter(Boolean).join(', ');
    return {
      placeId,
      label: label.label,
      placeType: label.placeType,
      searchScope: execution.scope,
      provinceName: label.province,
      administrativeContext,
      provincePlaceId: execution.provincePlaceId,
      cityPlaceId: execution.cityPlaceId,
      canonicalPath: path,
    };
  });
}

export const placeAuthorityRouter = router({
  /** Resolve one exact canonical path to its admitted Place identity. */
  resolveCanonicalUrl: publicProcedure
    .input(z.object({ path: z.string().min(1).max(500) }).strict())
    .query(async ({ input }) => {
      const entry = canonicalPlaceUrlByPath(input.path);
      if (!entry) return null;

      const resolved = await executePlace(entry.place_id);
      if (!resolved.ok || resolved.execution.scope !== entry.search_scope) return null;

      return {
        placeId: entry.place_id,
        path: entry.path,
        label: entry.preferred_public_name,
        placeType: entry.place_type,
        searchScope: entry.search_scope,
        provinceName: entry.province_name,
        provinceSlug: entry.province_slug,
        pathContext: entry.path_context,
        publicationEligible: entry.publication_eligible,
        verificationStatus: entry.verification_status,
      };
    }),

  /** Resolve a selected Place identity for canonical search controls. */
  resolveSearchPlace: publicProcedure
    .input(z.object({ placeId: z.string().min(1).max(40) }).strict())
    .query(async ({ input }) => {
      return (await resolveCanonicalSearchPlaces([input.placeId]))[0];
    }),

  /** Resolve a bounded set of selected Place IDs for editable search filters. */
  resolveSearchPlaces: publicProcedure
    .input(z.object({ placeIds: z.array(z.string().min(1).max(40)).max(10) }).strict())
    .query(async ({ input }) => ({ results: await resolveCanonicalSearchPlaces(input.placeIds) })),

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
          canonicalPath: canonicalPlaceUrlByPlaceId(candidate.placeId)?.path ?? null,
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

});
