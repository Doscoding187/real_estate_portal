/**
 * Video Processing Service
 * Handles video transcoding, thumbnail generation, and metadata extraction
 */

import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../db';
import { exploreDiscoveryVideos } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

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

// MediaConvert (optional)
const MEDIACONVERT_ENDPOINT = process.env.MEDIACONVERT_ENDPOINT;
const MEDIACONVERT_ROLE_ARN = process.env.MEDIACONVERT_ROLE_ARN;

export interface VideoFormat {
  quality: '1080p' | '720p' | '480p';
  width: number;
  height: number;
  bitrate: string;
}

export interface TranscodedVideo {
  quality: string;
  url: string;
  width: number;
  height: number;
}

export interface VideoMetadataExtraction {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  fps: number;
}

const VIDEO_FORMATS: VideoFormat[] = [
  { quality: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
  { quality: '720p', width: 1280, height: 720, bitrate: '2500k' },
  { quality: '480p', width: 854, height: 480, bitrate: '1000k' },
];

/**
 * Queue video for transcoding (falls back to original if MediaConvert not configured)
 */
export async function queueVideoForTranscoding(
  exploreVideoId: number,
  videoUrl: string,
): Promise<{ jobId?: string; status: string }> {
  try {
    const s3Key = extractS3Key(videoUrl);

    const inputPath = `s3://${S3_BUCKET_NAME}/${s3Key}`;
    const outputPath = `s3://${S3_BUCKET_NAME}/transcoded/${exploreVideoId}`;

    // Mark as queued
    await db
      .update(exploreDiscoveryVideos)
      .set({
        transcodedUrls: JSON.stringify({
          status: 'queued',
          queuedAt: new Date().toISOString(),
          inputPath,
          outputPath,
        }),
      } as any)
      .where(eq((exploreDiscoveryVideos as any).id, exploreVideoId));

    // Try MediaConvert if configured
    if (MEDIACONVERT_ENDPOINT && MEDIACONVERT_ROLE_ARN) {
      try {
        const jobId = await submitMediaConvertJob(inputPath, outputPath, exploreVideoId);

        await db
          .update(exploreDiscoveryVideos)
          .set({
            transcodedUrls: JSON.stringify({
              status: 'processing',
              queuedAt: new Date().toISOString(),
              jobId,
              inputPath,
              outputPath,
            }),
          } as any)
          .where(eq((exploreDiscoveryVideos as any).id, exploreVideoId));

        return { jobId, status: 'processing' };
      } catch (err: any) {
        console.error('[VideoProcessing] MediaConvert failed, falling back:', err.message);
      }
    }

    // Fallback: mark original as all qualities
    const fallbackUrls: Record<string, string> = {};
    VIDEO_FORMATS.forEach(f => (fallbackUrls[f.quality] = videoUrl));

    await db
      .update(exploreDiscoveryVideos)
      .set({
        transcodedUrls: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
          ...fallbackUrls,
          note: 'Original video used (MediaConvert not configured)',
        }),
      } as any)
      .where(eq((exploreDiscoveryVideos as any).id, exploreVideoId));

    return { status: 'completed' };
  } catch (error: any) {
    console.error('[VideoProcessing] Queue failed:', error);

    await db
      .update(exploreDiscoveryVideos)
      .set({
        transcodedUrls: JSON.stringify({
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString(),
        }),
      } as any)
      .where(eq((exploreDiscoveryVideos as any).id, exploreVideoId))
      .catch(() => {});

    throw error;
  }
}

/**
 * Placeholder – implement when adding @aws-sdk/client-mediaconvert
 */
async function submitMediaConvertJob(
  _inputPath: string,
  _outputPath: string,
  _videoId: number,
): Promise<string> {
  throw new Error(
    'MediaConvert not implemented. Add @aws-sdk/client-mediaconvert and set MEDIACONVERT_* env vars.',
  );
}

/**
 * Called after transcoding finishes (usually via webhook)
 */
export async function updateTranscodedUrls(
  exploreVideoId: number,
  transcodedVideos: TranscodedVideo[],
): Promise<void> {
  const map: Record<string, string> = {};
  transcodedVideos.forEach(v => (map[v.quality] = v.url));

  await db
    .update(exploreDiscoveryVideos)
    .set({ transcodedUrls: JSON.stringify(map) } as any)
    .where(eq((exploreDiscoveryVideos as any).id, exploreVideoId));
}

/**
 * Helper to extract S3 key
 */
function extractS3Key(videoUrl: string): string {
  if (videoUrl.includes(S3_BUCKET_NAME)) {
    return (
      videoUrl.split(`${S3_BUCKET_NAME}/`)[1] ||
      videoUrl.split('.com/')[1] ||
      ''
    );
  }
  return videoUrl;
}

/**
 * Placeholder thumbnail
 */
export async function generateThumbnail(videoUrl: string, timeOffset: number = 2): Promise<string> {
  const s3Key = extractS3Key(videoUrl);
  const thumbKey = s3Key
    .replace('/videos/', '/thumbnails/')
    .replace(/\.[^.]+$/, `-${timeOffset}s.jpg`);

  return `${CDN_URL}/${thumbKey}`;
}

/**
 * Placeholder preview thumbnails
 */
