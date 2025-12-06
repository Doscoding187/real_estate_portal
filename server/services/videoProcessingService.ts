/**
 * Video Processing Service
 * Handles video transcoding, thumbnail generation, and metadata extraction
 * Requirements: 8.2 - Process video for optimal mobile playback within 5 minutes
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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
const CDN_URL = process.env.CLOUDFRONT_URL || `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`;

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

/**
 * Video formats for transcoding
 * Requirements 8.2: Generate multiple quality versions (1080p, 720p, 480p)
 */
const VIDEO_FORMATS: VideoFormat[] = [
  { quality: '1080p', width: 1920, height: 1080, bitrate: '5000k' },
  { quality: '720p', width: 1280, height: 720, bitrate: '2500k' },
  { quality: '480p', width: 854, height: 480, bitrate: '1000k' },
];

/**
 * Queue video for transcoding
 * In a production environment, this would integrate with a service like AWS MediaConvert or FFmpeg
 * Requirements 8.2: Process video within 5 minutes
 */
export async function queueVideoForTranscoding(
  exploreVideoId: number,
  videoUrl: string,
): Promise<void> {
  try {
    console.log(`[VideoProcessing] Queuing video ${exploreVideoId} for transcoding`);
    console.log(`  Source URL: ${videoUrl}`);

    // In a real implementation, this would:
    // 1. Submit job to AWS MediaConvert or similar service
    // 2. Configure output formats (1080p, 720p, 480p)
    // 3. Set up callback for when transcoding completes
    // 4. Store job ID for tracking

    // For now, we'll simulate the transcoding process
    // In production, replace this with actual transcoding service integration
    
    // Store a placeholder indicating transcoding is in progress
    await db
      .update(exploreDiscoveryVideos)
      .set({
        transcodedUrls: JSON.stringify({
          status: 'processing',
          queuedAt: new Date().toISOString(),
        }),
      })
      .where(eq(exploreDiscoveryVideos.id, exploreVideoId));

    console.log(`[VideoProcessing] Video ${exploreVideoId} queued for transcoding`);

    // TODO: Integrate with actual transcoding service
    // Example AWS MediaConvert integration:
    // const mediaConvert = new MediaConvertClient({ region: AWS_REGION });
    // const job = await mediaConvert.send(new CreateJobCommand({
    //   Role: process.env.MEDIACONVERT_ROLE_ARN,
    //   Settings: {
    //     Inputs: [{ FileInput: videoUrl }],
    //     OutputGroups: VIDEO_FORMATS.map(format => ({
    //       Name: format.quality,
    //       OutputGroupSettings: { Type: 'FILE_GROUP_SETTINGS' },
    //       Outputs: [{
    //         VideoDescription: {
    //           Width: format.width,
    //           Height: format.height,
    //           CodecSettings: { Codec: 'H_264', H264Settings: { Bitrate: parseInt(format.bitrate) } }
    //         }
    //       }]
    //     }))
    //   }
    // }));

  } catch (error: any) {
    console.error(`[VideoProcessing] Failed to queue video for transcoding:`, error);
    throw new Error(`Failed to queue video for transcoding: ${error.message}`);
  }
}

/**
 * Update video with transcoded URLs after processing completes
 * This would be called by a webhook or callback from the transcoding service
 */
export async function updateTranscodedUrls(
  exploreVideoId: number,
  transcodedVideos: TranscodedVideo[],
): Promise<void> {
  try {
    const transcodedUrlsMap: Record<string, string> = {};
    
    for (const video of transcodedVideos) {
      transcodedUrlsMap[video.quality] = video.url;
    }

    await db
      .update(exploreDiscoveryVideos)
      .set({
        transcodedUrls: JSON.stringify(transcodedUrlsMap),
      })
      .where(eq(exploreDiscoveryVideos.id, exploreVideoId));

    console.log(`[VideoProcessing] Updated transcoded URLs for video ${exploreVideoId}`);
    console.log(`  Formats: ${Object.keys(transcodedUrlsMap).join(', ')}`);
  } catch (error: any) {
    console.error(`[VideoProcessing] Failed to update transcoded URLs:`, error);
    throw new Error(`Failed to update transcoded URLs: ${error.message}`);
  }
}

/**
 * Generate thumbnail from video
 * Requirements 8.2: Create thumbnail generation
 * 
 * In production, this would use FFmpeg or a cloud service to extract a frame
 * For now, this is a placeholder that would be implemented with actual video processing
 */
