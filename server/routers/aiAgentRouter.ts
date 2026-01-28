import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import * as agentService from '../services/agentService';

export const aiAgentRouter = router({
  // ==================== MEMORY ENDPOINTS ====================

  storeConversation: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        conversationId: z.string().optional(),
        userInput: z.string(),
        agentResponse: z.string(),
        metadata: z
          .object({
            model: z.string().optional(),
            tokens: z.number().optional(),
            duration: z.number().optional(),
            context: z.any().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const id = await agentService.storeConversation({
        ...input,
        userId: ctx.user.id,
      });
      return { id, success: true };
    }),

  getHistory: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      return await agentService.getConversationHistory(input.sessionId, input.limit);
    }),

  getMyConversations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await agentService.getConversationsByUser(ctx.user.id, input.limit);
    }),

  // ==================== TASK ENDPOINTS ====================

  createTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        sessionId: z.string().optional(),
        taskType: z.string(),
        inputData: z.any().optional(),
        priority: z.number().default(0),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const id = await agentService.createTask({
        ...input,
        userId: ctx.user.id,
      });
      return { id, success: true };
    }),

  updateTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z.enum(['pending', 'running', 'completed', 'failed']),
        outputData: z.any().optional(),
        errorMessage: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await agentService.updateTaskStatus(
        input.taskId,
        input.status,
        input.outputData,
        input.errorMessage,
      );
      return { success: true };
    }),

  getTask: protectedProcedure.input(z.object({ taskId: z.string() })).query(async ({ input }) => {
    return await agentService.getTaskById(input.taskId);
  }),

  getSessionTasks: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      return await agentService.getTasksBySession(input.sessionId, input.limit);
    }),

  getMyTasks: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await agentService.getTasksByUser(ctx.user.id, input.limit);
    }),

  // ==================== KNOWLEDGE BASE ENDPOINTS ====================

  addKnowledge: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
        content: z.string(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z
          .object({
            source: z.string().optional(),
            author: z.string().optional(),
            confidence: z.number().optional(),
            lastVerified: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const id = await agentService.addKnowledge({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id, success: true };
    }),

  updateKnowledge: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        topic: z.string().optional(),
        content: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.any().optional(),
        isActive: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await agentService.updateKnowledge(id, updates);
      return { success: true };
    }),

  searchKnowledge: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input }) => {
      return await agentService.searchKnowledge(input.query, input.limit);
    }),

  getKnowledgeByCategory: publicProcedure
    .input(
      z.object({
        category: z.string(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      return await agentService.getKnowledgeByCategory(input.category, input.limit);
    }),

  getKnowledge: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return await agentService.getKnowledgeById(input.id);
  }),

  deactivateKnowledge: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await agentService.deactivateKnowledge(input.id);
      return { success: true };
    }),
});
