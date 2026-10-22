import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { CONTACT_VISIBILITY_VALUES, contacts } from '../drizzle/schema';
import { agentProcedure, router } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import { getDb } from './db';
import {
  canEditContact,
  contactReadPredicate,
  contactWritePredicate,
  getContactActorScope,
  requireReadableContact,
  requireWritableContact,
  type ContactActorScope,
} from './services/contactAccessService';
import { nowAsDbTimestamp } from './utils/dbTypeUtils';

const contactVisibilitySchema = z.enum(CONTACT_VISIBILITY_VALUES);

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform(value => (value === undefined ? undefined : value || null));

const optionalEmail = z
  .union([z.string().trim().email().max(320), z.literal('')])
  .optional()
  .nullable()
  .transform(value => (value === undefined ? undefined : value ? value.toLowerCase() : null));

const createContactSchema = z.object({
  fullName: z.string().trim().min(1, 'A contact name is required.').max(200),
  email: optionalEmail,
  phone: optionalText(50),
  company: optionalText(200),
  notes: optionalText(2000),
  visibility: contactVisibilitySchema.default('private'),
});

const updateContactSchema = z
  .object({
    contactId: z.number().int().positive(),
    fullName: z.string().trim().min(1, 'A contact name is required.').max(200).optional(),
    email: optionalEmail,
    phone: optionalText(50),
    company: optionalText(200),
    notes: optionalText(2000),
    visibility: contactVisibilitySchema.optional(),
  })
  .refine(
    input =>
      Object.entries(input).some(([key, value]) => key !== 'contactId' && value !== undefined),
    { message: 'Provide at least one contact field to update.' },
  );

async function requireDatabase() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available.' });
  }
  return db;
}

function toContactDto(contact: any, scope: ContactActorScope) {
  return {
    id: Number(contact.id),
    fullName: String(contact.fullName),
    email: contact.email || null,
    phone: contact.phone || null,
    company: contact.company || null,
    notes: contact.notes || null,
    visibility: contact.visibility,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    canEdit: canEditContact(scope, contact),
  };
}

function toScopeDto(scope: ContactActorScope) {
  return {
    canShareWithAgency: Boolean(scope.agencyId),
    isManager: scope.isManager,
  };
}

function rejectInvalidVisibility(
  scope: ContactActorScope,
  visibility: string,
  agencyId: number | null,
) {
  if (visibility === 'agency_shared' && (!scope.agencyId || agencyId === null)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Agency sharing is available only for contacts in your current agency scope.',
    });
  }
}

/**
 * The sole server-side Contacts authority. Identity and ownership scope are
 * derived from the authenticated actor; no client-supplied owner, agent, or
 * agency identifier is admitted by these procedures.
 */
export const contactsRouter = router({
  list: agentProcedure
    .input(
      z.object({
        query: z.string().trim().max(120).optional(),
        visibility: contactVisibilitySchema.optional(),
        limit: z.number().int().min(1).max(100).default(60),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const scope = await getContactActorScope(db, requireUser(ctx));
      const conditions: any[] = [contactReadPredicate(scope)];

      if (input.visibility) conditions.push(eq(contacts.visibility, input.visibility));
      if (input.query) {
        const query = `%${input.query}%`;
        conditions.push(
          or(
            like(contacts.fullName, query),
            like(contacts.email, query),
            like(contacts.phone, query),
            like(contacts.company, query),
          ),
        );
      }

      const rows = await db
        .select()
        .from(contacts)
        .where(and(...conditions))
        .orderBy(desc(contacts.updatedAt), asc(contacts.fullName))
        .limit(input.limit);

      return {
        contacts: rows.map(contact => toContactDto(contact, scope)),
        scope: toScopeDto(scope),
      };
    }),

  getById: agentProcedure
    .input(z.object({ contactId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const scope = await getContactActorScope(db, requireUser(ctx));
      const contact = await requireReadableContact(db, scope, input.contactId);
      return toContactDto(contact, scope);
    }),

  create: agentProcedure.input(createContactSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDatabase();
    const user = requireUser(ctx);
    const scope = await getContactActorScope(db, user);
    rejectInvalidVisibility(scope, input.visibility, scope.agencyId);

    const [result] = await db.insert(contacts).values({
      ownerUserId: user.id,
      agencyId: scope.agencyId,
      fullName: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      company: input.company || null,
      notes: input.notes || null,
      visibility: input.visibility,
    });

    return { contactId: Number(result.insertId || 0) };
  }),

  update: agentProcedure.input(updateContactSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDatabase();
    const scope = await getContactActorScope(db, requireUser(ctx));
    const contact = await requireWritableContact(db, scope, input.contactId);
    const { contactId, ...changes } = input;
    if (changes.visibility) {
      rejectInvalidVisibility(scope, changes.visibility, contact.agencyId ?? null);
    }

    const updateValues = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as Record<string, unknown>;

    await db
      .update(contacts)
      .set({ ...updateValues, updatedAt: nowAsDbTimestamp() })
      .where(and(eq(contacts.id, contactId), contactWritePredicate(scope)));

    return { success: true };
  }),
});
