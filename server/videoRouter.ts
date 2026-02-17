import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Video Router - temporarily stubbed while schema is aligned.
 */
export const videoRouter = router({
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('Video upload is not configured. Please contact support.');
      }

      const bucketName = process.env.AWS_S3_BUCKET || 'listify-properties-sa';
      const region = process.env.AWS_REGION || 'eu-north-1';
      const timestamp = Date.now();
      const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `videos/${timestamp}-${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: input.fileType,
        ChecksumAlgorithm: undefined,
      });

      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return {
        uploadUrl: presignedUrl,
        videoUrl: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
      };
    }),

  uploadVideo: protectedProcedure
    .input(
      z.object({
        propertyId: z.number().optional(),
        developmentId: z.number().optional(),
        videoUrl: z.string(),
        caption: z.string().optional(),
        type: z.enum(['listing', 'content']),
        duration: z.number().max(60).default(0),
      }),
    )
    .mutation(async () => {
      throw new Error('Video features are temporarily disabled: schema mismatch');
    }),

  getVideos: publicProcedure.query(async () => []),

  getVideosByType: publicProcedure
    .input(
      z.object({
        type: z.enum(['listing', 'content']).optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async () => []),

  toggleLike: protectedProcedure.input(z.object({ videoId: z.number() })).mutation(async () => {
    throw new Error('Video features are temporarily disabled: schema mismatch');
  }),

  incrementViews: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async () => ({ success: true })),

  contactAgent: publicProcedure
    .input(
      z.object({
        agentId: z.number(),
        videoId: z.number().optional(),
        propertyId: z.number().optional(),
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        message: z.string(),
      }),
    )
    .mutation(async () => {
      throw new Error('Video features are temporarily disabled: schema mismatch');
    }),

  getAgentVideos: protectedProcedure
    .input(
      z.object({
        agentId: z.number().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async () => []),

  deleteVideo: protectedProcedure.input(z.object({ videoId: z.number() })).mutation(async () => {
    throw new Error('Video features are temporarily disabled: schema mismatch');
  }),
});
