import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, isNotNull, isNull, like, lt, notInArray, or } from 'drizzle-orm';
import { z } from 'zod';
import {
  agents,
  sellerProspectActivities,
  sellerMandateComparables,
  sellerMandateOperations,
  sellerProspects,
  SELLER_PROSPECT_ACTIVITY_TYPE_VALUES,
  SELLER_PROSPECT_CONTACT_CHANNEL_VALUES,
  SELLER_PROSPECT_CONTACT_OUTCOME_VALUES,
  SELLER_PROSPECT_MANDATE_TYPE_VALUES,
  SELLER_MANDATE_DOCUMENT_STATUS_VALUES,
  SELLER_MANDATE_STATUS_VALUES,
  SELLER_PROSPECT_METHOD_VALUES,
  SELLER_PROSPECT_PRIORITY_VALUES,
  SELLER_PROSPECT_PROPERTY_TYPE_VALUES,
  SELLER_PROSPECT_STAGE_VALUES,
  SELLER_PROSPECT_TERMINAL_STAGE_VALUES,
  users,
} from '../drizzle/schema';
import { agentProcedure, router } from './_core/trpc';
import { logAudit } from './_core/auditLog';
import { requireUser } from './_core/requireUser';
import { getDb } from './db';
import {
  getSellerProspectActorScope,
  prepareSellerProspectListingConversion,
  getMandateReadiness,
  requireAgencyAssignableAgent,
  requireSellerProspect,
} from './services/sellerProspectAccessService';
import { nowAsDbTimestamp, toDbTimestampRequired } from './utils/dbTypeUtils';

const terminalStages = SELLER_PROSPECT_TERMINAL_STAGE_VALUES as unknown as [string, ...string[]];

const stageSchema = z.enum(SELLER_PROSPECT_STAGE_VALUES);
const contactChannelSchema = z.enum(SELLER_PROSPECT_CONTACT_CHANNEL_VALUES);
const contactOutcomeSchema = z.enum(SELLER_PROSPECT_CONTACT_OUTCOME_VALUES);
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
  .transform(value => (value === undefined ? undefined : value || null));

const mandateRequirementsSchema = z.object({
  sellerIdentityRecorded: z.boolean(), propertyAddressConfirmed: z.boolean(), contactDetailsConfirmed: z.boolean(),
  mandateTypeSelected: z.boolean(), pricingDiscussionCompleted: z.boolean(), agreedPriceRecorded: z.boolean(),
  mandateDocumentRecorded: z.boolean(), disclosureStatusRecorded: z.boolean(), mediaPlanRecorded: z.boolean(),
  accessArrangementsRecorded: z.boolean(), responsibleAgentConfirmed: z.boolean(), nextActionRecorded: z.boolean(),
});

function isAgencyPrivateMandateStorageReference(reference: string, agencyId: number) {
  const prefix = `private/agency-${agencyId}/mandates/`;
  return reference.startsWith(prefix)
    && !/^https?:\/\//i.test(reference)
    && !reference.includes('\\')
    && !reference.split('/').some(segment => segment === '.' || segment === '..');
}

const createSellerProspectSchema = z
  .object({
    ownerName: optionalText(200),
    email: optionalEmail,
    phone: optionalText(50),
    propertyAddress: optionalText(500),
    suburb: optionalText(120),
    city: optionalText(120),
    province: optionalText(120),
    propertyType: z.enum(SELLER_PROSPECT_PROPERTY_TYPE_VALUES).optional().nullable(),
    source: optionalText(100),
    canvassingMethod: z.enum(SELLER_PROSPECT_METHOD_VALUES).default('other'),
    priority: z.enum(SELLER_PROSPECT_PRIORITY_VALUES).default('normal'),
    assignedAgentId: z.number().int().positive().optional().nullable(),
    nextFollowUp: z.string().trim().min(1).optional(),
    nextAction: optionalText(255),
    initialNote: optionalText(2000),
  })
  .superRefine((input, context) => {
    if (!input.ownerName && !input.propertyAddress && !input.suburb && !input.city) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ownerName'],
        message: 'Record an owner/contact or a property address, suburb, or city for this seller prospect.',
      });
    }
  });

const updateSellerProspectSchema = z
  .object({
    sellerProspectId: z.number().int().positive(),
    ownerName: optionalText(200),
    email: optionalEmail,
    phone: optionalText(50),
    propertyAddress: optionalText(500),
    suburb: optionalText(120),
    city: optionalText(120),
    province: optionalText(120),
    propertyType: z.enum(SELLER_PROSPECT_PROPERTY_TYPE_VALUES).optional().nullable(),
    source: optionalText(100),
    canvassingMethod: z.enum(SELLER_PROSPECT_METHOD_VALUES).optional(),
    priority: z.enum(SELLER_PROSPECT_PRIORITY_VALUES).optional(),
  })
  .refine(
    input =>
      Object.entries(input).some(
        ([key, value]) => key !== 'sellerProspectId' && value !== undefined,
      ),
    { message: 'Provide at least one field to update.' },
  );

const stageTransitions: Record<string, readonly string[]> = {
  new: [
    'contact_attempted',
    'contacted',
    'follow_up_required',
    'appointment_scheduled',
    'qualified',
    'not_interested',
    'lost',
    'archived',
  ],
  contact_attempted: [
    'contacted',
    'follow_up_required',
    'appointment_scheduled',
    'qualified',
    'not_interested',
    'lost',
    'archived',
  ],
  contacted: [
    'follow_up_required',
    'appointment_scheduled',
    'qualified',
    'not_interested',
    'lost',
    'archived',
  ],
  follow_up_required: [
    'contact_attempted',
    'contacted',
    'appointment_scheduled',
    'qualified',
    'not_interested',
    'lost',
    'archived',
  ],
  appointment_scheduled: [
    'contacted',
    'follow_up_required',
    'qualified',
    'not_interested',
    'lost',
    'archived',
  ],
  qualified: [
    'follow_up_required',
    'appointment_scheduled',
    'mandate_won',
    'not_interested',
    'lost',
    'archived',
  ],
  mandate_won: ['follow_up_required', 'converted_to_listing', 'not_interested', 'lost', 'archived'],
  converted_to_listing: [],
  not_interested: [],
  lost: [],
  archived: [],
};

