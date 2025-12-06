# Explore Video Processing - Quick Reference

## Overview

The video processing service handles transcoding, thumbnail generation, and metadata extraction for Explore Discovery Engine videos.

## Quick Start

### 1. Upload and Process a Video

```typescript
// In your upload handler
import { processUploadedVideo } from './services/videoProcessingService';

// After video is uploaded to S3
const result = await processUploadedVideo(
  exploreVideoId,
  videoUrl,
  duration // optional
);

console.log(result.transcodingStatus); // 'queued', 'processing', or 'completed'
```

### 2. Check Processing Status

```typescript
// Using tRPC
const status = await trpc.exploreVideoUpload.getTranscodingStatus.query({
  exploreVideoId: 123
});

console.log(status.data.status); // Current status
console.log(status.data.urls); // Available quality URLs (if completed)
```

### 3. Validate Video Before Upload

```typescript
// Using tRPC
const validation = await trpc.exploreVideoUpload.validateVideoFile.query({
  videoUrl: 's3://bucket/video.mp4',
  duration: 30
});

if (!validation.valid) {
  console.error(validation.errors);
}
```

## API Reference

### Video Processing Functions

#### `processUploadedVideo(exploreVideoId, videoUrl, duration?)`
Orchestrates the complete video processing pipeline.

**Returns:**
```typescript
{
  success: boolean;
  metadata: {
    duration: number;
    width: number;
    height: number;
    codec: string;
    bitrate: number;
    fps: number;
  };
  transcodingStatus: string;
  previewThumbnails: string[];
  mainThumbnail: string;
}
```

#### `queueVideoForTranscoding(exploreVideoId, videoUrl)`
Submits video to transcoding queue (AWS MediaConvert or fallback).

**Returns:**
```typescript
{
  jobId?: string;
  status: 'queued' | 'processing' | 'completed';
}
```

#### `extractVideoMetadata(videoUrl, providedDuration?)`
Extracts or estimates video metadata.

**Returns:**
```typescript
{
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  fps: number;
}
```

#### `validateVideoFile(videoUrl, expectedDuration?)`
Validates video file format, size, and duration.

**Returns:**
```typescript
{
  valid: boolean;
  errors: string[];
}
```

#### `generateThumbnail(videoUrl, timeOffset?)`
Generates main thumbnail at specified time offset (default: 2s).

**Returns:** `string` (thumbnail URL)

#### `generatePreviewThumbnails(videoUrl, duration, intervalSeconds?)`
Generates preview thumbnails at regular intervals (default: 5s).

**Returns:** `string[]` (array of thumbnail URLs)

#### `getTranscodingStatus(exploreVideoId)`
Gets current transcoding status for a video.

**Returns:**
```typescript
{
  status: string;
  jobId?: string;
  completedAt?: string;
  error?: string;
  urls?: {
    '1080p': string;
    '720p': string;
    '480p': string;
  };
}
```

## tRPC Endpoints

### `exploreVideoUpload.getTranscodingStatus`
```typescript
const status = await trpc.exploreVideoUpload.getTranscodingStatus.query({
  exploreVideoId: 123
});
```

### `exploreVideoUpload.validateVideoFile`
```typescript
const validation = await trpc.exploreVideoUpload.validateVideoFile.query({
  videoUrl: 's3://bucket/video.mp4',
  duration: 30
});
```

### `exploreVideoUpload.updateTranscodedUrls`
```typescript
// Called by webhook
await trpc.exploreVideoUpload.updateTranscodedUrls.mutate({
  exploreVideoId: 123,
  transcodedVideos: [
    { quality: '1080p', url: '...', width: 1920, height: 1080 },
    { quality: '720p', url: '...', width: 1280, height: 720 },
    { quality: '480p', url: '...', width: 854, height: 480 }
  ]
});
```

## Configuration

### Required Environment Variables
```env
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=listify-properties-sa
CLOUDFRONT_URL=https://your-cdn.cloudfront.net
```

### Optional (for MediaConvert)
```env
MEDIACONVERT_ENDPOINT=https://your-endpoint.mediaconvert.region.amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::account:role/MediaConvertRole
MEDIACONVERT_QUEUE_ARN=arn:aws:mediaconvert:region:account:queues/Default
```

## Processing States

### Status Flow
```
not_started → queued → processing → completed
                                  ↘ failed
```

### Status Meanings
- **not_started**: No processing initiated
- **queued**: Submitted to processing queue
- **processing**: Currently transcoding
- **completed**: All outputs ready
- **failed**: Processing error occurred

## Video Quality Formats

The system generates three quality versions:

| Quality | Resolution | Bitrate | Use Case |
|---------|-----------|---------|----------|
| 1080p   | 1920x1080 | 5000k   | High-quality displays |
| 720p    | 1280x720  | 2500k   | Standard mobile/desktop |
| 480p    | 854x480   | 1000k   | Low bandwidth/older devices |

