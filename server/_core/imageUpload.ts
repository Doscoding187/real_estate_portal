/**
 * Image Upload Service
 * Handles image uploads with automatic resizing and WebP conversion
 * Supports both Manus Storage Proxy and AWS S3 + CloudFront
 */

import { nanoid } from 'nanoid';
import { storagePut, storageGet } from '../storage';
import { ENV } from './env';
import { PutObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import crypto from 'crypto';

// Check if AWS S3 is configured
const useS3 = Boolean(
  ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsRegion && ENV.s3BucketName,
);

let s3Client: S3Client | null = null;

if (useS3) {
  s3Client = new S3Client({
    region: ENV.awsRegion,
    credentials: {
      accessKeyId: ENV.awsAccessKeyId,
      secretAccessKey: ENV.awsSecretAccessKey,
    },
  });
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
  const fileId = crypto.randomUUID();
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
 * @param propertyId - Property ID for organizing uploads
 * @returns Object containing upload URL and key
 */
export async function generatePresignedUploadUrl(
  filename: string,
  contentType: string,
  propertyId: string,
): Promise<{ uploadUrl: string; key: string }> {
  if (!useS3 || !s3Client) {
    throw new Error('S3 not configured');
  }

  try {
    // Generate a unique key for the file
    const fileExtension = filename.split('.').pop() || 'jpg';
    const key = `properties/${propertyId}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry

    return { uploadUrl, key };
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    throw new Error('Failed to generate upload URL');
  }
}
