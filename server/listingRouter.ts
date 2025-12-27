/**
 * Listing Router - tRPC endpoints for listing management
 *
 * Handles: Create, Update, Delete, Approve, Analytics, Media Upload
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import * as db from './db';
import { autoCreateLocationHierarchy, extractPlaceComponents } from './services/locationAutoPopulation';
import { calculateListingReadiness } from './lib/readiness';
import { calculateListingQualityScore } from './lib/quality';

// Validation schemas
const listingActionSchema = z.enum(['sell', 'rent', 'auction']);
const propertyTypeSchema = z.enum([
  'apartment',
  'house',
  'farm',
  'land',
  'commercial',
  'shared_living',
]);

const createListingSchema = z.object({
  action: listingActionSchema,
  propertyType: propertyTypeSchema,
  title: z.string().min(10).max(255),
  description: z.string().min(50).max(5000),
  pricing: z.object({
    // Sell fields
    askingPrice: z.number().optional(),
    negotiable: z.boolean().optional(),
    transferCostEstimate: z.number().nullable().optional(),
    // Rent fields
    monthlyRent: z.number().optional(),
    deposit: z.number().optional(),
    leaseTerms: z.string().optional(),
    availableFrom: z.date().optional(),
    utilitiesIncluded: z.boolean().optional(),
    // Auction fields
    startingBid: z.number().optional(),
    reservePrice: z.number().optional(),
    auctionDateTime: z.date().optional(),
    auctionTermsDocumentUrl: z.string().optional(),
  }),
  propertyDetails: z.record(z.string(), z.any()),
  location: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string(),
    suburb: z.string().optional(),
    province: z.string(),
    postalCode: z.string().optional(),
    placeId: z.string().optional(),
    // Google Places address components for auto-population
    addressComponents: z.array(z.object({
      long_name: z.string(),
      short_name: z.string(),
      types: z.array(z.string()),
    })).optional(),
  }),
  // Use string IDs only
  mediaIds: z.array(z.string()),
  // Use string ID or undefined
  mainMediaId: z.string().optional().nullable(),
  status: z.enum(['draft', 'pending_review']).optional(),
});

export const listingRouter = router({
  /**
   * Create new listing
   */
  create: protectedProcedure.input(createListingSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      // Generate slug from title
      const timestamp = Date.now().toString(36);
      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + `-${timestamp}`;

      // Prepare media array from mediaIds (which are S3 keys/URLs)
      const media = input.mediaIds.map((id, index) => {
        // All IDs are now strings
        const stringId = id;
        return {
          id: stringId, // S3 key
          url: stringId, // For now, use the ID as the URL (it's already the S3 key)
          type: 'image' as const, // Default to image; adjust if you have type info
          displayOrder: index,
          isPrimary: input.mainMediaId ? stringId === input.mainMediaId : index === 0,
          processingStatus: 'completed' as const,
          // Initialize optional fields for db.createListing
          thumbnailUrl: null,
          fileName: null,
          fileSize: null,
          width: null,
          height: null,
          duration: null,
          orientation: null,
        };
      });

      // Auto-create location hierarchy from Google Places data
      // This auto-populates cities and suburbs as agents add properties!
      let provinceId: number | null = null;
      let cityId: number | null = null;
      let suburbId: number | null = null;
      let locationId: number | undefined;

      if (input.location.placeId && input.location.addressComponents) {
        try {
          console.log('[ListingRouter] Auto-populating location from Google Places...');
          
          // Extract components from Google Places data
          const components = extractPlaceComponents(input.location.addressComponents);
          
          // Auto-create city/suburb if they don't exist
          const locationIds = await autoCreateLocationHierarchy({
            placeId: input.location.placeId,
            formattedAddress: input.location.address,
            latitude: input.location.latitude,
            longitude: input.location.longitude,
            components,
          });

          provinceId = locationIds.provinceId;
          cityId = locationIds.cityId;
          suburbId = locationIds.suburbId;

          console.log('[ListingRouter] ✅ Auto-populated:', {
            provinceId,
            cityId,
            suburbId,
          });
        } catch (error) {
          console.error('[ListingRouter] Auto-population failed:', error);
        }
      }

      // Fallback: Try legacy location resolution
      if (!cityId) {
        try {
          const { locationPagesServiceEnhanced } = await import('./services/locationPagesServiceEnhanced');
          const location = await locationPagesServiceEnhanced.resolveLocation(input.location);
          locationId = location.id;
          console.log('[ListingRouter] Fallback: Resolved location:', location.name, `(ID: ${locationId})`);
        } catch (error) {
          console.warn('[ListingRouter] Location resolution failed, proceeding without location_id:', error);
        }
      }

      // Create listing in database with auto-populated location IDs
      const listingId = await db.createListing({
        userId,
        action: input.action,
        propertyType: input.propertyType,
        title: input.title,
        description: input.description,
        pricing: input.pricing,
        propertyDetails: input.propertyDetails,
        address: input.location.address,
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        city: input.location.city,
        suburb: input.location.suburb,
        province: input.location.province,
        postalCode: input.location.postalCode,
        placeId: input.location.placeId,
        locationId, // Legacy: Link to locations table (if resolved)
        provinceId, // New: Auto-populated province ID
        cityId, // New: Auto-populated city ID  
        suburbId, // New: Auto-populated suburb ID
        slug,
        media,
      });

      // Calculate initial readiness
      const listingData = { ...input, media }; 
      const readiness = calculateListingReadiness(listingData);
      await db.updateListing(listingId, { readinessScore: readiness.score });

      // Set approval status based on account verification
      // For now, we'll put it in draft status
      const canonicalUrl = `/listings/${slug}`;

      return {
        id: listingId,
        slug,
        status: 'draft',
        canonicalUrl,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating listing:', error);
      // Re-throw TRPC errors
      if (error instanceof TRPCError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error message:', errorMessage);
      
      throw new TRPCError({ 
        code: 'INTERNAL_SERVER_ERROR', 
        message: `Failed to create listing: ${errorMessage}`,
        cause: error 
      });
    }
  }),

  /**
   * Update existing listing
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        ...createListingSchema.partial().shape,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Verify ownership
        const listing = await db.getListingById(input.id);
        if (!listing || listing.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this listing',
          });
        }

        // Update listing
        await db.updateListing(input.id, {
          ...input,
          updatedAt: new Date(),
        });

        // Recalculate readiness and quality
        // Fetch full listing with media to ensure accuracy (or construct from input + existing)
        const fullListing = await db.getListingById(input.id);
        const media = await db.getListingMedia(input.id);
        const listingData = { ...fullListing, ...input, media }; // Merge input into full listing

        const readiness = calculateListingReadiness(listingData);
        const quality = calculateListingQualityScore(listingData);

        await db.updateListing(input.id, { 
            readinessScore: readiness.score,
            qualityScore: quality.score,
            qualityBreakdown: quality.breakdown
        });

        return { success: true };
      } catch (error) {
        console.error('Error updating listing:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update listing' });
      }
    }),

  /**
   * Get listing by ID
   */
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      // Fetch listing with media and analytics
      const listing = await db.getListingById(input.id);
      if (!listing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      }

      const media = await db.getListingMedia(input.id);
      const analytics = await db.getListingAnalytics(input.id);

      return {
        ...listing,
        media,
        analytics,
      };
    } catch (error) {
      console.error('Error fetching listing:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch listing' });
    }
  }),

  /**
   * Get user's listings
   */
  myListings: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(['draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'])
          .optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Fetch user's listings with pagination
        const listings = await db.getUserListings(userId, input.status, input.limit, input.offset);

        return listings;
      } catch (error) {
        console.error('Error fetching user listings:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch listings' });
      }
    }),

  /**
   * Archive listing
   */
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Verify ownership
        const listing = await db.getListingById(input.id);
        if (!listing || listing.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to archive this listing',
          });
        }

        // Archive listing
        await db.archiveListing(input.id);

        return { success: true };
      } catch (error) {
        console.error('Error archiving listing:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to archive listing' });
      }
    }),

  /**
   * Delete listing
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Verify ownership or super admin status
        const listing = await db.getListingById(input.id);
        if (!listing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
        }

        const isOwner = listing.userId === userId;
        const isSuperAdmin = ctx.user.role === 'super_admin';

        if (!isOwner && !isSuperAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to delete this listing',
          });
        }

        // Hard delete
        await db.deleteListing(input.id);

        return { success: true };
      } catch (error) {
        console.error('Error deleting listing:', error);
        
        // If it's already a TRPCError, re-throw it
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Otherwise, wrap it with more details
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete listing';
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: errorMessage,
          cause: error 
        });
      }
    }),

  /**
   * Upload media for listing
   */
  uploadMedia: protectedProcedure
    .input(
      z.object({
        listingId: z.number().optional(),
        type: z.enum(['image', 'video', 'floorplan', 'pdf']),
        filename: z.string(),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Import the S3 upload service
        const { generatePresignedUploadUrl } = await import('./_core/imageUpload');

        // Generate presigned URL for S3
        const result = await generatePresignedUploadUrl(
          input.filename,
          input.contentType,
          input.listingId?.toString() || 'draft',
        );

        // Build the public CDN URL (CloudFront preferred)
        const { ENV } = await import('./_core/env');
        const cdnUrl =
          ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`;
        const publicUrl = `${cdnUrl}/${result.key}`;

        return {
          uploadUrl: result.uploadUrl,
          mediaId: result.key, // Use the S3 key as media ID
          publicUrl,
        };
      } catch (error) {
        console.error('Error generating media upload URL:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate upload URL',
        });
      }
    }),

  /**
   * Get listing analytics
   */
  getAnalytics: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const listing = await db.getListingById(input.listingId);
        if (!listing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
        }

        // Fetch analytics
        const analytics = await db.getListingAnalytics(input.listingId);

        if (!analytics) {
          // Return default analytics if none exist
          return {
            totalViews: 0,
            uniqueVisitors: 0,
            totalLeads: 0,
            contactFormLeads: 0,
            whatsappClicks: 0,
            phoneReveals: 0,
            bookingViewingRequests: 0,
            totalFavorites: 0,
            totalShares: 0,
            conversionRate: 0,
            viewsByDay: {},
            trafficSources: {
              direct: 0,
              organic: 0,
              social: 0,
              referral: 0,
              email: 0,
              paid: 0,
            },
          };
        }

        return analytics;
      } catch (error) {
        console.error('Error fetching analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch analytics',
        });
      }
    }),

  /**
   * Get listing leads
   */
  getLeads: protectedProcedure
    .input(
      z.object({
        listingId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Fetch leads with filtering
        // For now, we'll return mock data
        // In a real implementation, this would query the leads database

        // Verify ownership
        const listing = await db.getListingById(input.listingId);
        if (!listing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
        }

        return {
          leads: [],
          total: 0,
        };
      } catch (error) {
        console.error('Error fetching leads:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch leads' });
      }
    }),

  /**
   * Submit listing for review (manual approval)
   */
  submitForReview: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const listing = await db.getListingById(input.listingId);
        if (!listing || listing.userId !== ctx.user?.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to submit this listing',
          });
        }

        // Check readiness before allowing submission
        const fullListing = await db.getListingById(input.listingId);
        const media = await db.getListingMedia(input.listingId);
        const readiness = calculateListingReadiness({ ...fullListing, media });

        if (readiness.score < 75) { // Threshold 75%
             throw new TRPCError({
                code: 'PRECONDITION_FAILED',
                message: `Listing is not ready for submission (${readiness.score}%). Please complete missing fields.`,
            });
        }

        // --- Fast-Track Approval Logic (Phase 5) ---
        // Criteria: Readiness 100%, Quality >= 85, Trusted/Verified Agent
        const quality = calculateListingQualityScore({ ...fullListing, media });
        const agent = await db.getAgentByUserId(ctx.user.id);
        
        // Check if agent is verified (assuming isVerified is 1 or true)
        const isTrusted = agent?.isVerified === 1;

        if (readiness.score === 100 && quality.score >= 85 && isTrusted) {
            // Auto-Approve
            await db.approveListing(input.listingId, ctx.user.id, "Fast-Track Auto Approval (High Quality & Trusted)");
            return { success: true, status: 'approved', fastTracked: true };
        }

        // Otherwise, add to manual review queue
        await db.submitListingForReview(input.listingId);

        return { success: true, status: 'pending_review' };
      } catch (error) {
        console.error('Error submitting for review:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit for review',
        });
      }
    }),
 
   /**
    * Promote/Feature a listing (Soft Monetization Hook)
    * Requires Quality Score >= 85
    */
   promote: protectedProcedure
     .input(z.object({ 
         listingId: z.number(),
         featured: z.boolean() 
     }))
     .mutation(async ({ ctx, input }) => {
       try {
         // Verify ownership or admin
         const listing = await db.getListingById(input.listingId);
         if (!listing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
         
         const isOwner = listing.userId === ctx.user?.id;
         const isSuperAdmin = ctx.user?.role === 'super_admin';
         
         if (!isOwner && !isSuperAdmin) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
         }

         // Gate: Quality Score >= 85 for featuring
         if (input.featured) {
             const qualityScore = listing.qualityScore || 0; // Assuming it's already calculated on save
             if (qualityScore < 85 && !isSuperAdmin) { // Admins can override
                 throw new TRPCError({
                     code: 'PRECONDITION_FAILED',
                     message: `Listing Quality Score must be at least 85 to be Featured. Current score: ${qualityScore}.`
                 });
             }
         }

         // Update listing
         // Since db.updateListing takes partial, we can use it.
         await db.updateListing(input.listingId, { featured: input.featured ? 1 : 0 });

         return { success: true };
       } catch (error) {
         console.error('Error promoting listing:', error);
         if (error instanceof TRPCError) throw error;
         throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update promotion status' });
       }
     }),

  /**
   * Approve listing (Super Admin only)
   *
  approve: protectedProcedure
    .input(
      z.object({
        listingId: z.number(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      try {
        // Update listing status to approved
        await db.approveListing(input.listingId, ctx.user.id, input.notes);

        return { success: true };
      } catch (error) {
        console.error('Error approving listing:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve listing',
        });
      }
    }),

  /**
   * Reject listing (Super Admin only)
   */
  reject: protectedProcedure
    .input(
      z.object({
        listingId: z.number(),
        reason: z.string().optional(), // Now optional as we use reasons array primarily
        reasons: z.array(z.string()).optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      try {
        // Construct composite reason if legacy reason provided
        // Store structured data
        await db.rejectListing(input.listingId, ctx.user.id, input.reason || 'See rejection reasons', input.reasons, input.note);

        return { success: true };
      } catch (error) {
        console.error('Error rejecting listing:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reject listing',
        });
      }
    }),

  /**
   * Get approval queue (Super Admin only)
   */
  getApprovalQueue: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'reviewing', 'approved', 'rejected']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      try {
        const queueItems = await db.getApprovalQueue(input.status);

        return queueItems.slice(input.offset, input.offset + input.limit);
      } catch (error) {
        console.error('Error fetching approval queue:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch approval queue',
        });
      }
    }),
});

// Export type router type signature
export type ListingRouter = typeof listingRouter;