## Validation Rules

### File Format
- Supported: MP4, MOV, AVI, WebM
- Content-Type must match video format

### File Size
- Maximum: 100MB
- Minimum: > 0 bytes

### Duration
- Minimum: 8 seconds
- Maximum: 60 seconds

## Error Handling

### Common Errors

#### "Video validation failed"
- Check file format (must be MP4, MOV, AVI, or WebM)
- Check file size (max 100MB)
- Check duration (8-60 seconds)

#### "Video file not accessible"
- Verify S3 URL is correct
- Check AWS credentials
- Verify bucket permissions

#### "Failed to queue video for transcoding"
- Check MediaConvert configuration
- Verify IAM role permissions
- Check S3 bucket access

### Error Recovery

```typescript
try {
  const result = await processUploadedVideo(videoId, videoUrl, duration);
} catch (error) {
  console.error('Processing failed:', error.message);
  
  // Check status to see what failed
  const status = await getTranscodingStatus(videoId);
  console.log('Current status:', status);
  
  // Retry if needed
  if (status.status === 'failed') {
    // Retry logic here
  }
}
```

## Monitoring

### Check Processing Progress

```typescript
// Poll for status updates
const checkStatus = async (videoId: number) => {
  const status = await getTranscodingStatus(videoId);
  
  if (status.status === 'completed') {
    console.log('Processing complete!');
    console.log('Available qualities:', Object.keys(status.urls || {}));
  } else if (status.status === 'failed') {
    console.error('Processing failed:', status.error);
  } else {
    console.log('Still processing...');
    // Check again in 30 seconds
    setTimeout(() => checkStatus(videoId), 30000);
  }
};
```

### Database Query

```sql
-- Check transcoding status directly
SELECT 
  id,
  video_url,
  transcoded_urls->>'status' as status,
  transcoded_urls->>'jobId' as job_id,
  created_at
FROM explore_discovery_videos
WHERE id = 123;
```

## Fallback Mode

When MediaConvert is not configured, the system:
1. Uses original video for all quality versions
2. Marks status as 'completed' immediately
3. Adds note: "Using original video (MediaConvert not configured)"

This allows development and testing without full AWS setup.

## Production Setup

### 1. Create MediaConvert IAM Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```

### 2. Create MediaConvert Queue

```bash
aws mediaconvert create-queue \
  --name ExploreVideoQueue \
  --region eu-north-1
```

### 3. Get MediaConvert Endpoint

```bash
aws mediaconvert describe-endpoints \
  --region eu-north-1
```

### 4. Set Environment Variables

Add the values to your `.env` file.

### 5. Create Webhook Endpoint

```typescript
// POST /api/webhooks/mediaconvert
export async function handleMediaConvertWebhook(req, res) {
  const { detail } = req.body;
  
  if (detail.status === 'COMPLETE') {
    const videoId = parseInt(detail.userMetadata.exploreVideoId);
    const outputUrls = extractOutputUrls(detail.outputGroupDetails);
    
    await handleTranscodingComplete(videoId, detail.jobId, outputUrls);
  }
  
  res.json({ success: true });
}
```

## Performance Tips

### 1. Async Processing
Always process videos asynchronously:
```typescript
// Good: Non-blocking
processUploadedVideo(videoId, url).catch(console.error);
return { success: true, message: 'Processing started' };

// Bad: Blocking
await processUploadedVideo(videoId, url);
return { success: true };
```

### 2. Status Polling
Use exponential backoff for status checks:
```typescript
const delays = [5000, 10000, 30000, 60000]; // 5s, 10s, 30s, 1m
```

### 3. Caching
Cache transcoded URLs in Redis:
```typescript
await redis.set(`video:${videoId}:urls`, JSON.stringify(urls), 'EX', 3600);
```

## Troubleshooting

### Video Not Processing
1. Check MediaConvert configuration
2. Verify IAM role permissions
3. Check CloudWatch logs
4. Verify S3 bucket access

### Thumbnails Not Generating
1. Check MediaConvert thumbnail settings
2. Verify output path permissions
3. Check for FFmpeg availability (if using)

### Slow Processing
1. Check MediaConvert queue priority
2. Verify video file size
3. Check network bandwidth
4. Consider reserved capacity

## Support

For issues or questions:
1. Check CloudWatch logs for MediaConvert jobs
2. Review S3 bucket permissions
3. Verify environment variables
4. Check database transcoded_urls column

## Related Documentation

- [AWS MediaConvert Documentation](https://docs.aws.amazon.com/mediaconvert/)
- [Explore Discovery Engine Design](.kiro/specs/explore-discovery-engine/design.md)
- [Task 2 Complete Summary](.kiro/specs/explore-discovery-engine/TASK_2_COMPLETE.md)
