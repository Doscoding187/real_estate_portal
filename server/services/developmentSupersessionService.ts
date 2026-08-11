import { and, eq, inArray, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  developerBrandProfiles,
  developers,
  developmentSupersessions,
  developments,
  unitTypes,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import {
  publishDeveloperOwnedDevelopmentInTransaction,
  unpublishDevelopmentInTransaction,
} from './developmentService';
import {
  buildDevelopmentRootPath,
  normalizeDevelopmentRootPath,
} from './developmentRouteAuthority';
import { validatePersistedSubmissionReadiness } from './developmentSubmissionReadiness';
import { publicDevelopmentEligibilityConditions } from './publicDevelopmentEligibility';
import { DEVELOPMENT_SUPERSESSION_OPEN_STATUSES } from './developmentSupersessionPolicy';

const SUPER_ADMIN_ROLE = 'super_admin';
const DEVELOPER_ROLE = 'property_developer';

function nowAsMysqlDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function boundedNote(value: unknown, field: string): string {
  const note = String(value ?? '').trim();
  if (!note || note.length > 1000) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${field} must be non-empty and no longer than 1,000 characters.`,
    });
  }
  return note;
}

function conflict(message: string): never {
  throw new TRPCError({ code: 'CONFLICT', message });
}

async function requireSuperAdminActor(tx: any, actorUserId: number) {
  const [actor] = await tx
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, actorUserId), eq(users.role, SUPER_ADMIN_ROLE)))
    .limit(1)
    .for('update');

  if (!actor) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'A privileged platform actor is required for supersession operations.',
    });
  }
  return actor;
}

async function lockDevelopment(tx: any, developmentId: number) {
  const [development] = await tx
    .select()
    .from(developments)
    .where(eq(developments.id, developmentId))
    .limit(1)
    .for('update');

  if (!development) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found.' });
  }
  return development;
}

async function lockEndpointPair(
  tx: any,
  sourceDevelopmentId: number,
  replacementDevelopmentId: number,
) {
  const ids = [sourceDevelopmentId, replacementDevelopmentId].sort((left, right) => left - right);
  const rows = new Map<number, any>();
  for (const id of ids) rows.set(id, await lockDevelopment(tx, id));
  return {
    source: rows.get(sourceDevelopmentId)!,
    replacement: rows.get(replacementDevelopmentId)!,
  };
}

async function lockAllRelationshipsForEndpoints(
  tx: any,
  sourceDevelopmentId: number,
  replacementDevelopmentId: number,
) {
  return tx
    .select()
    .from(developmentSupersessions)
    .where(
      or(
        eq(developmentSupersessions.sourceDevelopmentId, sourceDevelopmentId),
        eq(developmentSupersessions.replacementDevelopmentId, sourceDevelopmentId),
        eq(developmentSupersessions.sourceDevelopmentId, replacementDevelopmentId),
        eq(developmentSupersessions.replacementDevelopmentId, replacementDevelopmentId),
      ),
    )
    .for('update');
}

async function assertPlatformCuratedSource(tx: any, development: any) {
  if (development.devOwnerType !== 'platform' || development.developerId !== null) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Source development must remain platform-curated with no developer owner.',
    });
  }

  if (!development.developerBrandProfileId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Platform-curated source must have a platform brand profile.',
    });
  }

  const [brand] = await tx
    .select({
      id: developerBrandProfiles.id,
      ownerType: developerBrandProfiles.ownerType,
      linkedDeveloperAccountId: developerBrandProfiles.linkedDeveloperAccountId,
      isVisible: developerBrandProfiles.isVisible,
      sourceAttribution: developerBrandProfiles.sourceAttribution,
    })
    .from(developerBrandProfiles)
    .where(eq(developerBrandProfiles.id, development.developerBrandProfileId))
    .limit(1)
    .for('update');

  if (
    !brand ||
    brand.ownerType !== 'platform' ||
    brand.linkedDeveloperAccountId !== null ||
    Number(brand.isVisible) !== 1 ||
    !String(brand.sourceAttribution ?? '').trim()
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Source development is not in valid platform-curated custody.',
    });
  }
}

async function assertDeveloperOwnedReplacement(tx: any, development: any) {
  if (development.devOwnerType !== 'developer' || development.developerId === null) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Replacement development must be developer-owned.',
    });
  }

  const [developer] = await tx
    .select({ id: developers.id, userId: developers.userId, status: developers.status })
    .from(developers)
    .where(eq(developers.id, development.developerId))
    .limit(1)
    .for('update');
  if (!developer || developer.status !== 'approved') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Replacement developer account is not approved.',
    });
  }

  const [account] = await tx
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, developer.userId))
    .limit(1)
    .for('update');
  if (!account || account.role !== DEVELOPER_ROLE) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Replacement developer account authority is invalid.',
    });
  }

  if (development.developerBrandProfileId !== null) {
    const [brand] = await tx
      .select({
        id: developerBrandProfiles.id,
        ownerType: developerBrandProfiles.ownerType,
        linkedDeveloperAccountId: developerBrandProfiles.linkedDeveloperAccountId,
        isVisible: developerBrandProfiles.isVisible,
      })
      .from(developerBrandProfiles)
      .where(eq(developerBrandProfiles.id, development.developerBrandProfileId))
      .limit(1)
      .for('update');

    if (
      !brand ||
      brand.ownerType !== 'developer' ||
      Number(brand.linkedDeveloperAccountId) !== Number(development.developerId) ||
      Number(brand.isVisible) !== 1
    ) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Replacement developer brand custody is invalid.',
      });
    }
  }
}

async function assertUniqueRouteIdentity(tx: any, development: any, label: string) {
  const slug = String(development.slug ?? '').trim();
  const routePath = buildDevelopmentRootPath(development);
  if (!normalizeDevelopmentRootPath(routePath)) {
    conflict(`${label} canonical root route is not a valid development root path.`);
  }
  if (!slug) return routePath;

  // The existing public resolver treats an all-numeric route segment as a
  // development ID, never as a slug. A numeric slug is therefore safe only
  // when it is the row's own ID; otherwise the route would resolve elsewhere.
  if (/^\d+$/.test(slug) && Number(slug) !== Number(development.id)) {
    conflict(`${label} canonical root route resolves to another development ID.`);
  }

  const rows = await tx
    .select({ id: developments.id })
    .from(developments)
    .where(eq(developments.slug, slug))
    .for('update');
  if (rows.length !== 1 || Number(rows[0].id) !== Number(development.id)) {
    conflict(`${label} canonical root route is ambiguous for slug '${slug}'.`);
  }
  return routePath;
}

async function assertHistoricalPathAvailable(tx: any, sourcePath: string, relationshipId: number) {
  const rows = await tx
    .select({ id: developmentSupersessions.id })
    .from(developmentSupersessions)
    .where(eq(developmentSupersessions.sourcePublicRootPath, sourcePath))
    .for('update');
  if (rows.some(row => Number(row.id) !== relationshipId)) {
    conflict('Historical source route is already reserved by another supersession.');
  }
}

async function assertCanonicalPublic(tx: any, developmentId: number, label: string) {
  const [row] = await tx
    .select({ id: developments.id })
    .from(developments)
    .leftJoin(developers, eq(developments.developerId, developers.id))
    .leftJoin(
      developerBrandProfiles,
      eq(developments.developerBrandProfileId, developerBrandProfiles.id),
    )
    .where(and(eq(developments.id, developmentId), publicDevelopmentEligibilityConditions()))
    .limit(1);
  if (!row) conflict(`${label} is not currently canonical-public.`);
}

async function assertFinalCutoverPublicState(tx: any, sourceId: number, replacementId: number) {
  const [source] = await tx
    .select({ id: developments.id })
    .from(developments)
    .leftJoin(developers, eq(developments.developerId, developers.id))
    .leftJoin(
      developerBrandProfiles,
      eq(developments.developerBrandProfileId, developerBrandProfiles.id),
    )
    .where(and(eq(developments.id, sourceId), publicDevelopmentEligibilityConditions()))
    .limit(1);
  if (source) conflict('Source development remained canonical-public after cutover.');

  const [replacement] = await tx
    .select({ id: developments.id })
    .from(developments)
    .leftJoin(developers, eq(developments.developerId, developers.id))
    .leftJoin(
      developerBrandProfiles,
      eq(developments.developerBrandProfileId, developerBrandProfiles.id),
    )
    .where(and(eq(developments.id, replacementId), publicDevelopmentEligibilityConditions()))
    .limit(1);
  if (!replacement) conflict('Replacement development did not become canonical-public.');
}

async function insertVerifiedRelationship(
  tx: any,
  input: {
    sourceDevelopmentId: number;
    replacementDevelopmentId: number;
    actorUserId: number;
    verificationNote: string;
  },
) {
  const now = nowAsMysqlDateTime();
  const [result] = await tx.insert(developmentSupersessions).values({
    sourceDevelopmentId: input.sourceDevelopmentId,
    replacementDevelopmentId: input.replacementDevelopmentId,
    status: 'verified',
    verificationNote: input.verificationNote,
    verifiedByActorId: input.actorUserId,
    verifiedAt: now,
    activatedByActorId: null,
    activatedAt: null,
    sourcePublicRootPath: null,
    reversedByActorId: null,
    reversedAt: null,
    reversalReason: null,
    createdAt: now,
    updatedAt: now,
  });

  const [relationship] = await tx
    .select()
    .from(developmentSupersessions)
    .where(eq(developmentSupersessions.id, Number(result.insertId)))
    .limit(1);
  return relationship;
}

export async function verifyDevelopmentSupersession(input: {
  sourceDevelopmentId: number;
  replacementDevelopmentId: number;
  actorUserId: number;
  verificationNote: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.transaction(async (tx: any) => {
    await requireSuperAdminActor(tx, input.actorUserId);
    if (input.sourceDevelopmentId === input.replacementDevelopmentId) {
      conflict('A development cannot supersede itself.');
    }
    const { source, replacement } = await lockEndpointPair(
      tx,
      input.sourceDevelopmentId,
      input.replacementDevelopmentId,
    );
    const relationships = await lockAllRelationshipsForEndpoints(
      tx,
      input.sourceDevelopmentId,
      input.replacementDevelopmentId,
    );

    await assertPlatformCuratedSource(tx, source);
    await assertDeveloperOwnedReplacement(tx, replacement);

    const samePair = relationships.find(
      row =>
        Number(row.sourceDevelopmentId) === input.sourceDevelopmentId &&
        Number(row.replacementDevelopmentId) === input.replacementDevelopmentId,
    );
    if (samePair?.status === 'verified' || samePair?.status === 'active') return samePair;
    if (samePair?.status === 'reversed') {
      conflict('A reversed supersession pair is terminal in the S2 MVP.');
    }

    const competing = relationships.find(row => {
      if (samePair && Number(row.id) === Number(samePair.id)) return false;
      return DEVELOPMENT_SUPERSESSION_OPEN_STATUSES.includes(row.status);
    });
    if (competing) conflict('One of these developments already has an open supersession.');

    const verificationNote = boundedNote(input.verificationNote, 'verificationNote');
    if (Number(replacement.isPublished) === 1) {
      conflict('Replacement development must be private at verification time.');
    }

    return insertVerifiedRelationship(tx, {
      sourceDevelopmentId: input.sourceDevelopmentId,
      replacementDevelopmentId: input.replacementDevelopmentId,
      actorUserId: input.actorUserId,
      verificationNote,
    });
  });
}

export async function activateDevelopmentSupersession(input: {
  supersessionId: number;
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx: any) => {
    await requireSuperAdminActor(tx, input.actorUserId);

    const [identity] = await tx
      .select({
        id: developmentSupersessions.id,
        sourceDevelopmentId: developmentSupersessions.sourceDevelopmentId,
        replacementDevelopmentId: developmentSupersessions.replacementDevelopmentId,
      })
      .from(developmentSupersessions)
      .where(eq(developmentSupersessions.id, input.supersessionId))
      .limit(1);
    if (!identity) throw new TRPCError({ code: 'NOT_FOUND', message: 'Supersession not found.' });

    const { source, replacement } = await lockEndpointPair(
      tx,
      identity.sourceDevelopmentId,
      identity.replacementDevelopmentId,
    );
    const relationships = await lockAllRelationshipsForEndpoints(
      tx,
      identity.sourceDevelopmentId,
      identity.replacementDevelopmentId,
    );
    const [relationship] = await tx
      .select()
      .from(developmentSupersessions)
      .where(eq(developmentSupersessions.id, input.supersessionId))
      .limit(1)
      .for('update');
    if (!relationship)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Supersession not found.' });

    if (relationship.status === 'active') return relationship;
    if (relationship.status === 'reversed') {
      conflict('A reversed supersession cannot be reactivated in the S2 MVP.');
    }
    if (relationship.status !== 'verified') {
      conflict('Supersession is not ready for activation.');
    }

    const competing = relationships.find(
      row =>
        Number(row.id) !== Number(relationship.id) &&
        DEVELOPMENT_SUPERSESSION_OPEN_STATUSES.includes(row.status),
    );
    if (competing) conflict('One of these developments already has another open supersession.');

    await assertPlatformCuratedSource(tx, source);
    await assertDeveloperOwnedReplacement(tx, replacement);
    if (Number(replacement.isPublished) === 1) {
      conflict('Replacement development must be private at activation time.');
    }

    const replacementUnits = await tx
      .select()
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, replacement.id));
    const blockers = validatePersistedSubmissionReadiness(replacement, replacementUnits);
    if (blockers.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Replacement development is not ready for canonical publication.',
        cause: blockers,
      });
    }

    await assertCanonicalPublic(tx, source.id, 'Source development');
    const sourcePath = await assertUniqueRouteIdentity(tx, source, 'Source development');
    const replacementPath = await assertUniqueRouteIdentity(
      tx,
      replacement,
      'Replacement development',
    );
    if (sourcePath === replacementPath) conflict('Source and replacement routes must differ.');
    await assertHistoricalPathAvailable(tx, sourcePath, Number(relationship.id));
    await assertHistoricalPathAvailable(tx, replacementPath, Number(relationship.id));

    await unpublishDevelopmentInTransaction(tx, source.id);
    await publishDeveloperOwnedDevelopmentInTransaction(
      tx,
      replacement.id,
      input.actorUserId,
      Number(relationship.id),
    );

    const now = nowAsMysqlDateTime();
    const updateResult = await tx
      .update(developmentSupersessions)
      .set({
        status: 'active',
        activatedByActorId: input.actorUserId,
        activatedAt: now,
        sourcePublicRootPath: normalizeDevelopmentRootPath(sourcePath),
        updatedAt: now,
      })
      .where(
        and(
          eq(developmentSupersessions.id, relationship.id),
          eq(developmentSupersessions.status, 'verified'),
        ),
      );
    const affectedRows = Number(updateResult?.affectedRows ?? updateResult?.[0]?.affectedRows ?? 0);
    if (affectedRows !== 1) conflict('Supersession changed before activation completed.');

    await assertFinalCutoverPublicState(tx, source.id, replacement.id);

    const [activated] = await tx
      .select()
      .from(developmentSupersessions)
      .where(eq(developmentSupersessions.id, relationship.id))
      .limit(1);
    return activated;
  });
}

export async function reverseDevelopmentSupersession(input: {
  supersessionId: number;
  actorUserId: number;
  reversalReason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.transaction(async (tx: any) => {
    await requireSuperAdminActor(tx, input.actorUserId);
    const [identity] = await tx
      .select({
        id: developmentSupersessions.id,
        sourceDevelopmentId: developmentSupersessions.sourceDevelopmentId,
        replacementDevelopmentId: developmentSupersessions.replacementDevelopmentId,
      })
      .from(developmentSupersessions)
      .where(eq(developmentSupersessions.id, input.supersessionId))
      .limit(1);
    if (!identity) throw new TRPCError({ code: 'NOT_FOUND', message: 'Supersession not found.' });

    const { source } = await lockEndpointPair(
      tx,
      identity.sourceDevelopmentId,
      identity.replacementDevelopmentId,
    );
    await lockAllRelationshipsForEndpoints(
      tx,
      identity.sourceDevelopmentId,
      identity.replacementDevelopmentId,
    );
    const [relationship] = await tx
      .select()
      .from(developmentSupersessions)
      .where(eq(developmentSupersessions.id, input.supersessionId))
      .limit(1)
      .for('update');
    if (!relationship)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Supersession not found.' });
    if (relationship.status === 'reversed') return relationship;
    if (relationship.status !== 'verified' && relationship.status !== 'active') {
      conflict('Supersession cannot be reversed from its current state.');
    }

    const reversalReason = boundedNote(input.reversalReason, 'reversalReason');

    if (relationship.status === 'active' && Number(source.isPublished) === 1) {
      await unpublishDevelopmentInTransaction(tx, source.id);
    }

    const now = nowAsMysqlDateTime();
    const updateResult = await tx
      .update(developmentSupersessions)
      .set({
        status: 'reversed',
        reversedByActorId: input.actorUserId,
        reversedAt: now,
        reversalReason,
        updatedAt: now,
      })
      .where(
        and(
          eq(developmentSupersessions.id, relationship.id),
          inArray(developmentSupersessions.status, ['verified', 'active']),
        ),
      );
    const affectedRows = Number(updateResult?.affectedRows ?? updateResult?.[0]?.affectedRows ?? 0);
    if (affectedRows !== 1) conflict('Supersession changed before reversal completed.');

    const [reversed] = await tx
      .select()
      .from(developmentSupersessions)
      .where(eq(developmentSupersessions.id, relationship.id))
      .limit(1);
    return reversed;
  });
}

export async function resolveActiveDevelopmentSupersessionRedirect(pathname: string) {
  const sourcePath = normalizeDevelopmentRootPath(pathname);
  if (!sourcePath) return null;

  const db = await getDb();
  if (!db) return null;
  const [relationship] = await db
    .select({
      replacementDevelopmentId: developmentSupersessions.replacementDevelopmentId,
    })
    .from(developmentSupersessions)
    .where(
      and(
        eq(developmentSupersessions.sourcePublicRootPath, sourcePath),
        eq(developmentSupersessions.status, 'active'),
      ),
    )
    .limit(1);
  if (!relationship) return null;

  const [replacement] = await db
    .select({ id: developments.id, slug: developments.slug })
    .from(developments)
    .where(eq(developments.id, relationship.replacementDevelopmentId))
    .limit(1);
  if (!replacement) return null;

  let targetPath = buildDevelopmentRootPath({ id: replacement.id, slug: null });
  const slug = String(replacement.slug ?? '').trim();
  if (slug && !/^\d+$/.test(slug)) {
    const slugRows = await db
      .select({ id: developments.id })
      .from(developments)
      .where(eq(developments.slug, slug));
    if (slugRows.length === 1 && Number(slugRows[0].id) === Number(replacement.id)) {
      targetPath = buildDevelopmentRootPath(replacement);
    }
  } else if (slug && Number(slug) === Number(replacement.id)) {
    targetPath = buildDevelopmentRootPath(replacement);
  }
  if (targetPath === sourcePath) {
    targetPath = buildDevelopmentRootPath({ id: replacement.id, slug: null });
  }

  return {
    sourcePath,
    replacementDevelopmentId: Number(replacement.id),
    targetPath,
  };
}

export const developmentSupersessionService = {
  verifyDevelopmentSupersession,
  activateDevelopmentSupersession,
  reverseDevelopmentSupersession,
  resolveActiveDevelopmentSupersessionRedirect,
};