export async function generatePreviewThumbnails(
  videoUrl: string,
  duration: number,
  intervalSeconds: number = 5,
): Promise<string[]> {
  const s3Key = extractS3Key(videoUrl);
  const urls: string[] = [];
  const count = Math.max(1, Math.floor(duration / intervalSeconds));

  for (let i = 0; i < count; i++) {
    const offset = i * intervalSeconds;
    const key = s3Key
      .replace('/videos/', '/preview-thumbnails/')
      .replace(/\.[^.]+$/, `-${offset}s.jpg`);
    urls.push(`${CDN_URL}/${key}`);
  }

  return urls;
}

/**
 * Placeholder sprite sheet
 */
export async function generateSpriteSheet(thumbnailUrls: string[], _columns: number = 10): Promise<string> {
  if (thumbnailUrls.length === 0) return '';

  const firstKey = extractS3Key(thumbnailUrls[0]);
  const spriteKey = firstKey
    .replace('/preview-thumbnails/', '/sprites/')
    .replace(/-\d+s\.jpg$/, '-sprite.jpg');

  return `${CDN_URL}/${spriteKey}`;
}

/**
 * Basic metadata estimation
 */
export async function extractVideoMetadata(
  videoUrl: string,
  providedDuration?: number,
): Promise<VideoMetadataExtraction> {
  const s3Key = extractS3Key(videoUrl);

  let fileSize = 0;
  try {
    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
      }),
    );
    fileSize = head.ContentLength || 0;
  } catch {}

  const duration = providedDuration ?? 30;
  const bitrate = fileSize > 0 ? Math.floor((fileSize * 8) / duration) : 5_000_000;

  let width = 1920,
    height = 1080;
  if (bitrate < 1_500_000) {
    width = 854;
    height = 480;
  } else if (bitrate < 3_000_000) {
    width = 1280;
    height = 720;
  }

  return { duration, width, height, codec: 'h264', bitrate, fps: 30 };
}

/**
 * Basic video validation
 */
export async function validateVideoFile(
  videoUrl: string,
  expectedDuration?: number,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const s3Key = extractS3Key(videoUrl);

  try {
    const head = await s3Client.send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
      }),
    );

    const ct = head.ContentType || '';
    if (!['video/mp4', 'video/quicktime', 'video/webm'].some(t => ct.includes(t))) {
      errors.push(`Unsupported format: ${ct}`);
    }

    const sizeMB = (head.ContentLength || 0) / (1024 * 1024);
    if (sizeMB > 100) errors.push(`File too large (${sizeMB.toFixed(1)} MB)`);
  } catch (err: any) {
    errors.push(`Cannot access file: ${err.message}`);
  }

  if (expectedDuration !== undefined) {
    if (expectedDuration < 8) errors.push(`Too short (${expectedDuration}s)`);
    if (expectedDuration > 60) errors.push(`Too long (${expectedDuration}s)`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Main entry point
 */
export async function processUploadedVideo(
  exploreVideoId: number,
  videoUrl: string,
  providedDuration?: number,
): Promise<{
  success: boolean;
  metadata: VideoMetadataExtraction;
  transcodingStatus: string;
  previewThumbnails: string[];
  mainThumbnail: string;
}> {
  const validation = await validateVideoFile(videoUrl, providedDuration);
  if (!validation.valid) throw new Error(`Validation failed: ${validation.errors.join(', ')}`);

  const metadata = await extractVideoMetadata(videoUrl, providedDuration);

  const mainThumbnail = await generateThumbnail(videoUrl, 2);
  const previewThumbnails = await generatePreviewThumbnails(videoUrl, metadata.duration, 5);

  const transcoding = await queueVideoForTranscoding(exploreVideoId, videoUrl);

  generateSpriteSheet(previewThumbnails, 10).catch(() => {});

  return {
    success: true,
    metadata,
    transcodingStatus: transcoding.status,
    previewThumbnails,
    mainThumbnail,
  };
}

/**
 * Webhook / callback handler
 */
export async function handleTranscodingComplete(
  exploreVideoId: number,
  jobId: string,
  outputUrls: Record<string, string>,
): Promise<void> {
  await db
    .update(exploreDiscoveryVideos)
    .set({
      transcodedUrls: JSON.stringify({
        status: 'completed',
        completedAt: new Date().toISOString(),
        jobId,
        ...outputUrls,
      }),
    } as any)
    .where(eq((exploreDiscoveryVideos as any).id, exploreVideoId));
}

/**
 * Query current transcoding status
 */
export async function getTranscodingStatus(
  exploreVideoId: number,
): Promise<{
  status: string;
  jobId?: string;
  completedAt?: string;
  error?: string;
  urls?: Record<string, string>;
}> {
  const rows = await db
    .select()
    .from(exploreDiscoveryVideos)
    .where(eq((exploreDiscoveryVideos as any).id, exploreVideoId))
    .limit(1);

  const video = rows[0];
  if (!video) throw new Error(`Video ${exploreVideoId} not found`);

  if (!(video as any).transcodedUrls) return { status: 'not_started' };

  const data =
    typeof (video as any).transcodedUrls === 'string'
      ? JSON.parse((video as any).transcodedUrls)
      : (video as any).transcodedUrls;

  return {
    status: data.status || 'unknown',
    jobId: data.jobId,
    completedAt: data.completedAt,
    error: data.error,
    urls:
      data.status === 'completed'
        ? {
            '1080p': data['1080p'],
            '720p': data['720p'],
            '480p': data['480p'],
          }
        : undefined,
  };
}

