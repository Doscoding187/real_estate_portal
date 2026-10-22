import { TRPCError } from '@trpc/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import { agents, contacts } from '../../drizzle/schema';

type ContactActor = {
  id: number;
  role?: string | null;
  agencyId?: number | null;
};

export type ContactActorScope = {
  userId: number;
  agencyId: number | null;
  agentId: number | null;
  isManager: boolean;
};

function personalContactPredicate(userId: number) {
  return and(eq(contacts.ownerUserId, userId), isNull(contacts.agencyId));
}

/**
 * Contacts generalizes the seller-prospect scope shape while preserving an
 * independent agent's user-owned workspace as a first-class context.
 */
export async function getContactActorScope(
  db: any,
  user: ContactActor,
): Promise<ContactActorScope> {
  const agencyId = Number(user.agencyId || 0) || null;
  const isManager = user.role === 'agency_admin' || user.role === 'super_admin';

  if (!agencyId) {
    if (isManager) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'An agency scope is required for manager Contacts.',
      });
    }
    return { userId: user.id, agencyId: null, agentId: null, isManager: false };
  }

  if (isManager) {
    return { userId: user.id, agencyId, agentId: null, isManager: true };
  }

  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(
      and(eq(agents.userId, user.id), eq(agents.agencyId, agencyId), eq(agents.status, 'approved')),
    )
    .limit(1);

  if (!agent) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'An approved agency agent profile is required to work agency contacts.',
    });
  }

  return { userId: user.id, agencyId, agentId: Number(agent.id), isManager: false };
}

/**
 * A manager has explicit visibility over agency-scoped contacts. Agency
 * agents see only their own agency-private records plus contacts deliberately
 * shared with their current agency. Every actor keeps access to their own
 * independent (agency-null) contacts.
 */
export function contactReadPredicate(scope: ContactActorScope) {
  const personal = personalContactPredicate(scope.userId);
  if (!scope.agencyId) return personal;

  if (scope.isManager) {
    return or(personal, eq(contacts.agencyId, scope.agencyId));
  }

  return or(
    personal,
    and(
      eq(contacts.agencyId, scope.agencyId),
      or(eq(contacts.ownerUserId, scope.userId), eq(contacts.visibility, 'agency_shared')),
    ),
  );
}

/**
 * Managers may maintain agency-scoped records. An agency agent may maintain
 * only records they own; merely being able to read a shared contact never
 * grants write access.
 */
export function contactWritePredicate(scope: ContactActorScope) {
  const personal = personalContactPredicate(scope.userId);
  if (!scope.agencyId) return personal;

  if (scope.isManager) {
    return or(personal, eq(contacts.agencyId, scope.agencyId));
  }

  return or(
    personal,
    and(eq(contacts.agencyId, scope.agencyId), eq(contacts.ownerUserId, scope.userId)),
  );
}

export async function requireReadableContact(db: any, scope: ContactActorScope, contactId: number) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), contactReadPredicate(scope)))
    .limit(1);

  if (!contact) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found.' });
  }

  return contact;
}

export async function requireWritableContact(db: any, scope: ContactActorScope, contactId: number) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), contactWritePredicate(scope)))
    .limit(1);

  if (!contact) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found.' });
  }

  return contact;
}

export function canEditContact(
  scope: ContactActorScope,
  contact: { ownerUserId: number; agencyId: number | null },
) {
  const ownerUserId = Number(contact.ownerUserId);
  const agencyId = contact.agencyId === null ? null : Number(contact.agencyId);

  if (agencyId === null) return ownerUserId === scope.userId;
  if (agencyId !== scope.agencyId) return false;
  return scope.isManager || ownerUserId === scope.userId;
}
