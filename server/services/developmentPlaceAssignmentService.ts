import { and, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  developmentPlaceAssignments,
  developmentPhases,
  developments,
  place,
  placeName,
} from '../../drizzle/schema';
import { isPlaceId } from '../../drizzle/schema/placeAuthority';
import { getDb } from '../db';

export type DevelopmentPlaceGeography = {
  /**
   * An executable ID exists only when every accepted site assignment for this
   * Development names the same live, searchable Place. Multiple distinct Places
   * remain ambiguous until inventory is projected per site or phase.
   */
  canonicalPlaceId: string | null;
  /** Display-only labels from active preferred Place names. Never used to match. */
  locationLabels: string[];
};

const EMPTY_GEOGRAPHY: DevelopmentPlaceGeography = {
  canonicalPlaceId: null,
  locationLabels: [],
};

export function hasExactDevelopmentPlaceMatch(
  assignedPlaceId: string | null | undefined,
  requestedPlaceId: string,
): boolean {
  return (
    isPlaceId(assignedPlaceId) &&
    isPlaceId(requestedPlaceId) &&
    assignedPlaceId === requestedPlaceId
  );
}

export type ReviewDevelopmentPlaceAssignmentInput = {
  developmentId: number;
  phaseId: number | null;
  placeId: string;
  assignmentKind: 'site';
  evidenceReference: string;
  reviewNote?: string | null;
  reviewerUserId: number;
};

/** Records an administrator's evidenced Place assignment decision. */
export async function recordReviewedDevelopmentPlaceAssignment(
  input: ReviewDevelopmentPlaceAssignmentInput,
): Promise<void> {
  if (
    !Number.isSafeInteger(input.developmentId) ||
    input.developmentId <= 0 ||
    !Number.isSafeInteger(input.reviewerUserId) ||
    input.reviewerUserId <= 0 ||
    (input.phaseId !== null &&
      (!Number.isSafeInteger(input.phaseId) || input.phaseId <= 0)) ||
    !isPlaceId(input.placeId) ||
    !input.evidenceReference.trim()
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Reviewed Development Place assignment is invalid.',
    });
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.transaction(async tx => {
    const [development] = await tx
      .select({ id: developments.id })
      .from(developments)
      .where(eq(developments.id, input.developmentId))
      .limit(1);
    if (!development) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Development does not exist.' });
    }

    if (input.phaseId !== null) {
      const [phase] = await tx
        .select({ id: developmentPhases.id })
        .from(developmentPhases)
        .where(
          and(
            eq(developmentPhases.id, input.phaseId),
            eq(developmentPhases.developmentId, input.developmentId),
          ),
        )
        .limit(1);
      if (!phase) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Phase does not belong to this Development.',
        });
      }
    }

    const [assignedPlace] = await tx
      .select({
        placeId: place.placeId,
        searchScope: place.searchScope,
      })
      .from(place)
      .where(
        and(
          eq(place.placeId, input.placeId),
          eq(place.lifecycleStatus, 'active'),
          eq(place.searchEligible, 1),
        ),
      )
      .limit(1);
    if (!assignedPlace || assignedPlace.searchScope === null) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Choose an active, searchable canonical Place.',
      });
    }

    const reviewedAt = new Date().toISOString();
    await tx.insert(developmentPlaceAssignments).values({
      developmentId: input.developmentId,
      phaseId: input.phaseId,
      placeId: assignedPlace.placeId,
      assignmentKind: input.assignmentKind,
      reviewState: 'accepted',
      evidenceReference: input.evidenceReference.trim(),
      createdByUserId: input.reviewerUserId,
      reviewedByUserId: input.reviewerUserId,
      reviewedAt,
      reviewNote: input.reviewNote?.trim() || null,
    });
  });
}

export async function withdrawReviewedDevelopmentPlaceAssignment(input: {
  assignmentId: number;
  reviewerUserId: number;
  reviewNote: string;
}): Promise<{ developmentId: number }> {
  if (
    !Number.isSafeInteger(input.assignmentId) ||
    input.assignmentId <= 0 ||
    !Number.isSafeInteger(input.reviewerUserId) ||
    input.reviewerUserId <= 0 ||
    !input.reviewNote.trim()
  ) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A reviewed assignment and withdrawal reason are required.',
    });
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const reviewedAt = new Date().toISOString();

  return db.transaction(async tx => {
    const [assignment] = await tx
      .select({
        developmentId: developmentPlaceAssignments.developmentId,
        reviewState: developmentPlaceAssignments.reviewState,
        assignmentKind: developmentPlaceAssignments.assignmentKind,
      })
      .from(developmentPlaceAssignments)
      .where(eq(developmentPlaceAssignments.id, input.assignmentId))
      .limit(1);
    if (!assignment) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Place assignment does not exist.' });
    }
    if (assignment.reviewState !== 'accepted' || assignment.assignmentKind !== 'site') {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Only an accepted Place assignment can be withdrawn.',
      });
    }

    await tx
      .update(developmentPlaceAssignments)
      .set({
        reviewState: 'withdrawn',
        reviewedByUserId: input.reviewerUserId,
        reviewedAt,
        reviewNote: input.reviewNote.trim(),
      })
      .where(eq(developmentPlaceAssignments.id, input.assignmentId));

    return { developmentId: assignment.developmentId };
  });
}

