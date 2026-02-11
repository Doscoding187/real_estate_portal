import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { generatePresignedUploadUrl } from './_core/imageUpload';
import { ENV } from './_core/env';
import { randomUUID } from 'crypto';
import { TRPCError } from '@trpc/server';

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
    .mutation(async ({ ctx: _ctx, input }) => {
      console.log(
        `[UploadRouter] Presign requested for file: ${input.filename}, type: ${input.contentType}`,
      );
      try {
        // Generate a unique property ID if not provided
        const propertyId = input.propertyId || randomUUID();

        // Generate presigned URL
        const result = await generatePresignedUploadUrl(
          input.filename,
          input.contentType,
          propertyId,
        );

        console.log(`[UploadRouter] generated presigned URL successfully`);

        // Build the public URL using CloudFront if configured, otherwise S3 bucket URL
        const cdnUrl =
          ENV.cloudFrontUrl || `https://${ENV.s3BucketName}.s3.${ENV.awsRegion}.amazonaws.com`;
        const publicUrl = `${cdnUrl}/${result.key}`;

        return {
          url: result.uploadUrl,
          key: result.key,
          publicUrl,
        };
      } catch (error) {
        console.error('[UploadRouter] Failed to generate presigned URL:', error);
        // Log the stack trace if available
        if (error instanceof Error) {
          console.error(error.stack);
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate upload URL. Please check server logs.',
          cause: error,
        });
      }
    }),
});
