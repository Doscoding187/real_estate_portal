/**
 * Video Processing Service
 * Handles video transcoding, thumbnail generation, and metadata extraction
 *
 * Phase 1: most processing is gated – only basic validation and thumbnails are active
 */

import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

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

// Gate for full video pipeline (transcoding, MediaConvert, etc.)
const VIDEO_PIPELINE_ENABLED = process.env.ENABLE_VIDEO_PIPELINE === 'true';

// MediaConvert (optional – only used when enabled)
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
 * Queue video for transcoding (Phase 1: mostly no-op unless pipeline enabled)
 */
export async function queueVideoForTranscoding(
  contentId: number,
  videoUrl: string,
): Promise<{ jobId?: string; status: string }> {
  console.warn(
    '[VideoProcessing] Pipeline disabled in Phase 1 ? skipping transcoding for content',
    contentId,
  );
  return { status: 'completed' };
}

/**
 * Placeholder – implement when adding @aws-sdk/client-mediaconvert
 */
async function submitMediaConvertJob(
  _inputPath: string,
  _outputPath: string,
  _contentId: number,
): Promise<string> {
  throw new Error(
    'MediaConvert not implemented. Add @aws-sdk/client-mediaconvert and set MEDIACONVERT_* env vars.',
  );
}

/**
 * Called after transcoding finishes (usually via webhook)
 */
export async function updateTranscodedUrls(
  _contentId: number,
  _transcodedVideos: TranscodedVideo[],
): Promise<void> {
  console.warn('[VideoProcessing] Pipeline disabled ? transcoded URLs not stored');
}

/**
 * Helper to extract S3 key from URL
 */
function extractS3Key(videoUrl: string): string {
  if (videoUrl.includes(S3_BUCKET_NAME)) {
    return videoUrl.split(`${S3_BUCKET_NAME}/`)[1] || videoUrl.split('.com/')[1] || '';
  }
  return videoUrl;
}

/**
 * Placeholder thumbnail generation
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
export async function generateSpriteSheet(
  thumbnailUrls: string[],
  _columns: number = 10,
): Promise<string> {
  if (thumbnailUrls.length === 0) return '';

  const firstKey = extractS3Key(thumbnailUrls[0]);
  const spriteKey = firstKey
    .replace('/preview-thumbnails/', '/sprites/')
    .replace(/-\d+s\.jpg$/, '-sprite.jpg');

  return `${CDN_URL}/${spriteKey}`;
}

/**
 * Very basic metadata estimation (used when real extraction is not available)
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
 * Basic video file validation
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
 * Main entry point – Phase 1: limited to validation + thumbnails
 */
export async function processUploadedVideo(
  contentId: number,
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
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const metadata = await extractVideoMetadata(videoUrl, providedDuration);

  const mainThumbnail = await generateThumbnail(videoUrl, 2);
  const previewThumbnails = await generatePreviewThumbnails(videoUrl, metadata.duration, 5);

  let transcodingStatus = 'not_started';

  if (VIDEO_PIPELINE_ENABLED) {
    const transcoding = await queueVideoForTranscoding(contentId, videoUrl);
    transcodingStatus = transcoding.status;
  } else {
    // In Phase 1 we assume original is good enough
    transcodingStatus = 'completed';
  }

  generateSpriteSheet(previewThumbnails, 10).catch(() => {});

  return {
    success: true,
    metadata,
    transcodingStatus,
    previewThumbnails,
    mainThumbnail,
  };
}

/**
 * Webhook / callback handler
 */
export async function handleTranscodingComplete(
  _contentId: number,
  _jobId: string,
  _outputUrls: Record<string, string>,
): Promise<void> {
  console.warn('[VideoProcessing] Transcoding completion ignored (no transcoded_urls column).');
}

/**
 * Query current transcoding status
 */
export async function getTranscodingStatus(_contentId: number): Promise<{
  status: string;
  jobId?: string;
  completedAt?: string;
  error?: string;
  urls?: Record<string, string>;
}> {
  return { status: 'not_started' };
}
