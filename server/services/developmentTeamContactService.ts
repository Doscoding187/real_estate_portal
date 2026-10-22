import { and, asc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db-connection';
import { developerIdentityService } from './developerIdentityService';
import {
  developmentPhases,
  developmentTeamContacts,
  developments,
  managerialAuditLogs,
} from '../../drizzle/schema';

const READ_ROLES = new Set([
  'owner',
  'admin',
  'sales_manager',
  'sales_consultant',
  'marketing',
  'finance',
  'viewer',
]);
const MANAGE_ROLES = new Set(['owner', 'admin', 'sales_manager']);

function fail(
  code: 'BAD_REQUEST' | 'FORBIDDEN' | 'NOT_FOUND' | 'PRECONDITION_FAILED',
  message: string,
): never {
  throw new TRPCError({ code, message });
}

function requiredText(value: unknown, label: string, max: number, min = 1): string {
  const result = typeof value === 'string' ? value.trim() : '';
  if (result.length < min || result.length > max) {
    fail('BAD_REQUEST', `${label} must be between ${min} and ${max} characters.`);
  }
  return result;
}

async function actorScope(userId: number, manage = false) {
  const profile = await developerIdentityService.getDeveloperByUserId(userId);
  if (!profile) fail('FORBIDDEN', 'Developer profile not found.');
  const role = String(profile.membership?.role || '');
  const allowed = manage ? MANAGE_ROLES : READ_ROLES;
  if (!allowed.has(role)) {
    fail('FORBIDDEN', manage
      ? 'Only a developer owner, admin, or sales manager can edit development contacts.'
      : 'You do not have access to this development team directory.');
  }
  return { publisherId: Number(profile.publisherId), role };
}

export async function getDevelopmentTeamContacts(developmentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await actorScope(userId);
  const [development] = await db
    .select({ id: developments.id })
    .from(developments)
    .where(
      and(
        eq(developments.id, developmentId),
        eq(developments.cataloguePublisherId, actor.publisherId),
      ),
    )
    .limit(1);
  if (!development) fail('NOT_FOUND', 'Development not found.');

  const [phases, contacts] = await Promise.all([
    db
      .select({ id: developmentPhases.id, phaseNumber: developmentPhases.phaseNumber, name: developmentPhases.name, status: developmentPhases.status })
      .from(developmentPhases)
      .where(eq(developmentPhases.developmentId, developmentId))
      .orderBy(asc(developmentPhases.phaseNumber), asc(developmentPhases.id)),
    db
      .select()
      .from(developmentTeamContacts)
      .where(eq(developmentTeamContacts.developmentId, developmentId))
      .orderBy(asc(developmentTeamContacts.displayOrder), asc(developmentTeamContacts.roleTitle), asc(developmentTeamContacts.displayName)),
  ]);

  return {
    canManage: MANAGE_ROLES.has(actor.role),
    phases,
    contacts: contacts.map(contact => ({
      ...contact,
      visibleToPartners: Number(contact.visibleToPartners) === 1,
      isActive: Number(contact.isActive) === 1,
    })),
  };
}

export async function saveDevelopmentTeamContact(input: {
  developmentId: number;
  contactId?: number | null;
  phaseId?: number | null;
  roleTitle: string;
  displayName: string;
  organizationName?: string | null;
  email?: string | null;
  phone?: string | null;
  responsibility?: string | null;
  visibleToPartners: boolean;
  isActive: boolean;
  reason: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const actor = await actorScope(input.userId, true);
  const roleTitle = requiredText(input.roleTitle, 'Role', 100, 2);
  const displayName = requiredText(input.displayName, 'Name', 255, 2);
  const organizationName = input.organizationName?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;
  const responsibility = input.responsibility?.trim() || null;
  const reason = requiredText(input.reason, 'Reason', 500, 10);

  if (organizationName && organizationName.length > 255) fail('BAD_REQUEST', 'Organization name is too long.');
  if (email && (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    fail('BAD_REQUEST', 'Enter a valid email address.');
  }
  if (phone && phone.length > 50) fail('BAD_REQUEST', 'Phone number is too long.');
  if (responsibility && responsibility.length > 1000) fail('BAD_REQUEST', 'Responsibility details must be 1,000 characters or fewer.');
  if (!email && !phone) fail('BAD_REQUEST', 'Add an email address or phone number so the team can reach this contact.');
  if (input.phaseId != null && (!Number.isSafeInteger(input.phaseId) || input.phaseId <= 0)) {
    fail('BAD_REQUEST', 'Choose a valid phase or the whole development.');
  }

  return db.transaction(async (tx: any) => {
    const [development] = await tx
      .select({ id: developments.id })
      .from(developments)
      .where(
        and(
          eq(developments.id, input.developmentId),
          eq(developments.cataloguePublisherId, actor.publisherId),
        ),
      )
      .limit(1)
      .for('update');
    if (!development) fail('NOT_FOUND', 'Development not found.');

    const phaseId = input.phaseId ?? null;
    if (phaseId !== null) {
      const [phase] = await tx
        .select({ id: developmentPhases.id })
        .from(developmentPhases)
        .where(
          and(
            eq(developmentPhases.id, phaseId),
            eq(developmentPhases.developmentId, input.developmentId),
          ),
        )
        .limit(1)
        .for('update');
      if (!phase) fail('BAD_REQUEST', 'The selected phase does not belong to this development.');
    }

    const values = {
      developmentId: input.developmentId,
      phaseId,
      roleTitle,
      displayName,
      organizationName,
      email,
      phone,
      responsibility,
      visibleToPartners: input.visibleToPartners ? 1 : 0,
      isActive: input.isActive ? 1 : 0,
    };

    let contactId = Number(input.contactId || 0);
    let before: Record<string, unknown> | null = null;
    if (contactId > 0) {
      const [existing] = await tx
        .select()
        .from(developmentTeamContacts)
        .where(
          and(
            eq(developmentTeamContacts.id, contactId),
            eq(developmentTeamContacts.developmentId, input.developmentId),
          ),
        )
        .limit(1)
        .for('update');
      if (!existing) fail('NOT_FOUND', 'Development contact not found.');
      before = {
        phaseId: existing.phaseId,
        roleTitle: existing.roleTitle,
        displayName: existing.displayName,
        organizationName: existing.organizationName,
        email: existing.email,
        phone: existing.phone,
        responsibility: existing.responsibility,
        visibleToPartners: Number(existing.visibleToPartners) === 1,
        isActive: Number(existing.isActive) === 1,
      };
      await tx
        .update(developmentTeamContacts)
        .set(values)
        .where(and(
          eq(developmentTeamContacts.id, contactId),
          eq(developmentTeamContacts.developmentId, input.developmentId),
        ));
    } else {
      const result = await tx.insert(developmentTeamContacts).values(values);
      const insertResult = Array.isArray(result) ? result[0] : result;
      contactId = Number((insertResult as any)?.insertId);
      if (!Number.isSafeInteger(contactId) || contactId <= 0) {
        throw new Error('Could not identify the saved development contact.');
      }
    }

    await tx.insert(managerialAuditLogs).values({
      actorUserId: input.userId,
      action: before ? 'developer.team_contact.updated' : 'developer.team_contact.created',
      targetType: 'development_team_contact',
      targetId: contactId,
      beforeData: before,
      afterData: values,
      metadata: {
        developmentId: input.developmentId,
        reason,
        actorRole: actor.role,
      },
    });

    return { contactId, ...values };
  });
}