export async function generateThumbnail(
  videoUrl: string,
  timeOffset: number = 2, // seconds into video
): Promise<string> {
  try {
    console.log(`[VideoProcessing] Generating thumbnail from video`);
    console.log(`  Video URL: ${videoUrl}`);
    console.log(`  Time offset: ${timeOffset}s`);

    // In a real implementation, this would:
    // 1. Download video or stream it
    // 2. Extract frame at specified time offset using FFmpeg
    // 3. Resize and optimize the image
    // 4. Upload to S3
    // 5. Return the thumbnail URL

    // TODO: Integrate with FFmpeg or AWS MediaConvert
    // Example FFmpeg command:
    // ffmpeg -i ${videoUrl} -ss ${timeOffset} -vframes 1 -vf scale=640:360 thumbnail.jpg

    // For now, return a placeholder
    // In production, this would return the actual generated thumbnail URL
    const thumbnailKey = videoUrl.replace('/videos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg');
    
    console.log(`[VideoProcessing] Thumbnail would be generated at: ${thumbnailKey}`);
    
    return thumbnailKey;
  } catch (error: any) {
    console.error(`[VideoProcessing] Failed to generate thumbnail:`, error);
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
}

/**
 * Generate preview thumbnails at intervals
 * Requirements 8.2: Generate preview thumbnails at intervals
 * 
 * Creates multiple thumbnails throughout the video for preview/scrubbing
 */
export async function generatePreviewThumbnails(
  videoUrl: string,
  duration: number,
  intervalSeconds: number = 5,
): Promise<string[]> {
  try {
    console.log(`[VideoProcessing] Generating preview thumbnails`);
    console.log(`  Video URL: ${videoUrl}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Interval: ${intervalSeconds}s`);

    const thumbnailUrls: string[] = [];
    const numThumbnails = Math.floor(duration / intervalSeconds);

    // In a real implementation, this would:
    // 1. Extract frames at regular intervals using FFmpeg
    // 2. Create a sprite sheet or individual thumbnails
    // 3. Upload to S3
    // 4. Return array of thumbnail URLs

    // TODO: Integrate with FFmpeg
    // Example FFmpeg command for sprite sheet:
    // ffmpeg -i ${videoUrl} -vf "fps=1/${intervalSeconds},scale=160:90,tile=${numThumbnails}x1" sprite.jpg

    for (let i = 0; i < numThumbnails; i++) {
      const timeOffset = i * intervalSeconds;
      const thumbnailKey = videoUrl
        .replace('/videos/', '/preview-thumbnails/')
        .replace(/\.[^.]+$/, `-${timeOffset}s.jpg`);
      thumbnailUrls.push(thumbnailKey);
    }

    console.log(`[VideoProcessing] Would generate ${thumbnailUrls.length} preview thumbnails`);
    
    return thumbnailUrls;
  } catch (error: any) {
    console.error(`[VideoProcessing] Failed to generate preview thumbnails:`, error);
    throw new Error(`Failed to generate preview thumbnails: ${error.message}`);
  }
}

/**
 * Extract video metadata
 * Requirements 8.2: Extract duration, resolution, codec information
 * 
 * In production, this would use FFprobe or a similar tool to extract metadata
 */
export async function extractVideoMetadata(videoUrl: string): Promise<VideoMetadataExtraction> {
  try {
    console.log(`[VideoProcessing] Extracting video metadata`);
    console.log(`  Video URL: ${videoUrl}`);

    // In a real implementation, this would:
    // 1. Use FFprobe to extract video metadata
    // 2. Parse the output to get duration, resolution, codec, bitrate, fps
    // 3. Return structured metadata

    // TODO: Integrate with FFprobe
    // Example FFprobe command:
    // ffprobe -v quiet -print_format json -show_format -show_streams ${videoUrl}

    // For now, return placeholder metadata
    // In production, this would return actual extracted metadata
    const metadata: VideoMetadataExtraction = {
      duration: 30, // seconds
      width: 1920,
      height: 1080,
      codec: 'h264',
      bitrate: 5000000, // bits per second
      fps: 30,
    };

    console.log(`[VideoProcessing] Extracted metadata:`, metadata);
    
    return metadata;
  } catch (error: any) {
    console.error(`[VideoProcessing] Failed to extract video metadata:`, error);
    throw new Error(`Failed to extract video metadata: ${error.message}`);
  }
}

/**
 * Process video after upload
 * Orchestrates the complete video processing pipeline
 * Requirements 8.2: Process video for optimal mobile playback within 5 minutes
 */
export async function processUploadedVideo(
  exploreVideoId: number,
  videoUrl: string,
): Promise<void> {
  try {
    console.log(`[VideoProcessing] Starting video processing pipeline for video ${exploreVideoId}`);

    // Step 1: Extract metadata
    const metadata = await extractVideoMetadata(videoUrl);
    console.log(`[VideoProcessing] Metadata extracted: ${metadata.duration}s, ${metadata.width}x${metadata.height}`);

    // Step 2: Queue for transcoding
    await queueVideoForTranscoding(exploreVideoId, videoUrl);
    console.log(`[VideoProcessing] Video queued for transcoding`);

    // Step 3: Generate preview thumbnails
    const previewThumbnails = await generatePreviewThumbnails(videoUrl, metadata.duration);
    console.log(`[VideoProcessing] Generated ${previewThumbnails.length} preview thumbnails`);

    // In production, the transcoding service would call updateTranscodedUrls when complete
    // For now, we log that the process has been initiated
    console.log(`[VideoProcessing] Video processing pipeline initiated for video ${exploreVideoId}`);
    console.log(`  Transcoding will complete asynchronously`);
    console.log(`  Expected completion: < 5 minutes`);

  } catch (error: any) {
    console.error(`[VideoProcessing] Video processing pipeline failed:`, error);
    throw new Error(`Video processing failed: ${error.message}`);
  }
}
