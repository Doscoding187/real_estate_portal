import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import * as db from './db';
import { TRPCError } from '@trpc/server';
import { EmailService } from './_core/emailService';
import { developerSubscriptionService } from './services/developerSubscriptionService';
import { developmentService } from './services/developmentService';
import { unitService } from './services/unitService';
import { calculateAffordabilityCompanion, matchUnitsToAffordability } from './services/affordabilityCompanion';
import { developmentDrafts } from '../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';

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
   */
  searchDevelopments: publicProcedure
    .input(
      z.object({
        query: z.string().min(2, 'Search query must be at least 2 characters'),
        developerId: z.number().int().optional(),
        limit: z.number().int().positive().max(20).default(10),
      })
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
        completionDate: z.string().optional(),
        showHouseAddress: z.boolean().default(true),
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

        const development = await developmentService.createDevelopment(developer.id, {
          ...input,
          locationId,
        });
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
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const development = await developmentService.getDevelopmentWithPhases(input.id);
      
      if (!development) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Development not found',
        });
      }

      // Verify ownership
      if (development.developerId !== developer.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this development',
        });
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
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        const development = await developmentService.updateDevelopment(
          input.id,
          developer.id,
          input.data
        );
        return { development, message: 'Development updated successfully' };
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
   * Delete development
   * Auth: Protected, must own development
   */
  deleteDevelopment: protectedProcedure
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
        await developmentService.deleteDevelopment(input.id, developer.id);
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
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      try {
        const development = await developmentService.publishDevelopment(input.id, developer.id, !!developer.isTrusted);
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
      return await db.listPublicDevelopments(input?.limit || 20);
    }),

  /**
   * Get single public development
   * Auth: Public
   */
  getPublicDevelopment: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dev = await db.getPublicDevelopment(input.id);
      if (!dev) {
         throw new TRPCError({
             code: 'NOT_FOUND',
             message: 'Development not found'
         });
      }
      return dev;
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

      // Verify ownership
      const development = await developmentService.getDevelopmentWithPhases(input.developmentId);
      if (!development || development.developerId !== developer.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this development',
        });
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

      // Verify ownership
      const development = await developmentService.getDevelopmentWithPhases(input.developmentId);
      if (!development || development.developerId !== developer.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this development',
        });
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
        draftData: z.object({
          developmentName: z.string().optional(),
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
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

      const draftName = input.draftData.developmentName || `Draft ${new Date().toLocaleDateString()}`;
      const progress = input.progress || Math.round((input.currentStep || 0) / 6 * 100);

      if (input.id) {
        // Update existing draft
        await dbConn.update(developmentDrafts)
          .set({
            draftName,
            draftData: input.draftData,
            progress,
            currentStep: input.currentStep || 0,
          })
          .where(eq(developmentDrafts.id, input.id));

        return { id: input.id, message: 'Draft updated successfully' };
      } else {
        // Create new draft
        const [result] = await dbConn.insert(developmentDrafts).values({
          developerId: developer.id,
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
  getDrafts: protectedProcedure.query(async ({ ctx }) => {
    const developer = await db.getDeveloperByUserId(ctx.user.id);
    
    if (!developer) {
      return [];
    }

    const dbConn = await db.getDb();
    if (!dbConn) return [];

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
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      
      if (!developer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Developer profile not found',
        });
      }

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error('Database not available');

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
        amenities: z.array(z.string()).optional(), // Will map to baseFeatures/baseFinishes in service
      })
    )
    .mutation(async ({ input, ctx }) => {
      const developer = await db.getDeveloperByUserId(ctx.user.id);
      if (!developer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Developer not found' });

      try {
         // Logic to verify ownership
         const development = await developmentService.getDevelopmentWithPhases(input.developmentId);
         if (!development || development.developerId !== developer.id) {
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
           baseFeatures: JSON.stringify({
             builtInWardrobes: true,
             tiledFlooring: true,
             graniteCounters: true,
             prepaidElectricity: true,
             balcony: false,
             petFriendly: false
           }),
           baseFinishes: JSON.stringify({
             paintAndWalls: '',
             flooringTypes: '',
             kitchenFeatures: '',
             bathroomFeatures: ''
           }),
           baseMedia: JSON.stringify({ gallery: [], floorPlans: [], renders: [] })
         };
         
         // Only add basePriceTo if it's a valid positive number
         if (input.basePriceTo && input.basePriceTo > 0) {
           insertValues.basePriceTo = String(input.basePriceTo);
         }
         
         await dbConn.insert(unitTypes).values(insertValues);
         
         return { success: true, id: newId };
      } catch (error: any) {
         throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
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
});
