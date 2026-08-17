import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import {
  buildLocalMediaPublicUrl,
  buildLocalMediaUploadUrl,
  createLocalMediaKey,
  getMediaStorageAdapter,
  resolveMediaDeliveryUrl,
} from './_core/mediaStorage';
import { createListingMediaUploadToken } from './services/listingMediaAuthority';
import { randomUUID } from 'crypto';
import { TRPCError } from '@trpc/server';

type LocalUploadMediaType = 'image' | 'video' | 'pdf';

function inferLocalUploadMediaType(contentType: string): LocalUploadMediaType | null {
  const normalized = contentType.trim().toLowerCase();
  if (/^image\/(jpeg|png|webp|gif|avif)$/.test(normalized)) return 'image';
  if (/^video\/(mp4|webm|quicktime|x-matroska)$/.test(normalized)) return 'video';
  if (normalized === 'application/pdf') return 'pdf';
  return null;
}

/**
 * Upload Router
 * Handles adapter-aware direct uploads while retaining the legacy response
 * shape used by profile, publisher, distribution, and development flows.
 */
export const uploadRouter = router({
  /**
   * Generate a direct upload target.
   *
   * Local development uses the governed local-media route and a signed upload
   * reservation. S3 remains the only permitted production adapter.
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
      console.log(
        `[UploadRouter] Presign requested for file: ${input.filename}, type: ${input.contentType}`,
      );
      try {
        const user = requireUser(ctx);

        if (getMediaStorageAdapter() === 'local') {
          const mediaType = inferLocalUploadMediaType(input.contentType);
          if (!mediaType) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Local media uploads require an image, video, or PDF content type.',
            });
          }

          // The legacy endpoint does not receive an authorized listing ID. Keep
          // its local objects user-scoped rather than trusting the optional,
          // historically client-controlled propertyId for storage authority.
          const key = createLocalMediaKey(input.filename, `draft-${user.id}`);
          const uploadToken = createListingMediaUploadToken({
            key,
            mediaType,
            contentType: input.contentType,
            fileName: input.filename,
            userId: user.id,
            listingId: null,
          });

          return {
            url: buildLocalMediaUploadUrl(uploadToken),
            key,
            publicUrl: buildLocalMediaPublicUrl(key),
            uploadToken,
          };
        }

        // Generate a unique property ID if not provided
        const propertyId = input.propertyId || randomUUID();

        // Import the S3 helper only for the explicitly selected S3 adapter.
        const { generatePresignedUploadUrl } = await import('./_core/imageUpload');
        const result = await generatePresignedUploadUrl(
          input.filename,
          input.contentType,
          propertyId,
        );

        console.log(`[UploadRouter] generated presigned URL successfully`);

        const publicUrl = resolveMediaDeliveryUrl(result.key) || result.key;

        return {
          url: result.uploadUrl,
          key: result.key,
          publicUrl,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

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
