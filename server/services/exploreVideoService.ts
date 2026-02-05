/**
 * Explore Video Service
 * Handles video uploads, processing, and metadata management for the Explore Discovery Engine
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { db } from '../db';
import {
  exploreContent,
  exploreDiscoveryVideos,
  properties,
  developments,
} from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET || 'listify-properties-sa';
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const CDN_URL =
  process.env.CLOUDFRONT_URL || `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`;

export interface VideoMetadata {
  propertyId?: number;
  developmentId?: number;
  title: string;
  description?: string;
  tags: string[];
  lifestyleCategories: string[];
  price?: number;
  location?: string;
  beds?: number;
  baths?: number;
}

export interface VideoUploadResult {
  uploadUrl: string;
  videoKey: string;
  thumbnailKey: string;
  videoUrl: string;
  thumbnailUrl: string;
}

export interface ProcessedVideo {
  exploreContentId: number;
  exploreVideoId: number;
  videoUrl: string;
  thumbnailUrl: string;
}

/**
 * Validate video metadata according to requirements
 */
export function validateVideoMetadata(metadata: VideoMetadata): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!metadata.title || metadata.title.trim().length === 0) errors.push('Title is required');
  if (!metadata.tags || metadata.tags.length === 0) errors.push('At least one tag is required');
  if (!metadata.propertyId && !metadata.developmentId) {
    errors.push('Video must be linked to a property or development');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate video duration
 */
export function validateVideoDuration(duration: number): { valid: boolean; error?: string } {
  if (duration < 8) return { valid: false, error: 'Video duration must be at least 8 seconds' };
  if (duration > 60) return { valid: false, error: 'Video duration must not exceed 60 seconds' };
  return { valid: true };
}

/**
 * Generate presigned URLs for video and thumbnail upload
 */
export async function generateVideoUploadUrls(
  creatorId: number,
  filename: string,
  contentType: string,
): Promise<VideoUploadResult> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
  }

  const timestamp = Date.now();
  const fileId = crypto.randomUUID();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

  const videoKey = `explore/videos/${creatorId}/${timestamp}-${fileId}-${sanitizedFilename}`;
  const thumbnailKey = `explore/thumbnails/${creatorId}/${timestamp}-${fileId}.jpg`;

  const videoCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: videoKey,
    ContentType: contentType,
  });

  const thumbnailCommand = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: thumbnailKey,
    ContentType: 'image/jpeg',
  });

  const uploadUrl = await getSignedUrl(s3Client, videoCommand, { expiresIn: 3600 });
  const thumbnailUploadUrl = await getSignedUrl(s3Client, thumbnailCommand, { expiresIn: 3600 });

  // NOTE: keeping original shape: uploadUrl = video upload URL
  return {
    uploadUrl,
    videoKey,
    thumbnailKey,
    videoUrl: `${CDN_URL}/${videoKey}`,
    thumbnailUrl: `${CDN_URL}/${thumbnailKey}`,
  };
}

/**
 * Detect agent's agency affiliation (best-effort)
 */
async function detectAgencyAffiliation(creatorId: number): Promise<{
  agencyId: number | null;
  agentId: number | null;
  creatorType: 'user' | 'agent' | 'developer' | 'agency';
}> {
  const { agents, developers } = await import('../../drizzle/schema');

  const agentRecord = await db
    .select({ id: agents.id, agencyId: agents.agencyId, userId: agents.userId })
    .from(agents)
    .where(eq(agents.userId, creatorId))
    .limit(1);

  if (agentRecord[0]) {
    return { agencyId: agentRecord[0].agencyId, agentId: agentRecord[0].id, creatorType: 'agent' };
  }

  const developerRecord = await db
    .select({ id: developers.id })
    .from(developers)
    .where(eq(developers.userId, creatorId))
    .limit(1);

  if (developerRecord[0]) {
    return { agencyId: null, agentId: null, creatorType: 'developer' };
  }

  return { agencyId: null, agentId: null, creatorType: 'user' };
}

/**
 * Create explore content + discovery video records
 */
