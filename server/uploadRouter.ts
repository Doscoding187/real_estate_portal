import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { requireUser } from './_core/requireUser';
import {
  buildLocalMediaPublicUrl,
  buildLocalMediaUploadUrl,
  createMediaStorageKey,
  getMediaStorageAdapter,
  resolveMediaDeliveryUrl,
} from './_core/mediaStorage';
import { createListingMediaUploadToken } from './services/listingMediaAuthority';
import { TRPCError } from '@trpc/server';

type LocalUploadMediaType = 'image' | 'video' | 'pdf';

function inferUploadMediaType(contentType: string): LocalUploadMediaType | null {
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
        // Kept only for wire compatibility with older clients. It is never
        // used as a storage scope without a Listing-level custody assertion.
        propertyId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log(
        `[UploadRouter] Presign requested for file: ${input.filename}, type: ${input.contentType}`,
      );
      try {
        const user = requireUser(ctx);
        const mediaType = inferUploadMediaType(input.contentType);
        if (!mediaType) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Media uploads require an image, video, or PDF content type.',
          });
        }

        // This legacy endpoint does not receive a Listing ID with an
        // authorization proof. Its objects must remain within the caller's
        // draft namespace for every adapter, including S3.
        const storageScope = `draft-${user.id}`;

        if (getMediaStorageAdapter() === 'local') {
          const key = createMediaStorageKey(input.filename, storageScope);
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

        // Import the S3 helper only for the explicitly selected S3 adapter.
        const { generatePresignedUploadUrl } = await import('./_core/imageUpload');
        const result = await generatePresignedUploadUrl(
          input.filename,
          input.contentType,
          storageScope,
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