function isTerminalStage(stage: string | null | undefined) {
  return terminalStages.includes(String(stage || ''));
}

function parseFollowUp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Follow-up date is invalid.' });
  }
  return toDbTimestampRequired(parsed);
}

function parseOptionalTimestamp(value?: string | null) {
  return value ? parseFollowUp(value) : null;
}

function parseDatabaseTimestamp(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const parsed = new Date(withTimeZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAgent(agent: any) {
  if (!agent?.id) return null;
  const name =
    String(agent.displayName || '').trim() ||
    [agent.firstName, agent.lastName].filter(Boolean).join(' ').trim() ||
    'Assigned agent';
  return {
    id: Number(agent.id),
    userId: agent.userId ? Number(agent.userId) : null,
    name,
    email: agent.email || null,
    phone: agent.phone || null,
  };
}

function mapProspectRow(row: any) {
  return {
    ...row.prospect,
    assignedAgent: formatAgent(row.agent),
  };
}

function buildScopeConditions(
  scope: Awaited<ReturnType<typeof getSellerProspectActorScope>>,
  agentId?: number,
) {
  const conditions: any[] = [eq(sellerProspects.agencyId, scope.agencyId)];

  if (scope.isManager) {
    if (agentId !== undefined) {
      conditions.push(eq(sellerProspects.assignedAgentId, agentId));
    }
    return conditions;
  }

  if (agentId !== undefined && agentId !== scope.agentId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Agents can only view their own prospects.' });
  }

  conditions.push(eq(sellerProspects.assignedAgentId, scope.agentId!));
  return conditions;
}

async function requireDatabase() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available.' });
  }
  return db;
}

async function logCanvassingAudit(input: {
  ctx: any;
  userId: number;
  action: string;
  sellerProspectId: number;
  agencyId: number;
  metadata?: Record<string, unknown>;
}) {
  await logAudit({
    userId: input.userId,
    action: input.action,
    targetType: 'seller_prospect',
    targetId: input.sellerProspectId,
    metadata: { agencyId: input.agencyId, ...(input.metadata || {}) },
    req: input.ctx.req,
  });
}

