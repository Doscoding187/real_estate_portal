/**
 * Explore Video Upload Router (tRPC)
 * API endpoints for uploading and managing videos in the Explore Discovery Engine
 * Requirements: 8.1, 8.2, 8.4, 8.6
 */

import { router, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  generateVideoUploadUrls,
  createExploreVideo,
  validateVideoMetadata,
  validateVideoDuration,
} from './services/exploreVideoService';
import { requireUser } from './_core/requireUser';
import { getDb } from './db';
import {
  assertExploreReferenceOwnership,
  ExplorePublishingAuthorizationError,
  getExplorePublishingAccessMessage,
  getExplorePublishingEligibility,
} from './services/explorePublishingEligibilityService';
import {
  processUploadedVideo,
  getTranscodingStatus as getVideoTranscodingStatus,
  validateVideoFile as validateUploadedVideoFile,
} from './services/videoProcessingService';

async function requireExplorePublisher(ctx: Parameters<typeof requireUser>[0]) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  }
  const eligibility = await getExplorePublishingEligibility(db, requireUser(ctx));
  if (!eligibility.allowed) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: getExplorePublishingAccessMessage(eligibility),
    });
  }
  return { db, eligibility };
}

export const exploreVideoUploadRouter = router({
  /**
   * Generate presigned URLs for video and thumbnail upload
   * Requirements 8.1: Video upload with metadata
   */
  generateUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1, 'Filename is required'),
        contentType: z
          .string()
          .regex(/^video\/(mp4|quicktime|x-msvideo|webm)$/, 'Invalid video format'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { eligibility: publisher } = await requireExplorePublisher(ctx);
      const result = await generateVideoUploadUrls(
        publisher.creatorId,
        input.filename,
        input.contentType,
      );

      return {
        success: true,
        data: result,
      };
    }),

  /**
   * Create explore video record after successful upload
   * Requirements 8.1, 8.2, 8.4: Store video metadata and validate duration
   */
  createVideo: protectedProcedure
    .input(
      z.object({
        videoUrl: z.string().url('Invalid video URL'),
        thumbnailUrl: z.string().url('Invalid thumbnail URL'),
        duration: z
          .number()
          .min(8, 'Video must be at least 8 seconds')
          .max(60, 'Video must not exceed 60 seconds'),
        metadata: z.object({
          propertyId: z.number().optional(),
          developmentId: z.number().optional(),
          title: z.string().min(1, 'Title is required'),
          description: z.string().optional(),
          tags: z.array(z.string()).min(1, 'At least one tag is required'),
          lifestyleCategories: z.array(z.string()),
          price: z.number().optional(),
          location: z.string().optional(),
          beds: z.number().optional(),
          baths: z.number().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, eligibility: publisher } = await requireExplorePublisher(ctx);
      try {
        await assertExploreReferenceOwnership(db, publisher, {
          propertyId: input.metadata.propertyId,
          developmentId: input.metadata.developmentId,
        });
      } catch (error) {
        if (error instanceof ExplorePublishingAuthorizationError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
        }
        throw error;
      }

      // Validate metadata
      const metadataValidation = validateVideoMetadata(input.metadata);
      if (!metadataValidation.valid) {
        throw new Error(`Invalid metadata: ${metadataValidation.errors.join(', ')}`);
      }

      // Validate duration
      const durationValidation = validateVideoDuration(input.duration);
      if (!durationValidation.valid) {
        throw new Error(durationValidation.error);
      }

      // Create video record
      const result = await createExploreVideo(
        publisher,
        input.videoUrl,
        input.thumbnailUrl,
        input.metadata,
        input.duration,
      );

      // Trigger video processing pipeline (transcoding, thumbnails, etc.)
      // This runs asynchronously and doesn't block the response
      processUploadedVideo(result.contentId, input.videoUrl, input.duration).catch(error => {
        console.error('[ExploreVideoUpload] Video processing failed:', error);
        // In production, this would trigger an alert or retry mechanism
      });

      return {
        success: true,
        data: result,
        message: 'Video saved as inactive editorial content.',
      };
    }),

  /**
   * Validate video metadata before upload
   * Requirements 8.1: Validate required metadata
   */
  validateMetadata: protectedProcedure
    .input(
      z.object({
        propertyId: z.number().optional(),
        developmentId: z.number().optional(),
        title: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()),
        lifestyleCategories: z.array(z.string()),
        price: z.number().optional(),
        location: z.string().optional(),
        beds: z.number().optional(),
        baths: z.number().optional(),
      }),
    )
    .query(({ input }) => {
      const validation = validateVideoMetadata(input);

      return {
        valid: validation.valid,
        errors: validation.errors,
      };
    }),

  /**
   * Validate video duration
   * Requirements 8.4: Duration must be between 8 and 60 seconds
   */
  validateDuration: protectedProcedure
    .input(
      z.object({
        duration: z.number(),
      }),
    )
    .query(({ input }) => {
      const validation = validateVideoDuration(input.duration);

      return {
        valid: validation.valid,
        error: validation.error,
      };
    }),

  /**
   * Get transcoding status for a video
   * Requirements 8.2: Track video processing status
   */
  getTranscodingStatus: protectedProcedure
    .input(
      z.object({
        exploreVideoId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireExplorePublisher(ctx);
      const status = await getVideoTranscodingStatus(input.exploreVideoId);

      return {
        success: true,
        data: status,
      };
    }),

  /**
   * Validate video file
   * Requirements 8.1, 8.4: Validate video format and duration
   */
  validateVideoFile: protectedProcedure
    .input(
      z.object({
        videoUrl: z.string().url(),
        duration: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireExplorePublisher(ctx);
      const validation = await validateUploadedVideoFile(input.videoUrl, input.duration);

      return {
        valid: validation.valid,
        errors: validation.errors,
      };
    }),
});
