/**
 * Explore Video Upload Router
 * API endpoints for uploading and managing videos in the Explore Discovery Engine
 * Requirements: 8.1, 8.2, 8.4, 8.6
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  generateVideoUploadUrls,
  createExploreVideo,
  validateVideoMetadata,
  validateVideoDuration,
  updateVideoAnalytics,
  type VideoMetadata,
} from '../services/exploreVideoService';

const router = Router();

// Validation schemas
const generateUploadUrlSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().regex(/^video\/(mp4|quicktime|x-msvideo|webm)$/, 'Invalid video format'),
});

const createVideoSchema = z.object({
  videoUrl: z.string().url('Invalid video URL'),
  thumbnailUrl: z.string().url('Invalid thumbnail URL'),
  duration: z.number().min(8, 'Video must be at least 8 seconds').max(60, 'Video must not exceed 60 seconds'),
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
});

const updateAnalyticsSchema = z.object({
  exploreVideoId: z.number(),
  analytics: z.object({
    views: z.number().optional(),
    watchTime: z.number().optional(),
    completionRate: z.number().min(0).max(100).optional(),
    saves: z.number().optional(),
    shares: z.number().optional(),
    clickThroughs: z.number().optional(),
  }),
});

/**
 * POST /api/explore/video/generate-upload-url
 * Generate presigned URLs for video and thumbnail upload
 * Requirements 8.1: Video upload with metadata
 */
router.post('/generate-upload-url', async (req, res) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const validation = generateUploadUrlSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { filename, contentType } = validation.data;
    const creatorId = req.user.id;

    // Generate presigned URLs
    const result = await generateVideoUploadUrls(creatorId, filename, contentType);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[ExploreVideoUpload] Generate URL error:', error);
    res.status(500).json({
      error: 'Failed to generate upload URLs',
      message: error.message,
    });
  }
});

/**
 * POST /api/explore/video/create
 * Create explore video record after successful upload
 * Requirements 8.1, 8.2, 8.4: Store video metadata and validate duration
 */
router.post('/create', async (req, res) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const validation = createVideoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { videoUrl, thumbnailUrl, duration, metadata } = validation.data;
    const creatorId = req.user.id;

    // Validate metadata
    const metadataValidation = validateVideoMetadata(metadata);
    if (!metadataValidation.valid) {
      return res.status(400).json({
        error: 'Invalid metadata',
        details: metadataValidation.errors,
      });
    }

    // Validate duration
    const durationValidation = validateVideoDuration(duration);
    if (!durationValidation.valid) {
      return res.status(400).json({
        error: 'Invalid duration',
        message: durationValidation.error,
      });
    }

    // Create video record
    const result = await createExploreVideo(
      creatorId,
      videoUrl,
      thumbnailUrl,
      metadata,
      duration,
    );

    res.json({
      success: true,
      data: result,
      message: 'Video uploaded successfully and will be available in Explore feed',
    });
  } catch (error: any) {
    console.error('[ExploreVideoUpload] Create video error:', error);
    res.status(500).json({
      error: 'Failed to create video',
      message: error.message,
    });
  }
});

/**
 * POST /api/explore/video/analytics
 * Update video analytics
 * Requirements 8.6: Provide analytics on views, watch time, saves, and click-throughs
 */
router.post('/analytics', async (req, res) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const validation = updateAnalyticsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { exploreVideoId, analytics } = validation.data;

    // Update analytics
    await updateVideoAnalytics(exploreVideoId, analytics);

    res.json({
      success: true,
      message: 'Analytics updated successfully',
    });
  } catch (error: any) {
    console.error('[ExploreVideoUpload] Update analytics error:', error);
    res.status(500).json({
      error: 'Failed to update analytics',
      message: error.message,
    });
  }
});

/**
 * POST /api/explore/video/validate-metadata
 * Validate video metadata before upload
 * Requirements 8.1: Validate required metadata
 */
router.post('/validate-metadata', async (req, res) => {
  try {
    const metadata = req.body as VideoMetadata;
    const validation = validateVideoMetadata(metadata);

    res.json({
      valid: validation.valid,
      errors: validation.errors,
    });
  } catch (error: any) {
    console.error('[ExploreVideoUpload] Validate metadata error:', error);
    res.status(500).json({
      error: 'Failed to validate metadata',
      message: error.message,
    });
  }
});

/**
 * POST /api/explore/video/validate-duration
 * Validate video duration
 * Requirements 8.4: Duration must be between 8 and 60 seconds
 */
router.post('/validate-duration', async (req, res) => {
  try {
    const { duration } = req.body;

    if (typeof duration !== 'number') {
      return res.status(400).json({
        error: 'Invalid duration',
        message: 'Duration must be a number',
      });
    }

    const validation = validateVideoDuration(duration);

    res.json({
      valid: validation.valid,
      error: validation.error,
    });
  } catch (error: any) {
    console.error('[ExploreVideoUpload] Validate duration error:', error);
    res.status(500).json({
      error: 'Failed to validate duration',
      message: error.message,
    });
  }
});

export default router;
