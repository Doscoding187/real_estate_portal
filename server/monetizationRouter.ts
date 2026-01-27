import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { db } from './db';
import { locationTargeting, developers, agents, agencies } from '../drizzle/schema';
import { and, eq, desc, gte, lte, or, isNull } from 'drizzle-orm';

export const monetizationRouter = router({
  createTargetingRule: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(['hero_ad', 'featured_developer', 'recommended_agent']),
        targetId: z.number(),
        locationType: z.enum(['province', 'city', 'suburb']),
        locationId: z.number(),
        ranking: z.number().default(0),
        status: z.enum(['active', 'scheduled', 'expired', 'paused']).default('scheduled'),
        metadata: z.any(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.insert(locationTargeting).values({
        ...input,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      return { success: true };
    }),

  getAllRules: protectedProcedure.query(async () => {
    const rules = await db
      .select()
      .from(locationTargeting)
      .orderBy(desc(locationTargeting.createdAt));
    return rules;
  }),

  getHeroAd: publicProcedure
    .input(
      z.object({
        locationType: z.enum(['province', 'city', 'suburb']),
        locationId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const now = new Date().toISOString();

      // Find active ad for this specific location
      // Logic:
      // 1. Match type and ID
      // 2. Status is active
      // 3. Current date is within start/end range
      // 4. Sort by ranking DESC (highest payer first)
      // 5. Take top 1

      const ads = await db
        .select()
        .from(locationTargeting)
        .where(
          and(
            eq(locationTargeting.targetType, 'hero_ad'),
            eq(locationTargeting.locationType, input.locationType),
            eq(locationTargeting.locationId, input.locationId),
            eq(locationTargeting.status, 'active'),
            // Handle date ranges (start <= now <= end)
            or(isNull(locationTargeting.startDate), lte(locationTargeting.startDate, now)),
            or(isNull(locationTargeting.endDate), gte(locationTargeting.endDate, now)),
          ),
        )
        .orderBy(desc(locationTargeting.ranking)) // Higher ranking = higher priority
        .limit(1);

      return ads[0] || null;
      return ads[0] || null;
    }),

  getFeaturedDevelopers: publicProcedure
    .input(
      z.object({
        locationType: z.enum(['province', 'city', 'suburb']),
        locationId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const now = new Date().toISOString();
      const results = await db
        .select({
          targeting: locationTargeting,
          developer: {
            id: developers.id,
            name: developers.name,
            slug: developers.slug,
            logo: developers.logo,
          },
        })
        .from(locationTargeting)
        .innerJoin(developers, eq(locationTargeting.targetId, developers.id))
        .where(
          and(
            eq(locationTargeting.targetType, 'featured_developer'),
            eq(locationTargeting.locationType, input.locationType),
            eq(locationTargeting.locationId, input.locationId),
            eq(locationTargeting.status, 'active'),
            or(isNull(locationTargeting.startDate), lte(locationTargeting.startDate, now)),
            or(isNull(locationTargeting.endDate), gte(locationTargeting.endDate, now)),
          ),
        )
        .orderBy(desc(locationTargeting.ranking))
        .limit(6);

      return results.map((r: any) => ({
        ...r.developer,
        ranking: r.targeting.ranking,
      }));
    }),

  getRecommendedAgents: publicProcedure
    .input(
      z.object({
        locationType: z.enum(['province', 'city', 'suburb']),
        locationId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const now = new Date().toISOString();
      const results = await db
        .select({
          targeting: locationTargeting,
          agent: {
            id: agents.id,
            firstName: agents.firstName,
            lastName: agents.lastName,
            profileImage: agents.profileImage,
            role: agents.role,
            totalSales: agents.totalSales,
            rating: agents.rating,
          },
          agency: {
            id: agencies.id,
            name: agencies.name,
            logo: agencies.logo,
          },
        })
        .from(locationTargeting)
        .innerJoin(agents, eq(locationTargeting.targetId, agents.id))
        .leftJoin(agencies, eq(agents.agencyId, agencies.id))
        .where(
          and(
            eq(locationTargeting.targetType, 'recommended_agent'),
            eq(locationTargeting.locationType, input.locationType),
            eq(locationTargeting.locationId, input.locationId),
            eq(locationTargeting.status, 'active'),
            or(isNull(locationTargeting.startDate), lte(locationTargeting.startDate, now)),
            or(isNull(locationTargeting.endDate), gte(locationTargeting.endDate, now)),
          ),
        )
        .orderBy(desc(locationTargeting.ranking))
        .limit(8);

      return results.map((r: any) => ({
        ...r.agent,
        agency: r.agency,
        ranking: r.targeting.ranking,
      }));
    }),
});
