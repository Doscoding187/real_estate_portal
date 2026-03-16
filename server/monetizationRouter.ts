import { and, eq, inArray, sql } from 'drizzle-orm';
import { agents, agencies, developers } from '../drizzle/schema';
import { router, publicProcedure, superAdminProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import { logAudit, AuditActions } from './_core/auditLog';
import {
  buildSessionKeyFromRequest,
  createLocationTargetingRule,
  getAllLocationTargetingRules,
  getLocationTargetingDeliverySimulation,
  getLocationTargetingRuleById,
  getSurfaceDemandBaseline,
  getEligibleLocationRules,
  getLocationTargetingRulePerformance,
  recordLocationRuleEvent,
  setLocationTargetingRuleStatus,
  updateLocationTargetingRuleControls,
} from './services/locationMonetizationService';
import {
  listDominanceAudit,
  logDominanceAudit,
  type DominanceChangeType,
} from './services/dominanceAuditService';

const locationTypeSchema = z.enum(['province', 'city', 'suburb']);
const targetTypeSchema = z.enum(['hero_ad', 'featured_developer', 'recommended_agent', 'geo_listing']);
const ruleStatusSchema = z.enum(['active', 'scheduled', 'expired', 'paused']);
const validationStatusSchema = z.enum(['passed', 'failed', 'not_run', 'unknown']);

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson(value: unknown): any {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function deriveChangeType(changedFields: string[]): DominanceChangeType {
  const hasRanking = changedFields.includes('ranking');
  const hasCapFields = changedFields.some(field =>
    ['dailyImpressionCap', 'totalImpressionCap', 'pacingMinutes'].includes(field),
  );
  const hasPricingFloorFields = changedFields.some(field =>
    ['pricingFloorCpm', 'pricingFloorCpc', 'metadata'].includes(field),
  );

  if (hasPricingFloorFields) return 'pricing_floor_update';
  if (hasRanking && !hasCapFields) return 'ranking_weight_update';
  if (hasCapFields && !hasRanking) return 'cap_logic_update';
  return 'rule_update';
}

export const monetizationRouter = router({
  createTargetingRule: superAdminProcedure
    .input(
      z.object({
        targetType: targetTypeSchema,
        targetId: z.number(),
        locationType: locationTypeSchema,
        locationId: z.number(),
        ranking: z.number().default(0),
        status: ruleStatusSchema.default('scheduled'),
        metadata: z.any(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        dailyImpressionCap: z.number().optional(),
        totalImpressionCap: z.number().optional(),
        pacingMinutes: z.number().optional(),
        validationStatus: validationStatusSchema.optional(),
        validationReference: z.record(z.string(), z.any()).optional(),
        approvedByUserId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const created = await createLocationTargetingRule({
        targetType: input.targetType,
        targetId: input.targetId,
        locationType: input.locationType,
        locationId: input.locationId,
        ranking: input.ranking,
        status: input.status,
        metadata: input.metadata,
        startDate: input.startDate,
        endDate: input.endDate,
        dailyImpressionCap: input.dailyImpressionCap,
        totalImpressionCap: input.totalImpressionCap,
        pacingMinutes: input.pacingMinutes,
        createdBy: ctx.user.id,
      });

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_MONETIZATION_RULE,
        targetType: 'location_targeting_rule',
        targetId: created.id,
        metadata: {
          op: 'create',
          rule: created,
        },
        req: ctx.req,
      });

      await logDominanceAudit({
        changeType: 'rule_create',
        dominanceLayer: 'market_control',
        entityType: 'location_targeting_rule',
        entityId: created.id,
        actorUserId: ctx.user.id,
        approvedByUserId: input.approvedByUserId ?? ctx.user.id,
        validationStatus: input.validationStatus ?? 'unknown',
        validationReference: input.validationReference || null,
        afterState: created,
        metadata: {
          changedFields: [
            'targetType',
            'targetId',
            'locationType',
            'locationId',
            'ranking',
            'status',
            'dailyImpressionCap',
            'totalImpressionCap',
            'pacingMinutes',
          ],
        },
      });

      return created;
    }),

  setRuleStatus: superAdminProcedure
    .input(
      z.object({
        ruleId: z.number(),
        status: ruleStatusSchema,
        validationStatus: validationStatusSchema.optional(),
        validationReference: z.record(z.string(), z.any()).optional(),
        approvedByUserId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const before = await getLocationTargetingRuleById(input.ruleId);
      const result = await setLocationTargetingRuleStatus(input.ruleId, input.status);
      const after = await getLocationTargetingRuleById(input.ruleId);

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_MONETIZATION_RULE,
        targetType: 'location_targeting_rule',
        targetId: input.ruleId,
        metadata: {
          op: 'status_update',
          status: input.status,
          result,
        },
        req: ctx.req,
      });

      await logDominanceAudit({
        changeType: 'rule_status_update',
        dominanceLayer: 'delivery_engine',
        entityType: 'location_targeting_rule',
        entityId: input.ruleId,
        actorUserId: ctx.user.id,
        approvedByUserId: input.approvedByUserId ?? ctx.user.id,
        validationStatus: input.validationStatus ?? 'unknown',
        validationReference: input.validationReference || null,
        beforeState: before || null,
        afterState: after || { status: input.status },
        metadata: { changedFields: ['status'] },
      });

      return {
        success: true,
        ruleId: input.ruleId,
        status: input.status,
        updatedAt: result.updatedAt,
      };
    }),

  updateTargetingRuleControls: superAdminProcedure
    .input(
      z
        .object({
          ruleId: z.number(),
          ranking: z.number().optional(),
          metadata: z.record(z.string(), z.any()).optional(),
          startDate: z.string().nullable().optional(),
          endDate: z.string().nullable().optional(),
          dailyImpressionCap: z.number().optional(),
          totalImpressionCap: z.number().optional(),
          pacingMinutes: z.number().optional(),
          status: ruleStatusSchema.optional(),
          validationStatus: validationStatusSchema.optional(),
          validationReference: z.record(z.string(), z.any()).optional(),
          approvedByUserId: z.number().optional(),
        })
        .refine(
          input =>
            input.ranking !== undefined ||
            input.metadata !== undefined ||
            input.startDate !== undefined ||
            input.endDate !== undefined ||
            input.dailyImpressionCap !== undefined ||
            input.totalImpressionCap !== undefined ||
            input.pacingMinutes !== undefined ||
            input.status !== undefined,
          { message: 'At least one control field must be provided' },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const patch = {
        ranking: input.ranking,
        metadata: input.metadata,
        startDate: input.startDate,
        endDate: input.endDate,
        dailyImpressionCap: input.dailyImpressionCap,
        totalImpressionCap: input.totalImpressionCap,
        pacingMinutes: input.pacingMinutes,
        status: input.status,
      };

      const { before, after } = await updateLocationTargetingRuleControls(input.ruleId, patch);
      const changedFields = Object.keys(patch).filter(
        key => (patch as Record<string, unknown>)[key] !== undefined,
      );
      const changeType = deriveChangeType(changedFields);

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.UPDATE_MONETIZATION_RULE,
        targetType: 'location_targeting_rule',
        targetId: input.ruleId,
        metadata: {
          op: 'controls_update',
          changedFields,
          before,
          after,
        },
        req: ctx.req,
      });

      await logDominanceAudit({
        changeType,
        dominanceLayer: 'market_control',
        entityType: 'location_targeting_rule',
        entityId: input.ruleId,
        actorUserId: ctx.user.id,
        approvedByUserId: input.approvedByUserId ?? ctx.user.id,
        validationStatus: input.validationStatus ?? 'unknown',
        validationReference: input.validationReference || null,
        beforeState: before,
        afterState: after,
        metadata: { changedFields },
      });

      return {
        success: true,
        ruleId: input.ruleId,
        changedFields,
        changeType,
        updatedAt: after.updatedAt,
      };
    }),

  getAllRules: superAdminProcedure.query(async () => {
    return getAllLocationTargetingRules();
  }),

  getRulePerformance: superAdminProcedure
    .input(
      z
        .object({
          ruleId: z.number().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return getLocationTargetingRulePerformance(input);
    }),

  getDeliverySimulation: superAdminProcedure
    .input(
      z
        .object({
          ruleId: z.number().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return getLocationTargetingDeliverySimulation(input);
    }),

  getSurfaceDemandBaseline: superAdminProcedure
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          surfaceType: z.enum(['hero', 'developer', 'agent', 'listing', 'feed', 'unknown']).optional(),
          locationType: locationTypeSchema.optional(),
          locationId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return getSurfaceDemandBaseline(input);
    }),

  getDominanceAuditLog: superAdminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(200).optional(),
          changeType: z
            .enum([
              'pricing_floor_update',
              'cap_logic_update',
              'ranking_weight_update',
              'rule_create',
              'rule_status_update',
              'rule_update',
            ])
            .optional(),
          entityType: z.string().optional(),
          entityId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return listDominanceAudit(input);
    }),

  getHeroAd: publicProcedure
    .input(
      z.object({
        locationType: locationTypeSchema,
        locationId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sessionKey = buildSessionKeyFromRequest({
        requestId: ctx.requestId,
        userId: ctx.user?.id,
        ipAddress: ctx.req.ip || null,
        userAgent: ctx.req.headers['user-agent'] || null,
      });
      const rules = await getEligibleLocationRules({
        targetType: 'hero_ad',
        locationType: input.locationType,
        locationId: input.locationId,
        limit: 1,
        requestId: ctx.requestId,
        userId: ctx.user?.id ?? null,
        sessionKey,
        recordServe: true,
        contextType: 'hero',
      });

      const selected = rules[0];
      if (!selected) return null;

      return {
        id: selected.id,
        targetType: selected.targetType,
        targetId: selected.targetId,
        locationType: selected.locationType,
        locationId: selected.locationId,
        ranking: selected.ranking,
        status: selected.status,
        metadata: parseJson(selected.metadata),
        sponsoredLabel: selected.sponsoredLabel,
        isSponsored: true,
        monetizationRuleId: selected.id,
        serveRequestId: ctx.requestId,
      };
    }),

  getFeaturedDevelopers: publicProcedure
    .input(
      z
        .object({
          locationType: locationTypeSchema,
          locationId: z.number(),
          limit: z.number().min(1).max(8).default(4),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const locationType = input?.locationType;
      const locationId = input?.locationId;
      if (!locationType || !locationId) return [];

      const sessionKey = buildSessionKeyFromRequest({
        requestId: ctx.requestId,
        userId: ctx.user?.id,
        ipAddress: ctx.req.ip || null,
        userAgent: ctx.req.headers['user-agent'] || null,
      });

      const rules = await getEligibleLocationRules({
        targetType: 'featured_developer',
        locationType,
        locationId,
        limit: input?.limit || 4,
        requestId: ctx.requestId,
        userId: ctx.user?.id ?? null,
        sessionKey,
        recordServe: true,
        contextType: 'developer',
      });

      if (!rules.length) return [];
      const db = await getDb();
      if (!db) return [];

      const developerIds = rules.map(rule => toNumber(rule.targetId, 0)).filter(Boolean);
      const rows = await db
        .select({
          id: developers.id,
          name: developers.name,
          slug: developers.slug,
          logo: developers.logo,
          rating: developers.rating,
          city: developers.city,
          province: developers.province,
        })
        .from(developers)
        .where(and(inArray(developers.id, developerIds), eq(developers.status, 'approved')));

      const byId = new Map<number, any>();
      for (const row of rows) byId.set(toNumber(row.id, 0), row);

      return rules
        .map(rule => {
          const dev = byId.get(toNumber(rule.targetId, 0));
          if (!dev) return null;
          return {
            ...dev,
            isSponsored: true,
            sponsoredLabel: rule.sponsoredLabel,
            monetizationRuleId: rule.id,
            sponsoredRank: rule.ranking,
            serveRequestId: ctx.requestId,
          };
        })
        .filter(Boolean);
    }),

  getRecommendedAgents: publicProcedure
    .input(
      z.object({
        locationType: locationTypeSchema,
        locationId: z.number(),
        limit: z.number().min(1).max(8).default(4),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sessionKey = buildSessionKeyFromRequest({
        requestId: ctx.requestId,
        userId: ctx.user?.id,
        ipAddress: ctx.req.ip || null,
        userAgent: ctx.req.headers['user-agent'] || null,
      });

      const rules = await getEligibleLocationRules({
        targetType: 'recommended_agent',
        locationType: input.locationType,
        locationId: input.locationId,
        limit: input.limit,
        requestId: ctx.requestId,
        userId: ctx.user?.id ?? null,
        sessionKey,
        recordServe: true,
        contextType: 'agent',
      });

      if (!rules.length) return [];
      const db = await getDb();
      if (!db) return [];

      const agentIds = rules.map(rule => toNumber(rule.targetId, 0)).filter(Boolean);
      const rows = await db
        .select({
          id: agents.id,
          firstName: agents.firstName,
          lastName: agents.lastName,
          displayName: agents.displayName,
          profileImage: agents.profileImage,
          rating: agents.rating,
          totalSales: agents.totalSales,
          isVerified: agents.isVerified,
          agencyId: agencies.id,
          agencyName: agencies.name,
          agencyLogo: agencies.logo,
        })
        .from(agents)
        .leftJoin(agencies, eq(agents.agencyId, agencies.id))
        .where(and(inArray(agents.id, agentIds), eq(agents.status, 'approved')));

      const byId = new Map<number, any>();
      for (const row of rows) {
        byId.set(toNumber(row.id, 0), {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          displayName: row.displayName,
          profileImage: row.profileImage,
          rating: row.rating,
          totalSales: row.totalSales,
          isVerified: row.isVerified,
          agency: row.agencyId
            ? {
                id: row.agencyId,
                name: row.agencyName,
                logo: row.agencyLogo,
              }
            : null,
        });
      }

      return rules
        .map(rule => {
          const agent = byId.get(toNumber(rule.targetId, 0));
          if (!agent) return null;
          return {
            ...agent,
            isSponsored: true,
            sponsoredLabel: rule.sponsoredLabel,
            monetizationRuleId: rule.id,
            sponsoredRank: rule.ranking,
            serveRequestId: ctx.requestId,
          };
        })
        .filter(Boolean);
    }),

  recordRuleEvent: publicProcedure
    .input(
      z.object({
        ruleId: z.number(),
        eventType: z.enum(['served', 'click', 'lead']),
        contextType: z.enum(['hero', 'developer', 'agent', 'listing', 'feed', 'unknown']).optional(),
        contextId: z.number().optional(),
        locationType: locationTypeSchema.optional(),
        locationId: z.number().optional(),
        serveRequestId: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const attributionRequestId = input.serveRequestId || ctx.requestId;
      const sessionKey = buildSessionKeyFromRequest({
        requestId: attributionRequestId,
        userId: ctx.user?.id,
        ipAddress: ctx.req.ip || null,
        userAgent: ctx.req.headers['user-agent'] || null,
      });

      const result = await recordLocationRuleEvent({
        ruleId: input.ruleId,
        eventType: input.eventType,
        contextType: input.contextType,
        contextId: input.contextId,
        locationType: input.locationType || null,
        locationId: input.locationId ?? null,
        userId: ctx.user?.id ?? null,
        requestId: attributionRequestId,
        sessionKey,
        metadata: input.metadata || {},
      });

      return result;
    }),
});
