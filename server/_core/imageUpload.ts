/**
 * Image Upload Service
 * Handles image uploads with automatic resizing and WebP conversion
 * Supports both Manus Storage Proxy and AWS S3 + CloudFront
 */

import { nanoid } from 'nanoid';
import { storagePut, storageGet } from '../storage';
import { ENV } from './env';
import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import {
  createMediaStorageKey,
  getMediaStorageAdapter,
  inspectLocalMediaObject,
} from './mediaStorage';

// The PLE listing route selects its storage adapter before reaching this
// helper. Keep the legacy helper aligned with that selection so local
// development does not look like an S3 failure in server logs.
const selectedMediaStorageAdapter = getMediaStorageAdapter();
const useS3 = Boolean(
  selectedMediaStorageAdapter === 's3' &&
  ENV.awsAccessKeyId &&
  ENV.awsSecretAccessKey &&
  ENV.awsRegion &&
  ENV.s3BucketName,
);

let s3Client: S3Client | null = null;

if (useS3) {
  console.log('✅ AWS S3 Configuration detected:');
  console.log(`   Region: ${ENV.awsRegion}`);
  console.log(`   Bucket: ${ENV.s3BucketName}`);
  console.log(`   CloudFront: ${ENV.cloudFrontUrl || 'Not configured (using S3 direct)'}`);
  const maskedKey = ENV.awsAccessKeyId
    ? `${ENV.awsAccessKeyId.slice(0, 4)}...${ENV.awsAccessKeyId.slice(-4)}`
    : 'N/A';
  console.log(`   AccessKeyId: ${maskedKey}`);

  s3Client = new S3Client({
    region: ENV.awsRegion,
    credentials: {
      accessKeyId: ENV.awsAccessKeyId,
      secretAccessKey: ENV.awsSecretAccessKey,
    },
  });
} else if (selectedMediaStorageAdapter === 's3') {
  console.warn('⚠️  AWS S3 not fully configured. Missing:');
  if (!ENV.awsAccessKeyId) console.warn('   - AWS_ACCESS_KEY_ID');
  if (!ENV.awsSecretAccessKey) console.warn('   - AWS_SECRET_ACCESS_KEY');
  if (!ENV.awsRegion) console.warn('   - AWS_REGION');
  if (!ENV.s3BucketName) console.warn('   - S3_BUCKET_NAME');
  console.warn('   Falling back to storage proxy for image uploads');
} else {
  console.log(
    'ℹ️  Local listing media adapter selected; legacy image uploads use the storage proxy.',
  );
}

// Image sizes to generate
const IMAGE_SIZES = {
  thumbnail: { width: 320, height: 240, quality: 75 },
  small: { width: 640, height: 480, quality: 80 },
  medium: { width: 1280, height: 960, quality: 85 },
  large: { width: 1920, height: 1440, quality: 85 },
} as const;

export interface ImageUrls {
  original: string;
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
}

/**
 * Upload property image with automatic resizing to multiple sizes
 * Converts to WebP format for optimal performance
 * @param fileBuffer - Original image buffer
 * @param propertyId - Property ID for organizing uploads
 * @param filename - Original filename
 * @returns URLs for all image sizes
 */
export async function uploadPropertyImage(
  fileBuffer: Buffer,
  propertyId: string,
  filename: string,
): Promise<ImageUrls> {
  const fileId = randomUUID();
  const baseKey = `properties/${propertyId}/${fileId}`;
  const urls: Partial<ImageUrls> = {};

  if (useS3 && s3Client) {
    try {
      // Upload each size variant
      for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
        const processedBuffer = await sharp(fileBuffer)
          .resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: config.quality })
          .toBuffer();

        const key = `${baseKey}-${sizeName}.webp`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: ENV.s3BucketName,
            Key: key,
            Body: processedBuffer,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
            Metadata: {
              originalName: filename,
              propertyId,
              size: sizeName,
            },
          }),
        );

        const cdnUrl =
          ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`;
        urls[sizeName as keyof ImageUrls] = `${cdnUrl}/${key}`;
      }

      // Upload original (high quality WebP)
      const originalBuffer = await sharp(fileBuffer).webp({ quality: 90 }).toBuffer();

      const originalKey = `${baseKey}-original.webp`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: ENV.s3BucketName,
          Key: originalKey,
          Body: originalBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            originalName: filename,
            propertyId,
          },
        }),
      );

      const cdnUrl =
        ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`;
      urls.original = `${cdnUrl}/${originalKey}`;

      return urls as ImageUrls;
    } catch (error) {
      console.error('S3 image upload failed:', error);
      throw new Error('Failed to upload image to S3');
    }
  } else {
    // Fallback to storage proxy - upload only medium size
    try {
      const processedBuffer = await sharp(fileBuffer)
        .resize(1280, 960, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const key = `properties/${propertyId}/${nanoid()}.webp`;
      const result = await storagePut(key, processedBuffer, 'image/webp');

      // Return same URL for all sizes (not optimal but works)
      return {
        original: result.url,
        thumbnail: result.url,
        small: result.url,
        medium: result.url,
        large: result.url,
      };
    } catch (error) {
      console.error('Storage proxy upload failed:', error);
      throw new Error('Failed to upload image');
    }
  }
}

