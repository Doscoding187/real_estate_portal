import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { generatePresignedUploadUrl } from './_core/imageUpload';
import crypto from 'crypto';

/**
 * Upload Router
 * Handles file uploads to S3/CloudFront with presigned URLs
 */
export const uploadRouter = router({
  /**
   * Generate presigned URL for direct S3 upload
   * This allows the client to upload directly to S3 without going through the server
   */
  presign: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        propertyId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Generate a unique property ID if not provided
        const propertyId = input.propertyId || crypto.randomUUID();

        // Generate presigned URL
        const result = await generatePresignedUploadUrl(
          input.filename,
          input.contentType,
          propertyId,
        );

        return {
          url: result.uploadUrl,
          key: result.key,
        };
      } catch (error) {
        console.error('Failed to generate presigned URL:', error);
        throw new Error('Failed to generate upload URL. Please check your AWS configuration.');
      }
    }),
});
