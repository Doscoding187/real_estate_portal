import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import {
  videos,
  videoLikes,
  properties,
  agents,
  developments,
  users,
  leads,
} from '../drizzle/schema';
import { eq, and, desc, count, sql, like } from 'drizzle-orm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'af-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Video Router - TikTok-style explore feed functionality
 */
export const videoRouter = router({
  // Generate presigned URL for S3 upload
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Validate AWS credentials
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('AWS credentials not configured');
        throw new Error('Video upload is not configured. Please contact support.');
      }

      const bucketName = process.env.AWS_S3_BUCKET || 'real-estate-portal-videos';
      
      // Generate unique key with timestamp
      const timestamp = Date.now();
      const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `videos/${timestamp}-${sanitizedFileName}`;

      try {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: input.fileType,
          ChecksumAlgorithm: undefined, // Explicitly disable checksum to prevent CORS/Signature issues
        });

        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

        console.log(`Generated presigned URL for: ${key}`);

        return {
          uploadUrl: presignedUrl,
          videoUrl: `https://${bucketName}.s3.af-south-1.amazonaws.com/${key}`,
        };
      } catch (error: any) {
        console.error('Failed to generate presigned URL:', error);
        throw new Error(`Failed to generate upload URL: ${error.message}`);
      }
    }),

  // Upload video with S3 presigned URL
  uploadVideo: protectedProcedure
    .input(
      z.object({
        propertyId: z.number().optional(),
        developmentId: z.number().optional(),
        videoUrl: z.string(),
        caption: z.string().optional(),
        type: z.enum(['listing', 'content']),
        duration: z.number().max(60).default(0), // Max 60 seconds
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is an agent
      if (
        ctx.user.role !== 'agent' &&
        ctx.user.role !== 'agency_admin' &&
        ctx.user.role !== 'super_admin'
      ) {
        throw new Error('Only agents can upload videos');
      }

      const agent = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agent[0]) {
        throw new Error('Agent profile not found');
      }

      // Validate listing video has property
      if (input.type === 'listing' && !input.propertyId && !input.developmentId) {
        throw new Error('Listing videos must be linked to a property or development');
      }

      const newVideo = await ctx.db
        .insert(videos)
        .values({
          agentId: agent[0].id,
          propertyId: input.propertyId,
          developmentId: input.developmentId,
          videoUrl: input.videoUrl,
          caption: input.caption,
          type: input.type,
          duration: input.duration,
        })
        .returning();

      return newVideo[0];
    }),

  // Get all videos for the explore feed
  getVideos: publicProcedure.query(async ({ ctx }) => {
    const videosWithData = await ctx.db
      .select({
        id: videos.id,
        videoUrl: videos.videoUrl,
        caption: videos.caption,
        type: videos.type,
        duration: videos.duration,
        views: videos.views,
        likes: videos.likes,
        shares: videos.shares,
        createdAt: videos.createdAt,
        // Property data for listing videos
        propertyId: properties.id,
        propertyTitle: properties.title,
        propertyLocation: properties.address,
        propertyPrice: properties.price,
        // Development data
        developmentId: developments.id,
        developmentName: developments.name,
        // Agent data
        agentId: agents.id,
        agentName: agents.displayName,
        agentFirstName: agents.firstName,
        agentLastName: agents.lastName,
        agentEmail: agents.email,
        // User like status (for authenticated users)
        userLiked: videoLikes.id,
      })
      .from(videos)
      .leftJoin(properties, eq(videos.propertyId, properties.id))
      .leftJoin(agents, eq(videos.agentId, agents.id))
      .leftJoin(developments, eq(videos.developmentId, developments.id))
      .leftJoin(
        videoLikes,
        and(
          eq(videoLikes.videoId, videos.id),
          ctx.user?.id ? eq(videoLikes.userId, ctx.user.id) : sql`1=0`, // Always false if no user
        ),
      )
      .where(eq(videos.isPublished, 1))
      .orderBy(desc(videos.createdAt))
      .limit(50);

    return videosWithData.map(video => ({
      ...video,
      isLiked: !!video.userLiked,
      userLiked: undefined, // Remove internal field
    }));
  }),

  // Get videos by type (listing or content)
  getVideosByType: publicProcedure
    .input(
      z.object({
        type: z.enum(['listing', 'content']).optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereCondition = input.type
        ? and(eq(videos.isPublished, 1), eq(videos.type, input.type))
        : eq(videos.isPublished, 1);

      const videosWithData = await ctx.db
        .select({
          id: videos.id,
          videoUrl: videos.videoUrl,
          caption: videos.caption,
          type: videos.type,
          duration: videos.duration,
          views: videos.views,
          likes: videos.likes,
          shares: videos.shares,
          createdAt: videos.createdAt,
          propertyId: properties.id,
          propertyTitle: properties.title,
          propertyLocation: properties.address,
          propertyPrice: properties.price,
          developmentId: developments.id,
          developmentName: developments.name,
          agentId: agents.id,
          agentName: agents.displayName,
          agentFirstName: agents.firstName,
          agentLastName: agents.lastName,
          agentEmail: agents.email,
          userLiked: videoLikes.id,
        })
        .from(videos)
        .leftJoin(properties, eq(videos.propertyId, properties.id))
        .leftJoin(agents, eq(videos.agentId, agents.id))
        .leftJoin(developments, eq(videos.developmentId, developments.id))
        .leftJoin(
          videoLikes,
          and(
            eq(videoLikes.videoId, videos.id),
            ctx.user?.id ? eq(videoLikes.userId, ctx.user.id) : sql`1=0`,
          ),
        )
        .where(whereCondition)
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);

      return videosWithData.map(video => ({
        ...video,
        isLiked: !!video.userLiked,
        userLiked: undefined,
      }));
    }),

  // Toggle like/unlike on a video
  toggleLike: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existingLike = await ctx.db
        .select()
        .from(videoLikes)
        .where(and(eq(videoLikes.videoId, input.videoId), eq(videoLikes.userId, ctx.user.id)))
        .limit(1);

      if (existingLike[0]) {
        // Unlike - remove the like
        await ctx.db.delete(videoLikes).where(eq(videoLikes.id, existingLike[0].id));

        // Decrement likes count
        await ctx.db
          .update(videos)
          .set({ likes: sql`likes - 1` })
          .where(eq(videos.id, input.videoId));

        return { liked: false };
      } else {
        // Like - add the like
        await ctx.db.insert(videoLikes).values({
          videoId: input.videoId,
          userId: ctx.user.id,
        });

        // Increment likes count
        await ctx.db
          .update(videos)
          .set({ likes: sql`likes + 1` })
          .where(eq(videos.id, input.videoId));

        return { liked: true };
      }
    }),

  // Increment view count
  incrementViews: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(videos)
        .set({ views: sql`views + 1` })
        .where(eq(videos.id, input.videoId));

      return { success: true };
    }),

  // Contact agent through video
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
    .mutation(async ({ ctx, input }) => {
      // Get agent details
      const agent = await ctx.db.select().from(agents).where(eq(agents.id, input.agentId)).limit(1);

      if (!agent[0]) {
        throw new Error('Agent not found');
      }

      // Create a lead from this contact
      const leadData = {
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        leadType: 'inquiry' as const,
        status: 'new' as const,
        source: input.videoId ? 'explore_video' : 'direct_contact',
        agentId: input.agentId,
        propertyId: input.propertyId,
      };

      const newLead = await ctx.db.insert(leads).values(leadData).returning();

      // TODO: Send email notification to agent
      // This would integrate with the existing email service
      console.log(`Contact request from ${input.name} to agent ${agent[0].displayName}`);

      return {
        success: true,
        leadId: newLead[0].id,
        message: 'Your inquiry has been sent to the agent',
      };
    }),

  // Get agent's videos
  getAgentVideos: protectedProcedure
    .input(
      z.object({
        agentId: z.number().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // If no agentId provided, get current user's agent profile
      let targetAgentId = input.agentId;

      if (!targetAgentId) {
        const agent = await ctx.db
          .select()
          .from(agents)
          .where(eq(agents.userId, ctx.user.id))
          .limit(1);

        if (!agent[0]) {
          throw new Error('Agent profile not found');
        }

        targetAgentId = agent[0].id;
      }

      const videosData = await ctx.db
        .select({
          id: videos.id,
          videoUrl: videos.videoUrl,
          caption: videos.caption,
          type: videos.type,
          duration: videos.duration,
          views: videos.views,
          likes: videos.likes,
          shares: videos.shares,
          isPublished: videos.isPublished,
          isFeatured: videos.isFeatured,
          createdAt: videos.createdAt,
          propertyTitle: properties.title,
          propertyLocation: properties.address,
          propertyPrice: properties.price,
          developmentName: developments.name,
          likesCount: sql<number>`COUNT(${videoLikes.id})`.as('likes_count'),
        })
        .from(videos)
        .leftJoin(properties, eq(videos.propertyId, properties.id))
        .leftJoin(developments, eq(videos.developmentId, developments.id))
        .leftJoin(videoLikes, eq(videoLikes.videoId, videos.id))
        .where(eq(videos.agentId, targetAgentId))
        .groupBy(videos.id, properties.id, developments.id)
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);

      return videosData;
    }),

  // Delete video (agent can delete their own videos)
  deleteVideo: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify video belongs to current user's agent profile
      const video = await ctx.db.select().from(videos).where(eq(videos.id, input.videoId)).limit(1);

      if (!video[0]) {
        throw new Error('Video not found');
      }

      const agent = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.userId, ctx.user.id))
        .limit(1);

      if (!agent[0] || video[0].agentId !== agent[0].id) {
        throw new Error('Unauthorized to delete this video');
      }

      // Delete video (likes cascade should handle this)
      await ctx.db.delete(videos).where(eq(videos.id, input.videoId));

      // TODO: Delete from S3 bucket as well
      // This would require getting the video URL and deleting from S3

      return { success: true };
    }),
});
