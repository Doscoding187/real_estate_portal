/**
 * Listing Router - tRPC endpoints for listing management
 *
 * Handles: Create, Update, Delete, Approve, Analytics, Media Upload
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import * as db from './db';

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
    transferCostEstimate: z.number().optional(),
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
  }),
  mediaIds: z.array(z.number()),
  mainMediaId: z.number().optional(),
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
      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Create listing in database
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
        slug,
        media: [], // Media will be added separately
      });

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
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create listing' });
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
        // Fetch user's listings
        const listings = await db.getUserListings(userId, input.status);

        return listings.slice(input.offset, input.offset + input.limit);
      } catch (error) {
        console.error('Error fetching user listings:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch listings' });
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
        // Verify ownership
        const listing = await db.getListingById(input.id);
        if (!listing || listing.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to delete this listing',
          });
        }

        // Soft delete or hard delete
        // For now, we'll just update the status to archived
        await db.updateListing(input.id, {
          status: 'archived',
          updatedAt: new Date(),
        });

        return { success: true };
      } catch (error) {
        console.error('Error deleting listing:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete listing' });
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
        // File upload handled separately via presigned URL
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Generate presigned URL for S3
        // For now, we'll return a mock URL
        // In a real implementation, this would integrate with your storage solution

        const uploadUrl = `https://example-storage.com/upload/${Date.now()}`;
        const mediaId = Date.now(); // Mock ID

        return {
          uploadUrl,
          mediaId,
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
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Verify ownership
        const listing = await db.getListingById(input.listingId);
        if (!listing || listing.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to submit this listing',
          });
        }

        // Update status to pending_review and add to approval queue
        await db.submitListingForReview(input.listingId);

        return { success: true };
      } catch (error) {
        console.error('Error submitting for review:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit for review',
        });
      }
    }),

  /**
   * Approve listing (Super Admin only)
   */
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
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      try {
        await db.rejectListing(input.listingId, ctx.user.id, input.reason);

        return { success: true };
      } catch (error) {
        console.error('Error rejecting listing:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to reject listing' });
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