export async function createExploreVideo(
  creatorId: number,
  videoUrl: string,
  thumbnailUrl: string,
  metadata: VideoMetadata,
  duration: number,
): Promise<ProcessedVideo> {
  const mv = validateVideoMetadata(metadata);
  if (!mv.valid) throw new Error(`Invalid metadata: ${mv.errors.join(', ')}`);

  const dv = validateVideoDuration(duration);
  if (!dv.valid) throw new Error(dv.error);

  const affiliation = await detectAgencyAffiliation(creatorId);

  // Verify property/development exists and extract useful fields
  let locationLat: number | null = null;
  let locationLng: number | null = null;
  let priceMin: number | null = null;
  let priceMax: number | null = null;

  if (metadata.propertyId) {
    const property = await db
      .select()
      .from(properties)
      .where(eq(properties.id, metadata.propertyId))
      .limit(1);
    if (!property[0]) throw new Error('Property not found');

    locationLat = property[0].latitude ? parseFloat(property[0].latitude.toString()) : null;
    locationLng = property[0].longitude ? parseFloat(property[0].longitude.toString()) : null;
    priceMin = property[0].price || null;
    priceMax = property[0].price || null;
  } else if (metadata.developmentId) {
    const development = await db
      .select()
      .from(developments)
      .where(eq(developments.id, metadata.developmentId))
      .limit(1);
    if (!development[0]) throw new Error('Development not found');

    locationLat = development[0].latitude ? parseFloat(development[0].latitude.toString()) : null;
    locationLng = development[0].longitude ? parseFloat(development[0].longitude.toString()) : null;
    priceMin = (development[0] as any).priceFrom ?? null;
    priceMax = (development[0] as any).priceTo ?? null;
  }

  const contentResult = await db.insert(exploreContent).values({
    contentType: 'video',
    referenceId: metadata.propertyId || metadata.developmentId || 0,
    creatorId,
    creatorType: affiliation.creatorType,
    agencyId: affiliation.agencyId,
    title: metadata.title,
    description: metadata.description || null,
    thumbnailUrl,
    videoUrl,
    metadata: JSON.stringify({
      beds: metadata.beds,
      baths: metadata.baths,
      location: metadata.location,
    }),
    tags: JSON.stringify(metadata.tags),
    lifestyleCategories: JSON.stringify(metadata.lifestyleCategories),
    locationLat,
    locationLng,
    priceMin,
    priceMax,
    viewCount: 0,
    engagementScore: 0,
    isActive: true,
    isFeatured: false,
  } as any);

  const exploreContentId = Number((contentResult as any).insertId);

  // REPLACED: exploreVideos -> exploreDiscoveryVideos
  const videoResult = await db.insert(exploreDiscoveryVideos).values({
    exploreContentId,
    propertyId: metadata.propertyId || null,
    developmentId: metadata.developmentId || null,
    videoUrl,
    thumbnailUrl,
    duration,
    transcodedUrls: null,
    musicTrack: null,
    hasSubtitles: false,
    subtitleUrl: null,
    totalViews: 0,
    totalWatchTime: 0,
    completionRate: 0,
    saveCount: 0,
    shareCount: 0,
    clickThroughCount: 0,
  } as any);

  const exploreVideoId = Number((videoResult as any).insertId);

  return { exploreContentId, exploreVideoId, videoUrl, thumbnailUrl };
}

/**
 * Update video analytics
 */
export async function updateVideoAnalytics(
  exploreVideoId: number,
  analytics: {
    views?: number;
    watchTime?: number;
    completionRate?: number;
    saves?: number;
    shares?: number;
    clickThroughs?: number;
  },
): Promise<void> {
  const updates: any = {};
  if (analytics.views !== undefined) updates.totalViews = analytics.views;
  if (analytics.watchTime !== undefined) updates.totalWatchTime = analytics.watchTime;
  if (analytics.completionRate !== undefined) updates.completionRate = analytics.completionRate;
  if (analytics.saves !== undefined) updates.saveCount = analytics.saves;
  if (analytics.shares !== undefined) updates.shareCount = analytics.shares;
  if (analytics.clickThroughs !== undefined) updates.clickThroughCount = analytics.clickThroughs;

  await db
    .update(exploreDiscoveryVideos)
    .set(updates)
    .where(eq((exploreDiscoveryVideos as any).id, exploreVideoId));
}