/**
 * Reads the reviewed Development-to-Place assignments used by product
 * consumers. The query is exact: it traverses no Place relationships and does
 * not read Development text geography. Non-site associations and assignments
 * that are not accepted or no longer executable are excluded.
 */
export async function listDevelopmentPlaceGeography(
  developmentIds: number[],
): Promise<Map<number, DevelopmentPlaceGeography>> {
  const ids = [...new Set(developmentIds)];
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error('Development geography scope contains an invalid ID.');
  }

  const result = new Map<number, DevelopmentPlaceGeography>(
    ids.map(id => [id, EMPTY_GEOGRAPHY]),
  );
  if (ids.length === 0) return result;

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const rows = await db
    .select({
      developmentId: developmentPlaceAssignments.developmentId,
      placeId: developmentPlaceAssignments.placeId,
      evidenceReference: developmentPlaceAssignments.evidenceReference,
      reviewedByUserId: developmentPlaceAssignments.reviewedByUserId,
      reviewedAt: developmentPlaceAssignments.reviewedAt,
      matchedPlaceId: place.placeId,
      lifecycleStatus: place.lifecycleStatus,
      searchEligible: place.searchEligible,
      searchScope: place.searchScope,
      name: placeName.name,
    })
    .from(developmentPlaceAssignments)
    .leftJoin(place, eq(place.placeId, developmentPlaceAssignments.placeId))
    .leftJoin(
      placeName,
      and(
        eq(placeName.placeId, place.placeId),
        eq(placeName.nameRole, 'preferred_public'),
        eq(placeName.nameState, 'active'),
      ),
    )
    .where(
      and(
        inArray(developmentPlaceAssignments.developmentId, ids),
        eq(developmentPlaceAssignments.assignmentKind, 'site'),
        eq(developmentPlaceAssignments.reviewState, 'accepted'),
      ),
    );

  const placesByDevelopment = new Map<
    number,
    { places: Map<string, Set<string>>; hasInvalidAcceptedAssignment: boolean }
  >();
  for (const row of rows) {
    const aggregate = placesByDevelopment.get(row.developmentId) ?? {
      places: new Map<string, Set<string>>(),
      hasInvalidAcceptedAssignment: false,
    };
    if (
      !isPlaceId(row.placeId) ||
      row.reviewedByUserId === null ||
      row.reviewedAt === null ||
      !row.evidenceReference.trim() ||
      row.matchedPlaceId === null ||
      row.lifecycleStatus !== 'active' ||
      Number(row.searchEligible) !== 1 ||
      row.searchScope === null ||
      !row.name?.trim()
    ) {
      // An accepted but malformed or no longer executable association makes
      // the aggregate ambiguous. Do not turn its omission into a matchable ID.
      aggregate.hasInvalidAcceptedAssignment = true;
      placesByDevelopment.set(row.developmentId, aggregate);
      continue;
    }
    const labels = aggregate.places.get(row.placeId) ?? new Set<string>();
    if (row.name?.trim()) labels.add(row.name.trim());
    aggregate.places.set(row.placeId, labels);
    placesByDevelopment.set(row.developmentId, aggregate);
  }

  for (const [developmentId, aggregate] of placesByDevelopment) {
    const placeIds = [...aggregate.places.keys()].sort();
    const labels = [...new Set(
      [...aggregate.places.values()].flatMap(placeLabels => [...placeLabels]),
    )].sort((a, b) => a.localeCompare(b));
    result.set(developmentId, {
      canonicalPlaceId:
        !aggregate.hasInvalidAcceptedAssignment && placeIds.length === 1 ? placeIds[0] : null,
      locationLabels: labels,
    });
  }

  return result;
}

export async function getDevelopmentPlaceGeography(
  developmentId: number,
): Promise<DevelopmentPlaceGeography> {
  return (await listDevelopmentPlaceGeography([developmentId])).get(developmentId) ??
    EMPTY_GEOGRAPHY;
}

/** Resolves Development IDs assigned to exactly one canonical Place. */
export async function listDevelopmentIdsForCanonicalPlace(
  placeId: string,
  developmentIds?: number[],
): Promise<number[]> {
  if (!isPlaceId(placeId)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'A canonical Place ID is required.' });
  }
  const scopedIds = developmentIds ? [...new Set(developmentIds)] : null;
  if (scopedIds?.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Development scope is invalid.' });
  }
  if (scopedIds?.length === 0) return [];

  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const conditions = [
    eq(developmentPlaceAssignments.placeId, placeId),
    eq(developmentPlaceAssignments.assignmentKind, 'site'),
    eq(developmentPlaceAssignments.reviewState, 'accepted'),
  ];
  if (scopedIds) conditions.push(inArray(developmentPlaceAssignments.developmentId, scopedIds));

  const rows = await db
    .select({ developmentId: developmentPlaceAssignments.developmentId })
    .from(developmentPlaceAssignments)
    .where(and(...conditions));
  const candidateIds: number[] = Array.from(
    new Set<number>(rows.map(row => Number(row.developmentId))),
  );
  if (!candidateIds.length) return [];

  const geographyByDevelopment = await listDevelopmentPlaceGeography(candidateIds);
  return candidateIds
    .filter(id =>
      hasExactDevelopmentPlaceMatch(
        geographyByDevelopment.get(id)?.canonicalPlaceId,
        placeId,
      ),
    )
    .sort((left, right) => left - right);
}
