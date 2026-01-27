/**
 * Explore Video Upload Router (tRPC)
 * API endpoints for uploading and managing videos in the Explore Discovery Engine
 * Requirements: 8.1, 8.2, 8.4, 8.6
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  generateVideoUploadUrls,
  createExploreVideo,
  validateVideoMetadata,
  validateVideoDuration,
  updateVideoAnalytics,
} from './services/exploreVideoService';
import {
  processUploadedVideo,
  updateTranscodedUrls,
  type TranscodedVideo,
} from './services/videoProcessingService';

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
      const creatorId = ctx.user.id;
      const result = await generateVideoUploadUrls(creatorId, input.filename, input.contentType);

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
      const creatorId = ctx.user.id;

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
        creatorId,
        input.videoUrl,
        input.thumbnailUrl,
        input.metadata,
        input.duration,
      );

      // Trigger video processing pipeline (transcoding, thumbnails, etc.)
      // This runs asynchronously and doesn't block the response
      processUploadedVideo(result.exploreVideoId, input.videoUrl, input.duration).catch(error => {
        console.error('[ExploreVideoUpload] Video processing failed:', error);
        // In production, this would trigger an alert or retry mechanism
      });

      return {
        success: true,
        data: result,
        message:
          'Video uploaded successfully and is being processed. It will be available in Explore feed within 5 minutes.',
      };
    }),

  /**
   * Update video analytics
   * Requirements 8.6: Provide analytics on views, watch time, saves, and click-throughs
   */
  updateAnalytics: protectedProcedure
    .input(
      z.object({
        exploreVideoId: z.number(),
        analytics: z.object({
          views: z.number().optional(),
          watchTime: z.number().optional(),
          completionRate: z.number().min(0).max(100).optional(),
          saves: z.number().optional(),
          shares: z.number().optional(),
          clickThroughs: z.number().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      await updateVideoAnalytics(input.exploreVideoId, input.analytics);

      return {
        success: true,
        message: 'Analytics updated successfully',
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
   * Update transcoded video URLs
   * Called by transcoding service webhook when processing completes
   * Requirements 8.2: Store processed video URLs
   */
  updateTranscodedUrls: protectedProcedure
    .input(
      z.object({
        exploreVideoId: z.number(),
        transcodedVideos: z.array(
          z.object({
            quality: z.string(),
            url: z.string().url(),
            width: z.number(),
            height: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      await updateTranscodedUrls(input.exploreVideoId, input.transcodedVideos);

      return {
        success: true,
        message: 'Transcoded URLs updated successfully',
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
    .query(async ({ input }) => {
      const { getTranscodingStatus } = await import('./services/videoProcessingService');
      const status = await getTranscodingStatus(input.exploreVideoId);

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
    .query(async ({ input }) => {
      const { validateVideoFile } = await import('./services/videoProcessingService');
      const validation = await validateVideoFile(input.videoUrl, input.duration);

      return {
        valid: validation.valid,
        errors: validation.errors,
      };
    }),
});