/**
 * Delete all image variants for a property
 * @param imageUrls - Array of image URLs to delete
 */
export async function deletePropertyImages(imageUrls: string[]): Promise<void> {
  if (!useS3 || !s3Client) {
    console.warn('S3 not configured, image deletion skipped');
    return;
  }

  const cdnUrl =
    ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`;

  const deletePromises = imageUrls.map(url => {
    const key = url.replace(`${cdnUrl}/`, '');
    return s3Client!.send(
      new DeleteObjectCommand({
        Bucket: ENV.s3BucketName,
        Key: key,
      }),
    );
  });

  try {
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Failed to delete images from S3:', error);
    throw new Error('Failed to delete images');
  }
}

/**
 * Generate presigned URL for S3 upload
 * @param filename - Name of the file to upload
 * @param contentType - MIME type of the file
 * @param propertyId - Server-authorized Listing or user-draft storage scope
 * @returns Object containing upload URL and key
 */
export async function generatePresignedUploadUrl(
  filename: string,
  contentType: string,
  propertyId: string,
): Promise<{ uploadUrl: string; key: string }> {
  if (!useS3 || !s3Client) {
    throw new Error(
      'AWS S3 is not configured. Please check your environment variables (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME)',
    );
  }

  try {
    // Scope and filename are validated by the shared adapter-neutral helper.
    // S3 has no path traversal semantics, but an unchecked key prefix would
    // still let a caller write into another tenant's logical namespace.
    const key = createMediaStorageKey(filename, propertyId);

    console.log(`[S3] Generating presigned URL for: ${key}`);

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry

    console.log(`[S3] Presigned URL generated successfully for: ${key}`);

    return { uploadUrl, key };
  } catch (error) {
    console.error('[S3] Failed to generate presigned URL:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate upload URL: ${error.message}`);
    }
    throw new Error('Failed to generate upload URL');
  }
}

/**
 * Confirm that a direct upload actually exists before its reference is
 * accepted into canonical listing_media. The browser never gets to promote a
 * presigned key into listing authority merely by posting the key back.
 */
export async function assertUploadedMediaObject(
  key: string,
  expectedContentType: string,
): Promise<{ contentType: string | null; contentLength: number | null }> {
  if (!key || key.includes('..') || key.startsWith('/')) {
    throw new Error('Invalid uploaded media key.');
  }

  if (getMediaStorageAdapter() === 'local') {
    const result = await inspectLocalMediaObject(key, expectedContentType);
    return {
      contentType: result.contentType,
      contentLength: result.contentLength,
    };
  }

  if (useS3 && s3Client) {
    const result = await s3Client.send(
      new HeadObjectCommand({
        Bucket: ENV.s3BucketName,
        Key: key,
      }),
    );
    const contentType = result.ContentType?.toLowerCase() || null;
    if (contentType && contentType !== expectedContentType.toLowerCase()) {
      throw new Error('Uploaded media content type does not match its confirmation.');
    }
    return {
      contentType,
      contentLength: result.ContentLength == null ? null : Number(result.ContentLength),
    };
  }

  // The presigned listing-media route is S3-backed. Keep the fallback
  // explicit rather than claiming a storage-proxy key was verified when the
  // proxy does not expose a reliable HEAD contract here.
  throw new Error('Uploaded media storage is unavailable for verification.');
}
