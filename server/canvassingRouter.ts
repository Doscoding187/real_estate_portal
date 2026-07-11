import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, isNotNull, isNull, like, lt, notInArray, or } from 'drizzle-orm';
import { z } from 'zod';
import {
  agents,
  sellerProspectActivities,
  sellerProspects,
  SELLER_PROSPECT_ACTIVITY_TYPE_VALUES,
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
  requireAgencyAssignableAgent,
  requireSellerProspect,
} from './services/sellerProspectAccessService';
import { nowAsDbTimestamp, toDbTimestampRequired } from './utils/dbTypeUtils';

const terminalStages = SELLER_PROSPECT_TERMINAL_STAGE_VALUES as unknown as [string, ...string[]];

const stageSchema = z.enum(SELLER_PROSPECT_STAGE_VALUES);
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

    prospects.forEach((prospect: any) => {
      stageCounts[prospect.stage] = (stageCounts[prospect.stage] || 0) + 1;
      if (!prospect.assignedAgentId) unassigned += 1;
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
            lastContactedAt,
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
          .set({ stage, nextFollowUp, updatedAt: now })
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
          .set({ stage, nextFollowUp: null, lastContactedAt: now, updatedAt: now })
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