export const canvassingRouter = router({
  list: agentProcedure
    .input(
      z.object({
        stage: z.union([stageSchema, z.literal('all')]).default('all'),
        agentId: z.number().int().positive().optional(),
        search: z.string().trim().max(160).optional(),
        city: z.string().trim().max(120).optional(),
        suburb: z.string().trim().max(120).optional(),
        followUpStatus: z.enum(['all', 'scheduled', 'overdue', 'none']).default('all'),
        limit: z.number().int().min(1).max(100).default(60),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const scope = await getSellerProspectActorScope(db, requireUser(ctx));
      const conditions = buildScopeConditions(scope, input.agentId);
      const now = nowAsDbTimestamp();

      if (input.stage !== 'all') conditions.push(eq(sellerProspects.stage, input.stage));
      if (input.city) conditions.push(like(sellerProspects.city, `%${input.city}%`));
      if (input.suburb) conditions.push(like(sellerProspects.suburb, `%${input.suburb}%`));
      if (input.search) {
        const search = `%${input.search}%`;
        conditions.push(
          or(
            like(sellerProspects.ownerName, search),
            like(sellerProspects.propertyAddress, search),
            like(sellerProspects.city, search),
            like(sellerProspects.suburb, search),
            like(sellerProspects.phone, search),
          )!,
        );
      }

      if (input.followUpStatus === 'scheduled') {
        conditions.push(
          isNotNull(sellerProspects.nextFollowUp),
          notInArray(sellerProspects.stage, terminalStages as any),
        );
      } else if (input.followUpStatus === 'overdue') {
        conditions.push(
          isNotNull(sellerProspects.nextFollowUp),
          lt(sellerProspects.nextFollowUp, now),
          notInArray(sellerProspects.stage, terminalStages as any),
        );
      } else if (input.followUpStatus === 'none') {
        conditions.push(isNull(sellerProspects.nextFollowUp));
      }

      const rows = await db
        .select({
          prospect: sellerProspects,
          agent: {
            id: agents.id,
            userId: agents.userId,
            displayName: agents.displayName,
            firstName: agents.firstName,
            lastName: agents.lastName,
            email: agents.email,
            phone: agents.phone,
          },
        })
        .from(sellerProspects)
        .leftJoin(agents, eq(sellerProspects.assignedAgentId, agents.id))
        .where(and(...conditions))
        .orderBy(asc(sellerProspects.nextFollowUp), desc(sellerProspects.updatedAt))
        .limit(input.limit);

      return rows.map(mapProspectRow);
    }),

  getById: agentProcedure
    .input(z.object({ sellerProspectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const scope = await getSellerProspectActorScope(db, requireUser(ctx));
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      const [row] = await db
        .select({
          prospect: sellerProspects,
          agent: {
            id: agents.id,
            userId: agents.userId,
            displayName: agents.displayName,
            firstName: agents.firstName,
            lastName: agents.lastName,
            email: agents.email,
            phone: agents.phone,
          },
        })
        .from(sellerProspects)
        .leftJoin(agents, eq(sellerProspects.assignedAgentId, agents.id))
        .where(and(eq(sellerProspects.id, prospect.id), eq(sellerProspects.agencyId, scope.agencyId)))
        .limit(1);

      const activities = await db
        .select({
          activity: sellerProspectActivities,
          actor: {
            id: users.id,
            name: users.name,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(sellerProspectActivities)
        .leftJoin(users, eq(sellerProspectActivities.actorUserId, users.id))
        .where(
          and(
            eq(sellerProspectActivities.sellerProspectId, prospect.id),
            eq(sellerProspectActivities.agencyId, scope.agencyId),
          ),
        )
        .orderBy(desc(sellerProspectActivities.createdAt));

      return {
        ...(row ? mapProspectRow(row) : prospect),
        activities: activities.map((entry: any) => ({
          ...entry.activity,
          actorName:
            String(entry.actor?.name || '').trim() ||
            [entry.actor?.firstName, entry.actor?.lastName].filter(Boolean).join(' ').trim() ||
            null,
        })),
      };
    }),

  getDashboard: agentProcedure.query(async ({ ctx }) => {
    const db = await requireDatabase();
    const scope = await getSellerProspectActorScope(db, requireUser(ctx));
    const prospects = await db
      .select()
      .from(sellerProspects)
      .where(and(...buildScopeConditions(scope)));
    const now = new Date();
    const stageCounts = Object.fromEntries(SELLER_PROSPECT_STAGE_VALUES.map(stage => [stage, 0])) as Record<
      string,
      number
    >;
    let overdueFollowUps = 0;
    let scheduledFollowUps = 0;
    let unassigned = 0;
    let missingNextAction = 0;
    let contactedProspects = 0;
    let totalFirstContactMinutes = 0;

    prospects.forEach((prospect: any) => {
      stageCounts[prospect.stage] = (stageCounts[prospect.stage] || 0) + 1;
      if (!prospect.assignedAgentId) unassigned += 1;
      if (!isTerminalStage(prospect.stage) && !String(prospect.nextAction || '').trim()) {
        missingNextAction += 1;
      }
      const createdAt = parseDatabaseTimestamp(prospect.createdAt);
      const firstContactedAt = parseDatabaseTimestamp(prospect.firstContactedAt);
      if (createdAt && firstContactedAt && firstContactedAt >= createdAt) {
        contactedProspects += 1;
        totalFirstContactMinutes += (firstContactedAt.getTime() - createdAt.getTime()) / 60_000;
      }
      if (!prospect.nextFollowUp || isTerminalStage(prospect.stage)) return;
      scheduledFollowUps += 1;
      const dueAt = parseDatabaseTimestamp(prospect.nextFollowUp);
      if (dueAt && dueAt.getTime() < now.getTime()) overdueFollowUps += 1;
    });

    const converted = stageCounts.converted_to_listing || 0;
    const active = prospects.filter((prospect: any) => !isTerminalStage(prospect.stage)).length;
    return {
      total: prospects.length,
      active,
      converted,
      conversionRate: prospects.length ? Number(((converted / prospects.length) * 100).toFixed(1)) : 0,
      overdueFollowUps,
      scheduledFollowUps,
      unassigned: scope.isManager ? unassigned : 0,
      missingNextAction,
      contactedProspects,
      averageFirstContactMinutes: contactedProspects
        ? Math.round(totalFirstContactMinutes / contactedProspects)
        : null,
      stageCounts,
      scope: scope.isManager ? 'agency' : 'assigned_agent',
    };
  }),

  getFollowUpQueue: agentProcedure
    .input(
      z.object({
        agentId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const scope = await getSellerProspectActorScope(db, requireUser(ctx));
      const conditions = buildScopeConditions(scope, input.agentId);
      conditions.push(
        isNotNull(sellerProspects.nextFollowUp),
        notInArray(sellerProspects.stage, terminalStages as any),
      );
      const rows = await db
        .select({
          prospect: sellerProspects,
          agent: {
            id: agents.id,
            userId: agents.userId,
            displayName: agents.displayName,
            firstName: agents.firstName,
            lastName: agents.lastName,
            email: agents.email,
            phone: agents.phone,
          },
        })
        .from(sellerProspects)
        .leftJoin(agents, eq(sellerProspects.assignedAgentId, agents.id))
        .where(and(...conditions))
        .orderBy(asc(sellerProspects.nextFollowUp))
        .limit(input.limit);
      const now = Date.now();
      return rows.map((row: any) => {
        const prospect = mapProspectRow(row);
        const dueAt = parseDatabaseTimestamp(prospect.nextFollowUp);
        return { ...prospect, overdue: Boolean(dueAt && dueAt.getTime() < now) };
      });
    }),

  listAssignableAgents: agentProcedure.query(async ({ ctx }) => {
    const db = await requireDatabase();
    const scope = await getSellerProspectActorScope(db, requireUser(ctx));
    if (!scope.isManager) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager privileges are required.' });
    }

    const rows = await db
      .select({
        id: agents.id,
        userId: agents.userId,
        displayName: agents.displayName,
        firstName: agents.firstName,
        lastName: agents.lastName,
        email: agents.email,
        phone: agents.phone,
      })
      .from(agents)
      .where(and(eq(agents.agencyId, scope.agencyId), eq(agents.status, 'approved')))
      .orderBy(asc(agents.displayName));
    return rows.map(formatAgent);
  }),

  create: agentProcedure.input(createSellerProspectSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDatabase();
    const user = requireUser(ctx);
    const scope = await getSellerProspectActorScope(db, user);
    let assignedAgentId: number | null = input.assignedAgentId || null;

    if (scope.isManager) {
      if (assignedAgentId) await requireAgencyAssignableAgent(db, scope.agencyId, assignedAgentId);
    } else {
      if (assignedAgentId && assignedAgentId !== scope.agentId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Agents can only create seller prospects assigned to themselves.',
        });
      }
      assignedAgentId = scope.agentId;
    }

    const nextFollowUp = input.nextFollowUp ? parseFollowUp(input.nextFollowUp) : null;
    const now = nowAsDbTimestamp();
    const [result] = await db.transaction(async (tx: any) => {
      const [insertResult] = await tx.insert(sellerProspects).values({
        agencyId: scope.agencyId,
        assignedAgentId,
        createdByUserId: user.id,
        ownerName: input.ownerName,
        email: input.email,
        phone: input.phone,
        propertyAddress: input.propertyAddress,
        suburb: input.suburb,
        city: input.city,
        province: input.province,
        propertyType: input.propertyType || null,
        source: input.source,
        canvassingMethod: input.canvassingMethod,
        priority: input.priority,
        stage: nextFollowUp ? 'follow_up_required' : 'new',
        nextFollowUp,
        nextAction:
          input.nextAction ||
          (nextFollowUp ? 'Complete scheduled seller follow-up' : 'Make first seller contact'),
        createdAt: now,
        updatedAt: now,
      });
      const sellerProspectId = Number(insertResult.insertId || 0);
      await tx.insert(sellerProspectActivities).values({
        agencyId: scope.agencyId,
        sellerProspectId,
        actorUserId: user.id,
        activityType: 'created',
        description: 'Seller prospect captured.',
        metadata: { assignedAgentId },
        createdAt: now,
      });
      if (nextFollowUp) {
        await tx.insert(sellerProspectActivities).values({
          agencyId: scope.agencyId,
          sellerProspectId,
          actorUserId: user.id,
          activityType: 'follow_up_scheduled',
          description: `Follow-up scheduled for ${nextFollowUp}.`,
          metadata: { nextFollowUp },
          createdAt: now,
        });
      }
      if (input.initialNote) {
        await tx.insert(sellerProspectActivities).values({
          agencyId: scope.agencyId,
          sellerProspectId,
          actorUserId: user.id,
          activityType: 'note',
          description: input.initialNote,
          createdAt: now,
        });
      }
      return [{ insertId: sellerProspectId }];
    });
    const sellerProspectId = Number(result.insertId || 0);

    await logCanvassingAudit({
      ctx,
      userId: user.id,
      action: 'canvassing.seller_prospect_created',
      sellerProspectId,
      agencyId: scope.agencyId,
      metadata: { assignedAgentId, source: input.source || null },
    });

    return { sellerProspectId, assignedAgentId };
  }),

  update: agentProcedure.input(updateSellerProspectSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDatabase();
    const user = requireUser(ctx);
    const scope = await getSellerProspectActorScope(db, user);
    await requireSellerProspect(db, scope, input.sellerProspectId);
    const { sellerProspectId, ...changes } = input;
    const updateValues = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as Record<string, unknown>;
    const now = nowAsDbTimestamp();
    await db
      .update(sellerProspects)
      .set({ ...updateValues, updatedAt: now })
      .where(and(eq(sellerProspects.id, sellerProspectId), eq(sellerProspects.agencyId, scope.agencyId)));

    await logCanvassingAudit({
      ctx,
      userId: user.id,
      action: 'canvassing.seller_prospect_updated',
      sellerProspectId,
      agencyId: scope.agencyId,
      metadata: { fields: Object.keys(updateValues) },
    });
    return { success: true };
  }),

  assign: agentProcedure
    .input(
      z.object({
        sellerProspectId: z.number().int().positive(),
        agentId: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const user = requireUser(ctx);
      const scope = await getSellerProspectActorScope(db, user);
      if (!scope.isManager) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager privileges are required.' });
      }
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      const agent = input.agentId
        ? await requireAgencyAssignableAgent(db, scope.agencyId, input.agentId)
        : null;
      const now = nowAsDbTimestamp();
      await db.transaction(async (tx: any) => {
        await tx
          .update(sellerProspects)
          .set({ assignedAgentId: agent?.id || null, updatedAt: now })
          .where(and(eq(sellerProspects.id, prospect.id), eq(sellerProspects.agencyId, scope.agencyId)));
        await tx.insert(sellerProspectActivities).values({
          agencyId: scope.agencyId,
          sellerProspectId: prospect.id,
          actorUserId: user.id,
          activityType: 'assignment',
          description: agent ? 'Seller prospect reassigned.' : 'Seller prospect unassigned.',
          metadata: { previousAgentId: prospect.assignedAgentId || null, nextAgentId: agent?.id || null },
          createdAt: now,
        });
      });
      await logCanvassingAudit({
        ctx,
        userId: user.id,
        action: 'canvassing.seller_prospect_assigned',
        sellerProspectId: prospect.id,
        agencyId: scope.agencyId,
        metadata: { previousAgentId: prospect.assignedAgentId || null, nextAgentId: agent?.id || null },
      });
      return { success: true, assignedAgentId: agent?.id || null };
    }),

  updateStage: agentProcedure
    .input(
      z.object({
        sellerProspectId: z.number().int().positive(),
        stage: stageSchema,
        outcome: optionalText(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const user = requireUser(ctx);
      const scope = await getSellerProspectActorScope(db, user);
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      const currentStage = String(prospect.stage || 'new');

      if (input.stage === 'converted_to_listing') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Create the canonical listing to complete conversion.',
        });
      }
      if (input.stage === 'mandate_won') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Complete the mandate checklist to record a won mandate.',
        });
      }
      if (currentStage !== input.stage && !stageTransitions[currentStage]?.includes(input.stage)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot move seller prospect from ${currentStage} to ${input.stage}.`,
        });
      }
      if (['lost', 'not_interested'].includes(input.stage) && !input.outcome) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Record an outcome before moving a seller prospect to this stage.',
        });
      }

      const now = nowAsDbTimestamp();
      const nextFollowUp = isTerminalStage(input.stage) ? null : prospect.nextFollowUp;
      const lastContactedAt = ['contact_attempted', 'contacted'].includes(input.stage)
        ? now
        : prospect.lastContactedAt;
      await db.transaction(async (tx: any) => {
        await tx
          .update(sellerProspects)
          .set({
            stage: input.stage,
            outcome: input.outcome === undefined ? prospect.outcome : input.outcome,
            nextFollowUp,
            nextAction: isTerminalStage(input.stage)
              ? null
              : prospect.nextAction || 'Record the next seller action',
            lastContactedAt,
            firstContactedAt:
              ['contact_attempted', 'contacted'].includes(input.stage) && !prospect.firstContactedAt
                ? now
                : prospect.firstContactedAt,
            updatedAt: now,
          })
          .where(and(eq(sellerProspects.id, prospect.id), eq(sellerProspects.agencyId, scope.agencyId)));
        if (currentStage !== input.stage) {
          await tx.insert(sellerProspectActivities).values({
            agencyId: scope.agencyId,
            sellerProspectId: prospect.id,
            actorUserId: user.id,
            activityType: 'status_change',
            description: `Stage changed from ${currentStage.replace(/_/g, ' ')} to ${input.stage.replace(/_/g, ' ')}.`,
            metadata: { previousStage: currentStage, nextStage: input.stage },
            createdAt: now,
          });
        }
      });

      await logCanvassingAudit({
        ctx,
        userId: user.id,
        action: 'canvassing.seller_prospect_stage_updated',
        sellerProspectId: prospect.id,
        agencyId: scope.agencyId,
        metadata: { previousStage: currentStage, nextStage: input.stage },
      });
      return { success: true, stage: input.stage };
    }),

  addActivity: agentProcedure
    .input(
      z.object({
        sellerProspectId: z.number().int().positive(),
        activityType: z.enum(['note', 'call', 'email', 'meeting']),
        description: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const user = requireUser(ctx);
      const scope = await getSellerProspectActorScope(db, user);
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      const now = nowAsDbTimestamp();
      await db.transaction(async (tx: any) => {
        await tx.insert(sellerProspectActivities).values({
          agencyId: scope.agencyId,
          sellerProspectId: prospect.id,
          actorUserId: user.id,
          activityType: input.activityType,
          description: input.description,
          createdAt: now,
        });
        if (['call', 'email', 'meeting'].includes(input.activityType)) {
          await tx
            .update(sellerProspects)
            .set({ lastContactedAt: now, updatedAt: now })
            .where(and(eq(sellerProspects.id, prospect.id), eq(sellerProspects.agencyId, scope.agencyId)));
        }
      });
      await logCanvassingAudit({
        ctx,
        userId: user.id,
        action: 'canvassing.seller_prospect_activity_added',
        sellerProspectId: prospect.id,
        agencyId: scope.agencyId,
        metadata: { activityType: input.activityType },
      });
      return { success: true };
    }),

  recordContactAttempt: agentProcedure
    .input(
      z
        .object({
          sellerProspectId: z.number().int().positive(),
          channel: contactChannelSchema,
          outcome: contactOutcomeSchema,
          summary: z.string().trim().min(1).max(2000),
          nextAction: optionalText(255),
          nextFollowUp: z.string().trim().min(1).optional().nullable(),
        })
        .superRefine((input, context) => {
          const terminalOutcome = ['not_interested', 'invalid_contact'].includes(input.outcome);
          if (!terminalOutcome && !input.nextAction) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['nextAction'],
              message: 'Record the next action for every active seller prospect.',
            });
          }
          if (input.outcome === 'follow_up_required' && !input.nextFollowUp) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['nextFollowUp'],
              message: 'Schedule the required follow-up.',
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const user = requireUser(ctx);
      const scope = await getSellerProspectActorScope(db, user);
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      if (isTerminalStage(prospect.stage)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contact cannot be recorded for a closed seller prospect.',
        });
      }

      const now = nowAsDbTimestamp();
      const nextFollowUp = parseOptionalTimestamp(input.nextFollowUp);
      const terminalOutcome = ['not_interested', 'invalid_contact'].includes(input.outcome);
      const reached = ['reached', 'replied', 'appointment_booked'].includes(input.outcome);
      const nextStage = terminalOutcome
        ? input.outcome === 'not_interested'
          ? 'not_interested'
          : 'lost'
        : input.outcome === 'appointment_booked'
          ? 'appointment_scheduled'
          : nextFollowUp || input.outcome === 'follow_up_required'
            ? 'follow_up_required'
            : reached
              ? 'contacted'
              : 'contact_attempted';

      await db.transaction(async (tx: any) => {
        await tx
          .update(sellerProspects)
          .set({
            stage: nextStage,
            firstContactedAt: prospect.firstContactedAt || now,
            lastContactedAt: now,
            nextFollowUp: terminalOutcome ? null : nextFollowUp,
            nextAction: terminalOutcome ? null : input.nextAction,
            outcome: terminalOutcome ? input.summary : prospect.outcome,
            updatedAt: now,
          })
          .where(
            and(
              eq(sellerProspects.id, prospect.id),
              eq(sellerProspects.agencyId, scope.agencyId),
            ),
          );
        await tx.insert(sellerProspectActivities).values({
          agencyId: scope.agencyId,
          sellerProspectId: prospect.id,
          actorUserId: user.id,
          activityType: 'contact_attempt',
          description: input.summary,
          metadata: {
            channel: input.channel,
            outcome: input.outcome,
            previousStage: prospect.stage,
            nextStage,
            nextAction: terminalOutcome ? null : input.nextAction,
            nextFollowUp,
          },
          createdAt: now,
        });
      });

      await logCanvassingAudit({
        ctx,
        userId: user.id,
        action: 'canvassing.seller_contact_attempt_recorded',
        sellerProspectId: prospect.id,
        agencyId: scope.agencyId,
        metadata: { channel: input.channel, outcome: input.outcome, nextStage },
      });
      return {
        success: true,
        stage: nextStage,
        nextAction: terminalOutcome ? null : input.nextAction,
      };
    }),

  getMandateOperations: agentProcedure
    .input(z.object({ sellerProspectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const scope = await getSellerProspectActorScope(db, requireUser(ctx));
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      const [operation] = await db.select().from(sellerMandateOperations)
        .where(and(eq(sellerMandateOperations.sellerProspectId, prospect.id), eq(sellerMandateOperations.agencyId, scope.agencyId))).limit(1);
      const comparables = operation ? await db.select().from(sellerMandateComparables)
        .where(and(eq(sellerMandateComparables.mandateOperationId, operation.id), eq(sellerMandateComparables.agencyId, scope.agencyId))) : [];
      return { operation: operation || null, comparables, readiness: getMandateReadiness(operation, prospect) };
    }),

  saveMandateOperations: agentProcedure
    .input(z.object({
      sellerProspectId: z.number().int().positive(),
      status: z.enum(SELLER_MANDATE_STATUS_VALUES),
      mandateType: z.enum(SELLER_PROSPECT_MANDATE_TYPE_VALUES).optional(),
      signedAt: z.string().trim().min(1).optional().nullable(), expiresAt: z.string().trim().min(1).optional().nullable(),
      sellerRequestedPrice: z.coerce.number().positive().optional().nullable(), recommendedPriceMin: z.coerce.number().positive().optional().nullable(), recommendedPriceMax: z.coerce.number().positive().optional().nullable(), agreedListingPrice: z.coerce.number().positive().optional().nullable(),
      pricingRationale: optionalText(4000), pricingDiscussedAt: z.string().trim().min(1).optional().nullable(), priceReviewAt: z.string().trim().min(1).optional().nullable(), sellerObjections: optionalText(4000), mandateStartAt: z.string().trim().min(1).optional().nullable(),
      documentStatus: z.enum(SELLER_MANDATE_DOCUMENT_STATUS_VALUES), documentName: optionalText(255), privateStorageReference: optionalText(500), documentDate: z.string().trim().min(1).optional().nullable(),
      requirements: mandateRequirementsSchema, nextAction: z.string().trim().min(1).max(255),
    }).superRefine((input, context) => {
      if (input.recommendedPriceMin && input.recommendedPriceMax && input.recommendedPriceMin > input.recommendedPriceMax) context.addIssue({ code: z.ZodIssueCode.custom, path: ['recommendedPriceMax'], message: 'Recommended maximum must be at least the recommended minimum.' });
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase(); const user = requireUser(ctx); const scope = await getSellerProspectActorScope(db, user);
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      if (!['qualified', 'mandate_won'].includes(String(prospect.stage))) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Qualify the seller before starting mandate operations.' });
      const signedAt = parseOptionalTimestamp(input.signedAt); const expiresAt = parseOptionalTimestamp(input.expiresAt);
      if (expiresAt && signedAt && new Date(expiresAt).getTime() <= new Date(signedAt).getTime()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Mandate expiry must be after signing.' });
      const storageReference = input.privateStorageReference || null;
      if (storageReference && !isAgencyPrivateMandateStorageReference(storageReference, scope.agencyId)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Mandate document reference must be an agency-private mandate storage reference.' });
      const candidate = { status: input.status, requirements: input.requirements, pricingDiscussedAt: parseOptionalTimestamp(input.pricingDiscussedAt), agreedListingPrice: input.agreedListingPrice, documentStatus: input.documentStatus };
      const readiness = getMandateReadiness(candidate, { ...prospect, mandateType: input.mandateType || prospect.mandateType, agreedAskingPrice: input.agreedListingPrice || prospect.agreedAskingPrice, mandateSignedAt: signedAt || prospect.mandateSignedAt, mandateExpiresAt: expiresAt || prospect.mandateExpiresAt });
      if (input.status === 'listing_ready' && !readiness.ready) throw new TRPCError({ code: 'BAD_REQUEST', message: `Complete mandate requirements before declaring listing ready: ${readiness.missing.join(', ')}` });
      const now = nowAsDbTimestamp();
      await db.transaction(async (tx: any) => {
        const values: any = { agencyId: scope.agencyId, sellerProspectId: prospect.id, status: input.status, sellerRequestedPrice: input.sellerRequestedPrice == null ? null : input.sellerRequestedPrice.toFixed(2), recommendedPriceMin: input.recommendedPriceMin == null ? null : input.recommendedPriceMin.toFixed(2), recommendedPriceMax: input.recommendedPriceMax == null ? null : input.recommendedPriceMax.toFixed(2), agreedListingPrice: input.agreedListingPrice == null ? null : input.agreedListingPrice.toFixed(2), pricingRationale: input.pricingRationale, pricingDiscussedAt: candidate.pricingDiscussedAt, priceReviewAt: parseOptionalTimestamp(input.priceReviewAt), sellerObjections: input.sellerObjections, mandateStartAt: parseOptionalTimestamp(input.mandateStartAt), documentStatus: input.documentStatus, documentName: input.documentName, privateStorageReference: storageReference, documentDate: parseOptionalTimestamp(input.documentDate), requirements: input.requirements, nextAction: input.nextAction, listingReadyAt: input.status === 'listing_ready' ? now : null, updatedAt: now };
        await tx.insert(sellerMandateOperations).values(values).onDuplicateKeyUpdate({ set: values });
        await tx.update(sellerProspects).set({ stage: input.status === 'listing_ready' ? 'mandate_won' : prospect.stage, mandateType: input.mandateType || prospect.mandateType, mandateSignedAt: signedAt || prospect.mandateSignedAt, mandateExpiresAt: expiresAt || prospect.mandateExpiresAt, agreedAskingPrice: input.agreedListingPrice == null ? prospect.agreedAskingPrice : input.agreedListingPrice.toFixed(2), nextAction: input.nextAction, updatedAt: now }).where(and(eq(sellerProspects.id, prospect.id), eq(sellerProspects.agencyId, scope.agencyId)));
        await tx.insert(sellerProspectActivities).values({ agencyId: scope.agencyId, sellerProspectId: prospect.id, actorUserId: user.id, activityType: 'mandate_updated', description: `Mandate operations updated: ${input.status.replace(/_/g, ' ')}.`, metadata: { status: input.status, readiness }, createdAt: now });
      });
      await logCanvassingAudit({ ctx, userId: user.id, action: 'canvassing.seller_mandate_operations_updated', sellerProspectId: prospect.id, agencyId: scope.agencyId, metadata: { status: input.status } });
      return { success: true, readiness };
    }),

  addMandateComparable: agentProcedure
    .input(z.object({ sellerProspectId: z.number().int().positive(), reference: z.string().trim().min(1).max(500), propertyType: optionalText(100), area: optionalText(200), price: z.coerce.number().positive().optional().nullable(), priceKind: z.enum(['asking', 'selling', 'other']).default('other'), notes: optionalText(2000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase(); const scope = await getSellerProspectActorScope(db, requireUser(ctx)); const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      const [operation] = await db.select({ id: sellerMandateOperations.id }).from(sellerMandateOperations).where(and(eq(sellerMandateOperations.sellerProspectId, prospect.id), eq(sellerMandateOperations.agencyId, scope.agencyId))).limit(1);
      if (!operation) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Save mandate operations before adding private comparable references.' });
      const [result] = await db.insert(sellerMandateComparables).values({ agencyId: scope.agencyId, mandateOperationId: operation.id, reference: input.reference, propertyType: input.propertyType, area: input.area, price: input.price == null ? null : input.price.toFixed(2), priceKind: input.priceKind, notes: input.notes });
      return { comparableId: Number(result.insertId) };
    }),

  removeMandateComparable: agentProcedure
    .input(z.object({ sellerProspectId: z.number().int().positive(), comparableId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const scope = await getSellerProspectActorScope(db, requireUser(ctx));
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      const [operation] = await db.select({ id: sellerMandateOperations.id }).from(sellerMandateOperations)
        .where(and(eq(sellerMandateOperations.sellerProspectId, prospect.id), eq(sellerMandateOperations.agencyId, scope.agencyId))).limit(1);
      if (!operation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mandate operations not found.' });
      const [comparable] = await db.select({ id: sellerMandateComparables.id }).from(sellerMandateComparables).where(and(
        eq(sellerMandateComparables.id, input.comparableId),
        eq(sellerMandateComparables.mandateOperationId, operation.id),
        eq(sellerMandateComparables.agencyId, scope.agencyId),
      )).limit(1);
      if (!comparable) throw new TRPCError({ code: 'NOT_FOUND', message: 'Private comparable not found.' });
      await db.delete(sellerMandateComparables).where(eq(sellerMandateComparables.id, comparable.id));
      return { success: true };
    }),

  updateMandate: agentProcedure
    .input(
      z.object({
        sellerProspectId: z.number().int().positive(),
        mandateType: z.enum(SELLER_PROSPECT_MANDATE_TYPE_VALUES),
        signedAt: z.string().trim().min(1),
        expiresAt: z.string().trim().min(1).optional().nullable(),
        agreedAskingPrice: z.coerce.number().positive().optional().nullable(),
        checklist: z.object({
          pricingAgreed: z.boolean(),
          sellerIdentityConfirmed: z.boolean(),
          propertyDetailsConfirmed: z.boolean(),
          mandateRecorded: z.boolean(),
        }),
        nextAction: z.string().trim().min(1).max(255),
      }).superRefine((input, context) => {
        const missing = Object.entries(input.checklist).filter(([, complete]) => !complete);
        if (missing.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['checklist'],
            message: 'Complete every mandate checkpoint before recording a won mandate.',
          });
        }
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const user = requireUser(ctx);
      const scope = await getSellerProspectActorScope(db, user);
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      if (!['qualified', 'mandate_won'].includes(String(prospect.stage))) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Qualify the seller before recording mandate details.',
        });
      }
      const signedAt = parseFollowUp(input.signedAt);
      const expiresAt = parseOptionalTimestamp(input.expiresAt);
      if (expiresAt && new Date(expiresAt).getTime() <= new Date(signedAt).getTime()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Mandate expiry must be after the signed date.',
        });
      }
      const now = nowAsDbTimestamp();
      await db.transaction(async (tx: any) => {
        await tx
          .update(sellerProspects)
          .set({
            stage: 'mandate_won',
            mandateType: input.mandateType,
            mandateSignedAt: signedAt,
            mandateExpiresAt: expiresAt,
            agreedAskingPrice:
              input.agreedAskingPrice == null ? null : input.agreedAskingPrice.toFixed(2),
            mandateChecklist: input.checklist,
            nextAction: input.nextAction,
            updatedAt: now,
          })
          .where(
            and(
              eq(sellerProspects.id, prospect.id),
              eq(sellerProspects.agencyId, scope.agencyId),
            ),
          );
        await tx.insert(sellerProspectActivities).values({
          agencyId: scope.agencyId,
          sellerProspectId: prospect.id,
          actorUserId: user.id,
          activityType: 'mandate_updated',
          description: `${input.mandateType.replace(/_/g, ' ')} mandate recorded.`,
          metadata: {
            signedAt,
            expiresAt,
            agreedAskingPrice: input.agreedAskingPrice,
            checklist: input.checklist,
          },
          createdAt: now,
        });
      });
      await logCanvassingAudit({
        ctx,
        userId: user.id,
        action: 'canvassing.seller_mandate_recorded',
        sellerProspectId: prospect.id,
        agencyId: scope.agencyId,
        metadata: { mandateType: input.mandateType },
      });
      return { success: true, stage: 'mandate_won' as const };
    }),

  setFollowUp: agentProcedure
    .input(
      z.object({
        sellerProspectId: z.number().int().positive(),
        nextFollowUp: z.string().trim().min(1),
        note: optionalText(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const user = requireUser(ctx);
      const scope = await getSellerProspectActorScope(db, user);
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      if (isTerminalStage(prospect.stage)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Follow-ups cannot be scheduled for terminal seller prospects.',
        });
      }
      const nextFollowUp = parseFollowUp(input.nextFollowUp);
      const now = nowAsDbTimestamp();
      const stage = ['new', 'contact_attempted', 'contacted'].includes(String(prospect.stage))
        ? 'follow_up_required'
        : prospect.stage;
      await db.transaction(async (tx: any) => {
        await tx
          .update(sellerProspects)
          .set({
            stage,
            nextFollowUp,
            nextAction: input.note || 'Complete scheduled seller follow-up',
            updatedAt: now,
          })
          .where(and(eq(sellerProspects.id, prospect.id), eq(sellerProspects.agencyId, scope.agencyId)));
        await tx.insert(sellerProspectActivities).values({
          agencyId: scope.agencyId,
          sellerProspectId: prospect.id,
          actorUserId: user.id,
          activityType: 'follow_up_scheduled',
          description: input.note
            ? `Follow-up scheduled for ${nextFollowUp}. ${input.note}`
            : `Follow-up scheduled for ${nextFollowUp}.`,
          metadata: { nextFollowUp, previousStage: prospect.stage, nextStage: stage },
          createdAt: now,
        });
      });
      await logCanvassingAudit({
        ctx,
        userId: user.id,
        action: 'canvassing.seller_prospect_follow_up_scheduled',
        sellerProspectId: prospect.id,
        agencyId: scope.agencyId,
        metadata: { nextFollowUp },
      });
      return { success: true, nextFollowUp };
    }),

  completeFollowUp: agentProcedure
    .input(
      z.object({
        sellerProspectId: z.number().int().positive(),
        note: optionalText(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const user = requireUser(ctx);
      const scope = await getSellerProspectActorScope(db, user);
      const prospect = await requireSellerProspect(db, scope, input.sellerProspectId);
      if (isTerminalStage(prospect.stage)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Follow-ups cannot be completed for terminal seller prospects.',
        });
      }
      const now = nowAsDbTimestamp();
      const stage = prospect.stage === 'follow_up_required' ? 'contacted' : prospect.stage;
      await db.transaction(async (tx: any) => {
        await tx
          .update(sellerProspects)
          .set({
            stage,
            nextFollowUp: null,
            nextAction: 'Record the seller outcome and schedule the next action',
            firstContactedAt: prospect.firstContactedAt || now,
            lastContactedAt: now,
            updatedAt: now,
          })
          .where(and(eq(sellerProspects.id, prospect.id), eq(sellerProspects.agencyId, scope.agencyId)));
        await tx.insert(sellerProspectActivities).values({
          agencyId: scope.agencyId,
          sellerProspectId: prospect.id,
          actorUserId: user.id,
          activityType: 'follow_up_completed',
          description: input.note ? `Follow-up completed. ${input.note}` : 'Follow-up completed.',
          metadata: { previousStage: prospect.stage, nextStage: stage },
          createdAt: now,
        });
      });
      await logCanvassingAudit({
        ctx,
        userId: user.id,
        action: 'canvassing.seller_prospect_follow_up_completed',
        sellerProspectId: prospect.id,
        agencyId: scope.agencyId,
      });
      return { success: true };
    }),

  getListingPrefill: agentProcedure
    .input(z.object({ sellerProspectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDatabase();
      const conversion = await prepareSellerProspectListingConversion(
        db,
        requireUser(ctx),
        input.sellerProspectId,
      );
      const [prospect] = await db
        .select({
          id: sellerProspects.id,
          propertyAddress: sellerProspects.propertyAddress,
          suburb: sellerProspects.suburb,
          city: sellerProspects.city,
          province: sellerProspects.province,
          propertyType: sellerProspects.propertyType,
        })
        .from(sellerProspects)
        .where(
          and(
            eq(sellerProspects.id, conversion.sellerProspectId),
            eq(sellerProspects.agencyId, conversion.agencyId),
          ),
        )
        .limit(1);

      if (!prospect) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Seller prospect not found.' });
      }

      return {
        sellerProspectId: prospect.id,
        action: 'sell' as const,
        propertyType: prospect.propertyType,
        propertyLocation: {
          address: prospect.propertyAddress,
          suburb: prospect.suburb,
          city: prospect.city,
          province: prospect.province,
        },
      };
    }),
});
