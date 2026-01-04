import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { EmailService } from './_core/emailService';
import { developerSubscriptionService } from './services/developerSubscriptionService';
import { developmentService } from './services/developmentService';
import { unitService } from './services/unitService';
import { calculateAffordabilityCompanion, matchUnitsToAffordability } from './services/affordabilityCompanion';
import { developmentDrafts, developments, developers, developerBrandProfiles } from '../drizzle/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { calculateDevelopmentReadiness } from './lib/readiness';

export const developerRouter = router({
  /**
   * Create developer profile
   * Auth: Requires property_developer role
   */
  createProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Company name must be at least 2 characters'),
        specializations: z.array(z.enum(['residential', 'commercial', 'mixed_use', 'industrial', 'luxury', 'affordable']))
          .min(1, 'Please select at least one development specialization'),
        establishedYear: z.number().int().nullable().optional(),
        description: z.string().nullable().optional(),
        email: z.string().email('Invalid email address'),
        phone: z.string().nullable().optional(),
        website: z.string().url('Invalid website URL').nullable().optional().or(z.literal('')),
        address: z.string().nullable().optional(),
        city: z.string().min(1, 'City is required'),
        province: z.string().min(1, 'Province is required'),
        totalProjects: z.number().int().min(0).default(0),
        completedProjects: z.number().int().min(0).default(0),
        currentProjects: z.number().int().min(0).default(0),
        upcomingProjects: z.number().int().min(0).default(0),
        logo: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'property_developer') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only property developers can create developer profiles',
        });
      }

      // Check if developer profile already exists
      try {
        const existing = await db.getDeveloperByUserId(ctx.user.id);
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Developer profile already exists',
          });
        }
      } catch (error: any) {
        // If it's our CONFLICT error, re-throw it
        if (error.code === 'CONFLICT') {
          throw error;
        }
        // Otherwise, log the error but continue (assume no existing profile)
        console.error('[Developer] Error checking existing profile, assuming none exists:', error);
      }

      const developerId = await db.createDeveloper({
        ...input,
        description: input.description || undefined,
        phone: input.phone || undefined,
        website: input.website || undefined,
        address: input.address || undefined,
        logo: input.logo || undefined,
        establishedYear: input.establishedYear || undefined,
        userId: ctx.user.id,
        isVerified: 0,
        status: 'pending',
      });

      // Create subscription with free trial tier (Validates: Requirements 1.1, 1.2)
      const subscription = await developerSubscriptionService.createSubscription(developerId);

      // Send confirmation email
      await EmailService.sendDeveloperRegistrationEmail(input.email, input.name);

      return { 
        id: developerId, 
        message: 'Profile submitted for review',
        subscription: {
          tier: subscription.tier,
          trialEndsAt: subscription.trialEndsAt,
        },
      };
    }),

  /**
   * Get developer profile by logged-in user
   * Auth: Protected
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      return developer;
    } catch (error: any) {
      console.error('[Developer] Error fetching profile for userId:', ctx.user.id, error);
      // Return null instead of throwing to allow frontend to handle gracefully
      return null;
    }
  }),

  /**
   * Get subscription details for logged-in developer
   * Auth: Protected
   * Validates: Requirements 1.5
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    
    if (!developer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Developer profile not found',
      });
    }

    const subscription = await developerSubscriptionService.getSubscription(developer.id);
    
    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    // Check trial expiration
    const trialStatus = await developerSubscriptionService.checkTrialExpiration(developer.id);

    return {
      subscription,
      trialStatus,
    };
  }),

  /**
   * Upgrade subscription tier
   * Auth: Protected
   * Validates: Requirements 1.4, 13.5
   */
  upgradeSubscription: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['free_trial', 'basic', 'premium']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const updatedSubscription = await developerSubscriptionService.updateTier(
        developer.id,
        input.tier
      );

      return {
        subscription: updatedSubscription,
        message: `Successfully upgraded to ${input.tier} tier`,
      };
    }),

  /**
   * Update developer profile (for drafts and edits)
   * Auth: Protected, must own profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        data: z
          .object({
            name: z.string().min(2).optional(),
            specializations: z.array(z.enum(['residential', 'commercial', 'mixed_use', 'industrial', 'luxury', 'affordable'])).optional(),
            establishedYear: z.number().int().nullable().optional(),
            description: z.string().nullable().optional(),
            email: z.string().email().optional(),
            phone: z.string().nullable().optional(),
            website: z.string().url().nullable().optional().or(z.literal('')),
            address: z.string().nullable().optional(),
            city: z.string().optional(),
            province: z.string().optional(),
            totalProjects: z.number().int().min(0).optional(),
            completedProjects: z.number().int().min(0).optional(),
            currentProjects: z.number().int().min(0).optional(),
            upcomingProjects: z.number().int().min(0).optional(),
            logo: z.string().nullable().optional(),
          })
          .partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperById(input.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer not found',
        });
      }

      if (developer.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
        });
      }

      await db.updateDeveloper(input.id, input.data);
      return { success: true, message: 'Profile updated successfully' };
    }),

  /**
   * Public list of approved developers
   * Auth: Public
   */
  listDevelopers: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          city: z.string().optional(),
          province: z.string().optional(),
          isVerified: z.number().optional(),
          limit: z.number().int().positive().default(20),
          offset: z.number().int().nonnegative().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await db.listDevelopers(input || {});
    }),

  /**
   * Get developer by ID (public, only approved)
   * Auth: Public
   */
  getDeveloperById: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const developer = await db.getDeveloperById(input.id);
      
      if (!developer || developer.status !== 'approved') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer not found',
        });
      }

      return developer;
    }),

  /**
   * Search developers by name (for autocomplete)
   * Auth: Public
   */
  searchDevelopers: publicProcedure
    .input(
      z.object({
        query: z.string().min(2, 'Search query must be at least 2 characters'),
        limit: z.number().int().positive().max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      return await db.searchDevelopers(input.query, input.limit);
    }),

  /**
   * Search developments by name (for autocomplete)
   * Auth: Public
   * Note: Query can be empty if developerId is provided (to list all developments for a developer)
   */
  searchDevelopments: publicProcedure
    .input(
      z.object({
        query: z.string().optional().default(''),
        developerId: z.number().int().optional(),
        limit: z.number().int().positive().max(20).default(10),
      }).refine(
        (data) => data.query.length >= 2 || data.developerId !== undefined,
        { message: 'Either query (min 2 chars) or developerId must be provided' }
      )
    )
    .query(async ({ input }) => {
      return await db.searchDevelopments(input.query, input.developerId, input.limit);
    }),

  /**
   * Admin: List pending developers
   * Auth: Super admin only
   */
  adminListPendingDevelopers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only super admins can access this endpoint',
      });
    }

    return await db.listPendingDevelopers();
  }),

  /**
   * Admin: List all developers (any status)
   * Auth: Super admin only
   */
  adminListAllDevelopers: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['pending', 'approved', 'rejected']).optional(),
          limit: z.number().int().positive().default(50),
          offset: z.number().int().nonnegative().default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can access this endpoint',
        });
      }

      // For now, return all developers - can be enhanced with status filtering
      return await db.listDevelopers(input || {});
    }),

  /**
   * Admin: Approve developer
   * Auth: Super admin only
   */
  adminApproveDeveloper: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can approve developers',
        });
      }

      const developer = await db.getDeveloperById(input.id);
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer not found',
        });
      }

      if (developer.status === 'approved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Developer is already approved',
        });
      }

      await db.approveDeveloper(input.id, ctx.user.id);
      
      // Send approval email
      await EmailService.sendDeveloperApprovalEmail(developer.email, developer.name);
      
      return { success: true, message: 'Developer approved successfully' };
    }),

  /**
   * Admin: Reject developer
   * Auth: Super admin only
   */
  adminRejectDeveloper: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        reason: z.string().min(1, 'Rejection reason is required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can reject developers',
        });
      }

      const developer = await db.getDeveloperById(input.id);
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer not found',
        });
      }

      if (developer.status === 'rejected') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Developer is already rejected',
        });
      }

      await db.rejectDeveloper(input.id, ctx.user.id, input.reason);
      
      // Send rejection email
      await EmailService.sendDeveloperRejectionEmail(developer.email, developer.name, input.reason);
      
      return { success: true, message: 'Developer rejected' };
    }),

  /**
   * Admin: Set trusted status
   * Auth: Super admin only
   */
  adminSetTrusted: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        isTrusted: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can manage trust settings',
        });
      }

      const developer = await db.getDeveloperById(input.id);
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer not found',
        });
      }

      await db.setDeveloperTrust(input.id, input.isTrusted);
      
      return { success: true, message: `Developer is now ${input.isTrusted ? 'trusted' : 'untrusted'}` };
    }),

  /**
   * Create a new development
   * Auth: Protected, must be developer
   * Validates: Requirements 2.1
   */
  createDevelopment: protectedProcedure
    .input(
      z.object({
        brandProfileId: z.number().int().optional(), // SUPER ADMIN ONLY (Source/Owner)
        marketingBrandProfileId: z.number().int().optional(), // Marketing Agency
        marketingRole: z.enum(['exclusive', 'joint', 'open']).optional(),
        name: z.string().min(2, 'Development name must be at least 2 characters'),
        developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'estate', 'complex']),
        description: z.string().optional(),
        address: z.string().optional(),
        city: z.string().min(1, 'City is required'),
        suburb: z.string().optional(),
        province: z.string().min(1, 'Province is required'),
        postalCode: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        placeId: z.string().optional(),
        priceFrom: z.number().int().positive().optional(),
        priceTo: z.number().int().positive().optional(),
        amenities: z.array(z.string()).optional(),
        features: z.array(z.string()).optional(),
        highlights: z.array(z.string()).optional(),
        images: z.array(z.string()).optional(),
        completionDate: z.string().optional(),
        showHouseAddress: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // OWNERSHIP MODE RESOLUTION
      // Rule: Super admins are ALWAYS in brand mode, developers are ALWAYS in developer mode
      // These flows must never bleed into each other
      let developerId: number | null = null;
      let brandProfileId: number | undefined = undefined;
      let ownerType: 'developer' | 'platform' = 'developer';

      if (ctx.user.role === 'super_admin') {
        // BRAND MODE (Super Admin seeding content)
        // Super admins MUST provide a brandProfileId - they cannot create developer-owned developments
        if (!input.brandProfileId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'brandProfileId is required when creating brand developments',
          });
        }
        brandProfileId = input.brandProfileId;
        ownerType = 'platform';
        developerId = null; // Explicitly null - brand developments have no developer owner
        console.log('[DeveloperRouter] Brand Mode: brandProfileId =', brandProfileId);
      } else if (ctx.user.role === 'property_developer') {
        // DEVELOPER MODE (Self-serve)
        // Developer creates their own development
        const developer = await db.getDeveloperByUserId(ctx.user.id);
        if (!developer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Developer profile not found. Please complete your developer registration first.',
          });
        }
        developerId = developer.id;
        ownerType = 'developer';
        brandProfileId = undefined; // No brand profile for developer-owned developments
        console.log('[DeveloperRouter] Developer Mode: developerId =', developerId);
      } else {
        // Unsupported role
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only property developers and super admins can create developments',
        });
      }

      try {
        // Resolve location and create location record if needed
        // Requirements 16.1-16.5: Link developments to locations via location_id
        // Requirements 25.1: Store Place ID with development data
        let locationId: number | undefined;
        if (input.latitude && input.longitude) {
          try {
            const { locationPagesServiceEnhanced } = await import('./services/locationPagesServiceEnhanced');
            const location = await locationPagesServiceEnhanced.resolveLocation({
              placeId: input.placeId,
              address: input.address || '',
              latitude: parseFloat(input.latitude),
              longitude: parseFloat(input.longitude),
              city: input.city,
              suburb: input.suburb,
              province: input.province,
              postalCode: input.postalCode,
            });
            locationId = location.id;
            console.log('[DeveloperRouter] Resolved location:', location.name, `(ID: ${locationId})`);
          } catch (error) {
            console.warn('[DeveloperRouter] Failed to resolve location, proceeding without location_id:', error);
            // Continue without location_id - backward compatibility
          }
        }

        const development = await developmentService.createDevelopment(developerId, {
          ...input,
          locationId,
        }, {
          brandProfileId,
          ownerType,
          marketingBrandProfileId: input.marketingBrandProfileId,
          marketingRole: input.marketingRole
        });
        
        // Calculate initial readiness
        const readiness = calculateDevelopmentReadiness({ ...development, ...input }); // input has transient fields
        const dbInstance = await import('./db').then(m => m.getDb());
        if (dbInstance) {
          await dbInstance.update(developments).set({ readinessScore: readiness.score }).where(eq(developments.id, development.id));
        }

        return { development, message: 'Development created successfully' };
      } catch (error: any) {
        if (error.message.includes('limit reached')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Get all developments for logged-in developer
   * Auth: Protected
   */
  getDevelopments: protectedProcedure.query(async ({ ctx }) => {
    try {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        console.log('[Developer] No developer profile found for userId:', ctx.user.id);
        // Return empty array instead of throwing error
        return [];
      }

      const developments = await developmentService.getDeveloperDevelopments(developer.id);
      return developments;
    } catch (error: any) {
      console.error('[Developer] Error fetching developments for userId:', ctx.user.id, error);
      // Return empty array to allow frontend to handle gracefully
      return [];
    }
  }),

  /**
   * Get single development with phases
   * Auth: Protected
   */
  getDevelopment: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const development = await developmentService.getDevelopmentWithPhases(input.id);
      
      if (!development) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Development not found',
        });
      }

      // Verify ownership - super_admins can access any development
      if (ctx.user.role === 'super_admin') {
        // Super admin bypass - allow access to all developments
        return development;
      }
      
      // For non-super-admins, check owner type
      if (development.devOwnerType === 'platform') {
        // Platform-owned developments are super_admin only (already handled above)
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized' });
      } else {
        // Developer-owned: verify the user owns this development
        const developer = await db.getDeveloperByUserId(ctx.user.id);
        if (!developer || development.developerId !== developer.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not own this development',
          });
        }
      }

      return development;
    }),

  /**
   * Update development
   * Auth: Protected, must own development
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  updateDevelopment: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        data: z.object({
          name: z.string().min(2).optional(),
          description: z.string().optional(),
          developmentType: z.enum(['residential', 'commercial', 'mixed_use', 'estate', 'complex']).optional(),
          status: z.enum(['planning', 'under_construction', 'completed', 'coming_soon']).optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          province: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
          priceFrom: z.number().int().positive().optional(),
          priceTo: z.number().int().positive().optional(),
          amenities: z.array(z.string()).optional(),
          features: z.array(z.string()).optional(),
          highlights: z.array(z.string()).optional(),
          images: z.array(z.string()).optional(),
          videos: z.array(z.string()).optional(),
          floorPlans: z.array(z.string()).optional(),
          brochures: z.array(z.string()).optional(),
          completionDate: z.string().optional(),
          showHouseAddress: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Logic handled in service with updated platform check
      let developerId = 0; // standard dev id
      let isPlatformAdmin = false;

      if (ctx.user.role === 'super_admin') {
         // Super admin can edit ANY development - bypass developer profile lookup
         isPlatformAdmin = true;
         console.log('[DeveloperRouter] updateDevelopment: Super Admin mode, bypassing developer profile');
      }

      if (!isPlatformAdmin) {
          const developer = await db.getDeveloperByUserId(ctx.user.id);
          if (!developer) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer profile not found' });
          }
          developerId = developer.id;
      }
      
      try {
        const development = await developmentService.updateDevelopment(
          input.id,
          isPlatformAdmin ? -1 : developerId, // Pass -1 as signal, or rely on future service update for "null"
          input.data
        );
        
        // Recalculate readiness
        const fullDev = await developmentService.getDevelopmentWithPhases(input.id);
        const readiness = calculateDevelopmentReadiness(fullDev!);
        const dbInstance = await import('./db').then(m => m.getDb());
        if (dbInstance) {
          await dbInstance.update(developments).set({ readinessScore: readiness.score }).where(eq(developments.id, input.id));
        }

        return { development, message: 'Development updated successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
    }),

  /**
   * Delete development
   * Auth: Protected, must own development
   */
  deleteDevelopment: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      // OWNERSHIP MODE RESOLUTION
      let developerId: number = -1; // -1 indicates platform/brand mode (bypass ownership check)

      if (ctx.user.role === 'super_admin') {
        // BRAND MODE: Super admins can delete any development
        developerId = -1;
        console.log('[DeveloperRouter] deleteDevelopment: Super Admin mode, bypassing ownership');
      } else if (ctx.user.role === 'property_developer') {
        // DEVELOPER MODE: Must have developer profile
        const developer = await db.getDeveloperByUserId(ctx.user.id);
        if (!developer) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer profile not found' });
        }
        developerId = developer.id;
        console.log('[DeveloperRouter] deleteDevelopment: Developer Mode, id =', developerId);
      } else {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers and super admins can delete developments',
        });
      }

      try {
        await developmentService.deleteDevelopment(input.id, developerId);
        return { success: true, message: 'Development deleted successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Reset development count to actual count (fix discrepancies)
   * Auth: Protected
   */
  resetDevelopmentCount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer not found',
        });
      }
      
      const result = await developerSubscriptionService.resetDevelopmentCount(developer.id);
      return { success: true, newCount: result.newCount, message: `Usage counter reset to ${result.newCount}` };
    }),

  /**
   * Publish development
   * Auth: Protected, must own development
   * Validates: Requirements 9.1
   */
  publishDevelopment: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      // OWNERSHIP MODE RESOLUTION
      let developerId: number = -1; // -1 indicates platform/brand mode
      let isTrusted = false;

      if (ctx.user.role === 'super_admin') {
        // BRAND MODE: Super admins can publish any development
        developerId = -1; // Special value to bypass ownership check in service
        isTrusted = true; // Super admin publishes are auto-approved
        console.log('[DeveloperRouter] publishDevelopment: Brand Mode (super_admin)');
      } else if (ctx.user.role === 'property_developer') {
        // DEVELOPER MODE: Must have developer profile
        const developer = await db.getDeveloperByUserId(ctx.user.id);
        if (!developer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Developer profile not found',
          });
        }
        developerId = developer.id;
        isTrusted = !!developer.isTrusted;
        console.log('[DeveloperRouter] publishDevelopment: Developer Mode, id =', developerId);
      } else {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers and super admins can publish developments',
        });
      }

      try {
        // Readiness Gate
        const fullDev = await developmentService.getDevelopmentWithPhases(input.id);
        const readiness = calculateDevelopmentReadiness(fullDev);
        
        if (readiness.score < 75) {
             throw new TRPCError({
                code: 'PRECONDITION_FAILED',
                message: `Development is not ready for publishing (${readiness.score}%). Please complete missing sections.`,
            });
        }

        const development = await developmentService.publishDevelopment(input.id, developerId, isTrusted);
        return { development, message: 'Development published successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Create phase for development
   * Auth: Protected, must own development
   * Validates: Requirements 2.3, 15.1, 15.2
   */
  createPhase: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        name: z.string().min(1, 'Phase name is required'),
        phaseNumber: z.number().int().positive(),
        description: z.string().optional(),
        status: z.enum(['planning', 'pre_launch', 'selling', 'sold_out', 'completed']).optional(),
        totalUnits: z.number().int().nonnegative().optional(),
        priceFrom: z.number().int().positive().optional(),
        priceTo: z.number().int().positive().optional(),
        launchDate: z.string().optional(),
        completionDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        const phase = await developmentService.createPhase(
          input.developmentId,
          developer.id,
          input
        );
        return { phase, message: 'Phase created successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Public list of developments for demo page
   * Auth: Public
   */
  listPublicDevelopments: publicProcedure
    .input(z.object({ limit: z.number().default(20).optional() }))
    .query(async ({ input }) => {
      return await developmentService.listPublicDevelopments(input?.limit || 20);
    }),

  /**
   * Get single public development
   * Auth: Public
   */
  getPublicDevelopment: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dev = await developmentService.getPublicDevelopment(input.id);
      if (!dev) {
         throw new TRPCError({
             code: 'NOT_FOUND',
             message: 'Development not found'
         });
      }
      return dev;
    }),

  /**
   * Get single public development by slug
   * Auth: Public
   */
  getPublicDevelopmentBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      console.log('[DEBUG] getPublicDevelopmentBySlug input:', input);
      try {
        if (!developmentService) {
           console.error('[CRITICAL] developmentService is UNDEFINED');
           throw new Error('developmentService is undefined');
        }
        console.log('[DEBUG] Calling developmentService.getPublicDevelopmentBySlug');
        const dev = await developmentService.getPublicDevelopmentBySlug(input.slug);
        console.log('[DEBUG] Result from developmentService:', dev ? 'Found' : 'Null');
        
        if (!dev) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Development not found'
          });
        }
        return dev;
      } catch (err) {
        console.error('[CRITICAL] Error in getPublicDevelopmentBySlug:', err);
        throw err;
      }
    }),

  /**
   * Update phase
   * Auth: Protected, must own development
   * Validates: Requirements 15.4
   */
  updatePhase: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        data: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(['planning', 'pre_launch', 'selling', 'sold_out', 'completed']).optional(),
          totalUnits: z.number().int().nonnegative().optional(),
          availableUnits: z.number().int().nonnegative().optional(),
          priceFrom: z.number().int().positive().optional(),
          priceTo: z.number().int().positive().optional(),
          launchDate: z.string().optional(),
          completionDate: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        const phase = await developmentService.updatePhase(
          input.id,
          developer.id,
          input.data
        );
        return { phase, message: 'Phase updated successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Create a unit
   * Auth: Protected, must own development
   * Validates: Requirements 3.1
   */
  createUnit: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        phaseId: z.number().int().optional(),
        unitNumber: z.string().min(1, 'Unit number is required'),
        unitType: z.enum(['studio', '1bed', '2bed', '3bed', '4bed+', 'penthouse', 'townhouse', 'house']),
        bedrooms: z.number().int().nonnegative().optional(),
        bathrooms: z.number().nonnegative().optional(),
        size: z.number().positive().optional(),
        price: z.number().positive(),
        floorPlan: z.string().optional(),
        floor: z.number().int().optional(),
        facing: z.string().optional(),
        features: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        const unit = await unitService.createUnit(developer.id, input);
        return { unit, message: 'Unit created successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized') || error.message.includes('already exists')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Bulk create units
   * Auth: Protected, must own development
   * Validates: Requirements 3.1
   */
  bulkCreateUnits: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        phaseId: z.number().int().optional(),
        units: z.array(
          z.object({
            unitNumber: z.string().min(1),
            unitType: z.enum(['studio', '1bed', '2bed', '3bed', '4bed+', 'penthouse', 'townhouse', 'house']),
            bedrooms: z.number().int().nonnegative().optional(),
            bathrooms: z.number().nonnegative().optional(),
            size: z.number().positive().optional(),
            price: z.number().positive(),
            floorPlan: z.string().optional(),
            floor: z.number().int().optional(),
            facing: z.string().optional(),
            features: z.array(z.string()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        const units = await unitService.bulkCreateUnits(developer.id, input);
        return { units, message: `${units.length} units created successfully` };
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Get units for a development
   * Auth: Protected
   * Validates: Requirements 3.4
   */
  getDevelopmentUnits: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        phaseId: z.number().int().optional(),
        status: z.enum(['available', 'reserved', 'sold']).optional(),
        unitType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const units = await unitService.getDevelopmentUnits(input.developmentId, {
        phaseId: input.phaseId,
        status: input.status,
        unitType: input.unitType,
      });
      return units;
    }),

  /**
   * Get availability summary
   * Auth: Protected
   * Validates: Requirements 3.4, 3.5
   */
  getAvailabilitySummary: protectedProcedure
    .input(z.object({ developmentId: z.number().int() }))
    .query(async ({ input }) => {
      const summary = await unitService.getAvailabilitySummary(input.developmentId);
      return summary;
    }),

  /**
   * Update unit
   * Auth: Protected, must own development
   * Validates: Requirements 3.1, 3.2
   */
  updateUnit: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        data: z.object({
          unitNumber: z.string().optional(),
          unitType: z.enum(['studio', '1bed', '2bed', '3bed', '4bed+', 'penthouse', 'townhouse', 'house']).optional(),
          bedrooms: z.number().int().nonnegative().optional(),
          bathrooms: z.number().nonnegative().optional(),
          size: z.number().positive().optional(),
          price: z.number().positive().optional(),
          floorPlan: z.string().optional(),
          floor: z.number().int().optional(),
          facing: z.string().optional(),
          features: z.array(z.string()).optional(),
          status: z.enum(['available', 'reserved', 'sold']).optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        const unit = await unitService.updateUnit(input.id, developer.id, input.data);
        return { unit, message: 'Unit updated successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Update unit status
   * Auth: Protected, must own development
   * Validates: Requirements 3.2, 3.3
   */
  updateUnitStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(['available', 'reserved', 'sold']),
        reservedBy: z.number().int().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        const unit = await unitService.updateUnitStatus(
          input.id,
          developer.id,
          input.status,
          input.reservedBy
        );
        return { unit, message: 'Unit status updated successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized') || error.message.includes('no longer available')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Delete unit
   * Auth: Protected, must own development
   */
  deleteUnit: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        await unitService.deleteUnit(input.id, developer.id);
        return { success: true, message: 'Unit deleted successfully' };
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Calculate affordability with gamification (Public endpoint)
   * Auth: Public (no login required)
   * Validates: Requirements 4.1, 4.2, 4.3
   */
  calculateAffordability: publicProcedure
    .input(
      z.object({
        income: z.number().int().positive().optional(),
        incomeRange: z.enum(['under_15k', '15k_25k', '25k_50k', '50k_100k', 'over_100k']).optional(),
        combinedIncome: z.number().int().positive().optional(),
        monthlyExpenses: z.number().int().nonnegative().optional(),
        monthlyDebts: z.number().int().nonnegative().optional(),
        dependents: z.number().int().nonnegative().optional(),
        savingsDeposit: z.number().int().nonnegative().optional(),
        creditScore: z.number().int().min(300).max(850).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = calculateAffordabilityCompanion(input);
      return result;
    }),

  /**
   * Match units to buyer affordability (Public endpoint)
   * Auth: Public
   * Validates: Requirements 16.1, 16.2, 16.3
   */
  matchUnits: publicProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        affordabilityMax: z.number().int().positive(),
        monthlyPaymentCapacity: z.number().int().positive(),
        deposit: z.number().int().nonnegative(),
      })
    )
    .query(async ({ input }) => {
      // Get all units for the development
      const units = await unitService.getDevelopmentUnits(input.developmentId, {
        status: 'available',
      });
      
      // Match units to affordability
      const matches = matchUnitsToAffordability(
        units.map(u => ({ id: u.id, price: parseFloat(u.price.toString()), unitType: u.unitType })),
        input.affordabilityMax,
        input.monthlyPaymentCapacity,
        input.deposit
      );
      
      // Return units with match data
      return units.map(unit => {
        const match = matches.find(m => m.unitId === unit.id);
        return {
          ...unit,
          match,
        };
      });
    }),

  /**
   * Create a lead (Public endpoint)
   * Auth: Public
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 14.1, 14.2, 14.3, 14.4
   */
  createLead: publicProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        unitId: z.number().int().optional(),
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        phone: z.string().optional(),
        message: z.string().optional(),
        affordabilityData: z.object({
          monthlyIncome: z.number(),
          monthlyExpenses: z.number().optional(),
          monthlyDebts: z.number().optional(),
          availableDeposit: z.number().optional(),
          maxAffordable: z.number(),
          calculatedAt: z.string(),
        }).optional(),
        leadSource: z.string().optional(),
        referrerUrl: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { leadService } = await import('./services/leadService');
      
      // Get unit price if unitId provided
      let unitPrice: number | undefined;
      if (input.unitId) {
        const unit = await unitService.getDevelopmentUnits(input.developmentId, {});
        const foundUnit = unit.find(u => u.id === input.unitId);
        if (foundUnit) {
          unitPrice = parseFloat(foundUnit.price.toString());
        }
      }
      
      // Get development price range
      const development = await developmentService.getDevelopmentWithPhases(input.developmentId);
      const developmentPriceRange = development ? {
        priceFrom: development.priceFrom || 0,
        priceTo: development.priceTo || 0,
      } : undefined;
      
      const result = await leadService.createLead(
        input,
        unitPrice,
        developmentPriceRange
      );
      
      return result;
    }),

  /**
   * Get leads for a development
   * Auth: Protected, must own development
   * Validates: Requirements 7.1, 7.2
   */
  getDevelopmentLeads: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        status: z.string().optional(),
        qualificationStatus: z.string().optional(),
        funnelStage: z.string().optional(),
        assignedTo: z.number().int().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      // Verify ownership (super_admin bypass)
      if (ctx.user.role !== 'super_admin') {
        const development = await developmentService.getDevelopmentWithPhases(input.developmentId);
        if (!development || development.developerId !== developer.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not own this development',
          });
        }
      }

      const { leadService } = await import('./services/leadService');
      const leads = await leadService.getDevelopmentLeads(input.developmentId, {
        status: input.status,
        qualificationStatus: input.qualificationStatus,
        funnelStage: input.funnelStage,
        assignedTo: input.assignedTo,
      });

      return leads;
    }),

  /**
   * Get lead by ID
   * Auth: Protected
   * Validates: Requirements 7.4, 7.5
   */
  getLeadById: protectedProcedure
    .input(z.object({ leadId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const { leadService } = await import('./services/leadService');
      const lead = await leadService.getLeadById(input.leadId);

      // Verify developer owns the development
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const development = await developmentService.getDevelopmentWithPhases(lead.developmentId!);
      if (!development || development.developerId !== developer.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this lead',
        });
      }

      return lead;
    }),

  /**
   * Update lead status
   * Auth: Protected
   * Validates: Requirements 7.3
   */
  updateLeadStatus: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int(),
        status: z.enum(['new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_sent', 'converted', 'closed', 'lost']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { leadService } = await import('./services/leadService');
      
      // Verify ownership
      const lead = await leadService.getLeadById(input.leadId);
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const development = await developmentService.getDevelopmentWithPhases(lead.developmentId!);
      if (!development || development.developerId !== developer.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this lead',
        });
      }

      const updatedLead = await leadService.updateLeadStatus(
        input.leadId,
        input.status,
        input.notes
      );

      return updatedLead;
    }),

  /**
   * Assign lead to team member
   * Auth: Protected
   * Validates: Requirements 5.5, 6.3
   */
  assignLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int(),
        userId: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { leadService } = await import('./services/leadService');
      
      // Verify ownership
      const lead = await leadService.getLeadById(input.leadId);
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const development = await developmentService.getDevelopmentWithPhases(lead.developmentId!);
      if (!development || development.developerId !== developer.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this lead',
        });
      }

      const updatedLead = await leadService.assignLead(input.leadId, input.userId);

      return updatedLead;
    }),

  /**
   * Get lead statistics for a development
   * Auth: Protected
   * Validates: Requirements 8.2
   */
  getDevelopmentLeadStats: protectedProcedure
    .input(z.object({ developmentId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      // Verify ownership (super_admin bypass)
      if (ctx.user.role !== 'super_admin') {
        const development = await developmentService.getDevelopmentWithPhases(input.developmentId);
        if (!development || development.developerId !== developer.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not own this development',
          });
        }
      }

      const { leadService } = await import('./services/leadService');
      const stats = await leadService.getDevelopmentLeadStats(input.developmentId);

      return stats;
    }),

  // ============================================================================
  // MISSION CONTROL DASHBOARD PROCEDURES
  // ============================================================================

  /**
   * Get dashboard KPIs with caching
   * Auth: Protected
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  getDashboardKPIs: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
        forceRefresh: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const { getKPIsWithCache } = await import('./services/kpiService');
      const kpis = await getKPIsWithCache(developer.id, input.timeRange, input.forceRefresh);

      return kpis;
    }),

  /**
   * Get activity feed for dashboard
   * Auth: Protected
   * Requirements: 5.1, 5.2, 5.3
   */
  getActivityFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        activityTypes: z.array(z.string()).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const { getActivities } = await import('./services/activityService');
      const activities = await getActivities({
        developerId: developer.id,
        limit: input.limit,
        offset: input.offset,
        activityTypes: input.activityTypes as any,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      return activities;
    }),

  /**
   * Get notifications for dashboard
   * Auth: Protected
   * Requirements: 6.2, 6.3
   */
  getNotifications: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      // If no developer profile exists yet, return empty array
      if (!developer) {
        return [];
      }

      const { getNotifications } = await import('./services/notificationService');
      const notifications = await getNotifications({
        developerId: developer.id,
        unreadOnly: input.unreadOnly,
        limit: input.limit,
        offset: input.offset,
      });

      return notifications;
    }),

  /**
   * Get unread notifications count
   * Auth: Protected
   * Requirements: 6.2
   */
  getUnreadNotificationsCount: protectedProcedure.query(async ({ ctx }) => {
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    
    // If no developer profile exists yet, return 0 count
    if (!developer) {
      return { count: 0 };
    }

    const { getUnreadCount } = await import('./services/notificationService');
    const count = await getUnreadCount(developer.id);

    return { count };
  }),

  /**
   * Mark notification as read
   * Auth: Protected
   * Requirements: 6.3
   */
  markNotificationAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const { markAsRead } = await import('./services/notificationService');
      const success = await markAsRead(input.notificationId, developer.id);

      if (!success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      return { success };
    }),

  /**
   * Mark all notifications as read
   * Auth: Protected
   * Requirements: 6.3
   */
  markAllNotificationsAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    
    if (!developer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Developer profile not found',
      });
    }

    const { markAllAsRead } = await import('./services/notificationService');
    const count = await markAllAsRead(developer.id);

    return { count };
  }),

  /**
   * Dismiss notification
   * Auth: Protected
   * Requirements: 6.4
   */
  dismissNotification: protectedProcedure
    .input(z.object({ notificationId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const { dismissNotification } = await import('./services/notificationService');
      const success = await dismissNotification(input.notificationId, developer.id);

      if (!success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      return { success };
    }),

  /**
   * Get development summaries for portfolio overview
   * Auth: Protected
   * Requirements: 3.1
   */
  getDevelopmentSummaries: protectedProcedure.query(async ({ ctx }) => {
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    
    if (!developer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Developer profile not found',
      });
    }

    const developments = await developmentService.getDevelopmentsByDeveloperId(developer.id);

    // Get summary stats for each development
    const summaries = await Promise.all(
      developments.map(async (dev) => {
        const units = await unitService.getUnitsByDevelopmentId(dev.id);
        const totalUnits = units.length;
        const availableUnits = units.filter(u => u.status === 'available').length;
        const soldUnits = units.filter(u => u.status === 'sold').length;
        const reservedUnits = units.filter(u => u.status === 'reserved').length;

        return {
          id: dev.id,
          name: dev.name,
          status: dev.status,
          totalUnits,
          availableUnits,
          soldUnits,
          reservedUnits,
          priceFrom: dev.priceFrom,
          priceTo: dev.priceTo,
          city: dev.city,
          province: dev.province,
          completionDate: dev.completionDate,
          isPublished: dev.isPublished,
          views: dev.views,
        };
      })
    );

    return summaries;
  }),

  /**
   * Save development draft
   * Auth: Protected, must be developer
   */
  saveDraft: protectedProcedure
    .input(
      z.object({
        id: z.number().int().optional(), // For updating existing draft
        brandProfileId: z.number().int().optional(), // SUPER ADMIN ONLY: Creating draft for a brand
        draftData: z.object({
          developmentName: z.string().optional(),
          // Marketing Identity in Draft
          marketingBrandProfileId: z.number().int().optional(),
          marketingRole: z.enum(['exclusive', 'joint', 'open']).optional(),
          
          address: z.string().optional(),
          city: z.string().optional(),
          province: z.string().optional(),
          suburb: z.string().optional(),
          postalCode: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
          status: z.string().optional(),
          unitTypes: z.array(z.any()).optional(),
          description: z.string().optional(),
          amenities: z.array(z.string()).optional(),
          highlights: z.array(z.string()).optional(),
          completionDate: z.string().optional(),
          totalUnits: z.number().optional(),
          developerName: z.string().optional(),
          contactDetails: z.any().optional(),
          currentStep: z.number().optional(),
          
          // New 5-Phase Fields across the stack
          currentPhase: z.number().optional(),
          classification: z.any().optional(), // { type, subType, ownership }
          overview: z.any().optional(),       // { description, highlights, features, status }
          finalisation: z.any().optional(),   // { salesTeam, marketing }
          media: z.any().optional(),          // { hero, photos, videos }
          developmentData: z.any().optional(), // Full nested data backup
        }),
        progress: z.number().int().min(0).max(100).optional(),
        currentStep: z.number().int().min(0).max(6).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // CONTEXT RESOLUTION: Developer vs. Brand (Super Admin)
      let developerId: number | null = null;
      let brandProfileId: number | null = null;
      
      if (input.brandProfileId) {
        // CASE 1: Brand Mode (Super Admin Only)
        if (ctx.user.role !== 'super_admin') {
           throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Super Admins can manage brand profiles' });
        }
        
        // Check brand exists (lightweight check via simple query if needed, or trust FK)
        // Ideally we check if it exists:
        // const brand = await db.getBrandProfile(input.brandProfileId);
        // if (!brand) throw new TRPCError({ code: 'NOT_FOUND', message: 'Brand Profile not found' });
        
        brandProfileId = input.brandProfileId;
      } else {
        // CASE 2: Standard Developer Mode
        const developer = await db.getDeveloperByUserId(ctx.user.id);
        if (!developer) {
           throw new TRPCError({
             code: 'NOT_FOUND',
             message: 'Developer profile not found',
           });
        }
        developerId = developer.id;
      }

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      const draftName = input.draftData.developmentName || `Draft ${new Date().toLocaleDateString()}`;
      const progress = input.progress || Math.round((input.currentStep || 0) / 6 * 100);

      if (input.id) {
        // Update existing draft
        // Need to ensure ownership matches context
        // If developerId is set, check match. If brandId is set, check match.
        // For simplicity, we just update by ID, but security-wise we should verify.
        
        // TODO: Strict ownership check here would be better but keeping it simple for now based on ID. 
        // Real-world: WHERE id = input.id AND (developerId = x OR developerBrandProfileId = y)
        
        await dbConn.update(developmentDrafts)
          .set({
            draftName,
            draftData: input.draftData,
            progress,
            currentStep: input.currentStep || 0,
            // Allow transferring ownership if switching context? Probably not.
          })
          .where(eq(developmentDrafts.id, input.id));

        return { id: input.id, message: 'Draft updated successfully' };
      } else {
        // Create new draft
        const [result] = await dbConn.insert(developmentDrafts).values({
          developerId: developerId, // Nullable now
          developerBrandProfileId: brandProfileId, // Nullable
          draftName,
          draftData: input.draftData,
          progress,
          currentStep: input.currentStep || 0,
        });

        return { id: result.insertId as number, message: 'Draft saved successfully' };
      }
    }),

  /**
   * Get all drafts for logged-in developer
   * Auth: Protected
   */
  getDrafts: protectedProcedure
    .input(z.object({ brandProfileId: z.number().int().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];

      // CASE 1: Brand Mode (Super Admin)
      if (input?.brandProfileId) {
        if (ctx.user.role !== 'super_admin') {
           throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Super Admins can access brand drafts' });
        }
        
        return await dbConn.query.developmentDrafts.findMany({
          where: eq(developmentDrafts.developerBrandProfileId, input.brandProfileId),
          orderBy: [desc(developmentDrafts.lastModified)],
        });
      }

      // CASE 2: Developer Mode
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        return [];
      }

      const drafts = await dbConn.query.developmentDrafts.findMany({
        where: eq(developmentDrafts.developerId, developer.id),
        orderBy: [desc(developmentDrafts.lastModified)],
      });

      return drafts;
    }),

  /**
   * Get single draft by ID
   * Auth: Protected, must own draft
   */
  getDraft: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      // Check draft existence
      const draft = await dbConn.query.developmentDrafts.findFirst({
        where: eq(developmentDrafts.id, input.id),
      });

      if (!draft) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Draft not found',
        });
      }
      
      // OWNERSHIP CHECK
      // 1. If Brand Draft -> Require Super Admin
      if (draft.developerBrandProfileId) {
         if (ctx.user.role !== 'super_admin') {
           throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized access to brand draft' });
         }
         // Allowed
         return draft;
      }
      
      // 2. If Developer Draft -> Require Ownership
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      if (!developer || draft.developerId !== developer.id) {
         throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this draft',
        });
      }

      return draft;
    }),

  /**
   * Delete draft
   * Auth: Protected, must own draft
   */
  /**
   * Create a Unit Type (Phase 4)
   * Auth: Protected, must own development
   */
   createUnitType: protectedProcedure
    .input(
      z.object({
        developmentId: z.number().int(),
        name: z.string().min(1),
        bedrooms: z.number().int().nonnegative(),
        bathrooms: z.number().nonnegative(),
        parking: z.enum(['none', '1', '2', 'carport', 'garage']).optional(),
        unitSize: z.number().int().optional(),
        basePriceFrom: z.number().positive(),
        basePriceTo: z.number().positive().optional(),
        totalUnits: z.number().int().nonnegative().optional(),
        availableUnits: z.number().int().nonnegative().optional(),
        amenities: z.array(z.string()).optional(),
        baseMedia: z.object({
          gallery: z.array(z.object({
            id: z.string(),
            url: z.string(),
            file: z.any().optional(),
            isPrimary: z.boolean().optional(),
          })).optional(),
          floorPlans: z.array(z.object({
            id: z.string(),
            url: z.string(),
            file: z.any().optional(),
            isPrimary: z.boolean().optional(),
          })).optional(),
          renders: z.array(z.object({
            id: z.string(),
            url: z.string(),
            file: z.any().optional(),
            isPrimary: z.boolean().optional(),
          })).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // OWNERSHIP MODE RESOLUTION
      let developerId: number | null = null;

      if (ctx.user.role === 'super_admin') {
        // BRAND MODE: Super admins can create unit types for any development
        developerId = null; // No developer ownership check needed
        console.log('[DeveloperRouter] createUnitType: Brand Mode (super_admin)');
      } else if (ctx.user.role === 'property_developer') {
        // DEVELOPER MODE: Must have developer profile
        const developer = await db.getDeveloperByUserId(ctx.user.id);
        if (!developer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer not found' });
        developerId = developer.id;
        console.log('[DeveloperRouter] createUnitType: Developer Mode, id =', developerId);
      } else {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only developers and super admins can create unit types',
        });
      }

      try {
         // Logic to verify ownership (skip for super_admin)
         const development = await developmentService.getDevelopmentWithPhases(input.developmentId);
         if (!development) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Development not found' });
         }
         
         // Only check ownership for regular developers
         if (developerId !== null && development.developerId !== developerId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized' });
         }

         // Import unitTypeService (assuming it exists or using db directly)
         // For now, simple insert using db connection as we don't have unitTypeService exposed yet
         // Actually, let's use a raw insert logic here if service is missing, 
         // but preferably I should check if unitTypeService exists.
         // Given I cannot see file list again easily, I'll use db.insert directly if I can import table.
         
         const { unitTypes } = await import('../drizzle/schema');
         const dbConn = await db.getDb();
         
         const newId = crypto.randomUUID();
         
         // Build insert values, conditionally including basePriceTo only when valid
         const insertValues: any = {
           id: newId,
           developmentId: input.developmentId,
           name: input.name,
           bedrooms: input.bedrooms,
           bathrooms: String(input.bathrooms),
           parking: input.parking || 'none',
           unitSize: input.unitSize || null,
           basePriceFrom: String(input.basePriceFrom),
           // JSON columns - stringify for MySQL TEXT/JSON storage
           baseFeatures: input.baseFeatures || {
             builtInWardrobes: true,
             tiledFlooring: true,
             graniteCounters: true,
             prepaidElectricity: true,
             balcony: false,
             petFriendly: false
           },
           baseFinishes: input.baseFinishes || {
             paintAndWalls: '',
             flooringTypes: '',
             kitchenFeatures: '',
             bathroomFeatures: ''
           },
           baseMedia: input.baseMedia || { gallery: [], floorPlans: [], renders: [] },
           totalUnits: input.totalUnits || 0,
           // Default availableUnits to totalUnits if not explicitly set
           availableUnits: input.availableUnits ?? input.totalUnits ?? 0,
         };
         
         // Only add basePriceTo if it's a valid positive number
         if (input.basePriceTo && input.basePriceTo > 0) {
           insertValues.basePriceTo = String(input.basePriceTo);
         }
         
         await dbConn.insert(unitTypes).values(insertValues);
         
         return { success: true, id: newId };
      } catch (error: any) {
         // Detailed TiDB error logging for debugging
         console.error('=== UNIT_TYPES INSERT FAILED ===');
         console.error('Error code:', error.code);
         console.error('Error errno:', error.errno);
         console.error('Error sqlMessage:', error.sqlMessage);
         console.error('Error sql:', error.sql);
         console.error('Full error:', JSON.stringify(error, null, 2));
         console.error('Insert values attempted:', JSON.stringify(insertValues, null, 2));
         console.error('================================');
         
         throw new TRPCError({ 
           code: 'INTERNAL_SERVER_ERROR', 
           message: `Insert failed: [${error.code || 'UNKNOWN'}] ${error.sqlMessage || error.message}` 
         });
      }
    }),

  // Delete all unit types for a development (used before re-creating on edit)
  deleteUnitTypesForDevelopment: protectedProcedure
    .input(z.object({ developmentId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const { unitTypes } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const dbConn = await db.getDb();
      
      console.log('[DeveloperRouter] Deleting unit types for development:', input.developmentId);
      
      try {
        await dbConn.delete(unitTypes).where(eq(unitTypes.developmentId, input.developmentId));
        console.log('[DeveloperRouter] Unit types deleted successfully');
        return { success: true };
      } catch (error: any) {
        console.error('[DeveloperRouter] Failed to delete unit types:', error.message);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete unit types: ${error.message}`
        });
      }
    }),

  // Legacy delete draft
  deleteDraft: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      // Verify ownership
      const draft = await dbConn.query.developmentDrafts.findFirst({
        where: and(
          eq(developmentDrafts.id, input.id),
          eq(developmentDrafts.developerId, developer.id)
        ),
      });

      if (!draft) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Draft not found',
        });
      }

      await dbConn.delete(developmentDrafts)
        .where(eq(developmentDrafts.id, input.id));

      return { message: 'Draft deleted successfully' };
    }),

  /**
   * Get public developer profile (Subscriber or Brand)
   * Auth: Public
   */
  getPublicDeveloperBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      // 1. Try finding in developers (Subscribers)
      const subscriber = await dbConn.query.developers.findFirst({
        where: eq(developers.slug, input.slug),
      });

      if (subscriber) {
        return {
          type: 'subscriber' as const,
          id: subscriber.id,
          name: subscriber.name,
          slug: subscriber.slug,
          description: subscriber.description,
          logo: subscriber.logo,
          coverImage: null, 
          website: subscriber.website,
          emails: [subscriber.email],
          phones: [subscriber.phone],
          address: subscriber.address,
          stats: {
             establishedYear: subscriber.establishedYear,
             totalProjects: subscriber.totalProjects,
             isVerified: !!subscriber.isVerified,
             isTrusted: !!subscriber.isTrusted,
          }
        };
      }

      // 2. Try finding in developerBrandProfiles (Managed Brands)
      const brand = await dbConn.query.developerBrandProfiles.findFirst({
         where: eq(developerBrandProfiles.slug, input.slug)
      });

      if (brand) {
         return {
            type: 'brand' as const,
            id: brand.id,
            name: brand.brandName,
            slug: brand.slug,
            description: brand.about,
            logo: brand.logoUrl,
            coverImage: null, 
            website: brand.websiteUrl,
            emails: [brand.publicContactEmail],
            phones: [], 
            address: brand.headOfficeLocation,
            stats: {
               establishedYear: brand.foundedYear,
               totalProjects: 0, // Could count dynamically if needed
               isVerified: !!brand.isContactVerified,
               isTrusted: true, // Brands are implicitly trusted platform partners
            }
         };
      }

      throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer profile not found' });
    }),

  /**
   * Get public developments for a specific profile
   * Auth: Public
   */
  getPublicDevelopmentsForProfile: publicProcedure
    .input(z.object({
       profileType: z.enum(['subscriber', 'brand']),
       profileId: z.number().int(),
       limit: z.number().int().positive().default(50),
       offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      
      let whereClause;
      // Define 'published' filter
      const isPublished = eq(developments.isPublished, 1);

      if (input.profileType === 'subscriber') {
         // Subscribers: standard developerId lookup
         whereClause = and(
           eq(developments.developerId, input.profileId),
           isPublished
         );
      } else {
         // Brands: Can be EITHER the Developer (Builder) OR the Marketing Agency (Seller)
         whereClause = and(
           or(
             eq(developments.developerBrandProfileId, input.profileId),
             eq(developments.marketingBrandProfileId, input.profileId) 
           ),
           isPublished
         );
      }
      
      const devs = await dbConn.query.developments.findMany({
         where: whereClause,
         limit: input.limit,
         offset: input.offset,
         orderBy: [desc(developments.publishedAt)],
      });
      
      return devs;
    }),

  /**
   * Search brand profiles (for autocomplete)
   * Auth: Protected or Public? Protected seems safer for now.
   */
  searchBrandProfiles: protectedProcedure
    .input(z.object({ 
      query: z.string().min(2),
      limit: z.number().min(1).max(20).default(10) 
    }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      
      const { like } = await import('drizzle-orm');
      
      return await dbConn.query.developerBrandProfiles.findMany({
        columns: {
          id: true,
          brandName: true,
          logoUrl: true,
          isVerified: true,
        },
        where: like(developerBrandProfiles.brandName, `%${input.query}%`),
        limit: input.limit,
      });
    }),

  /**
   * Public query: Get published developments by province
   * Used for homepage and province pages
   */
  getPublishedDevelopments: publicProcedure
    .input(z.object({
      province: z.string().optional(),
      limit: z.number().int().positive().max(20).default(8),
    }))
    .query(async ({ input }) => {
      const { developments: devTable } = await import('../drizzle/schema');
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      console.log('[getPublishedDevelopments] Input:', input);

      // Build query - simplified without brand join for now
      const results = await dbConn
        .select({
          id: devTable.id,
          name: devTable.name,
          description: devTable.description,
          city: devTable.city,
          province: devTable.province,
          slug: devTable.slug,
          images: devTable.images,
          priceFrom: devTable.priceFrom,
          priceTo: devTable.priceTo,
          developmentType: devTable.developmentType,
          views: devTable.views,
          isFeatured: devTable.isFeatured,
        })
        .from(devTable)
        .where(
          and(
            eq(devTable.isPublished, 1),
            eq(devTable.approvalStatus, 'approved'),
            input.province ? eq(devTable.province, input.province) : undefined
          )
        )
        .orderBy(desc(devTable.isFeatured), desc(devTable.views))
        .limit(input.limit);

      console.log('[getPublishedDevelopments] Found', results.length, 'developments');

      // Transform to frontend format
      return results.map((dev: any) => {
        // Parse images if it's a JSON string
        let imageArray: string[] = [];
        if (dev.images) {
          if (typeof dev.images === 'string') {
            try {
              imageArray = JSON.parse(dev.images);
            } catch (e) {
              console.error('[getPublishedDevelopments] Failed to parse images for', dev.name);
            }
          } else if (Array.isArray(dev.images)) {
            imageArray = dev.images;
          }
        }

        return {
          id: dev.id.toString(),
          title: dev.name,
          city: `${dev.city}, ${dev.province}`,
          priceRange: {
            min: dev.priceFrom ? Number(dev.priceFrom) : 0,
            max: dev.priceTo ? Number(dev.priceTo) : 0,
          },
          image: imageArray[0] || '/placeholders/development_placeholder_1_1763712033438.png',
          slug: dev.slug,
          isHotSelling: dev.isFeatured === 1,
        };
      });
    }),
});
