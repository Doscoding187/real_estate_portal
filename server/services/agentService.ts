import { getDb } from '../db-connection';
import { agentMemory, agentTasks, agentKnowledge } from '../../drizzle/schema';
import { eq, desc, and, like, or, sql } from 'drizzle-orm';

// ==================== MEMORY OPERATIONS ====================

export async function storeConversation(data: {
  sessionId: string;
  conversationId?: string;
  userId?: number;
  userInput: string;
  agentResponse: string;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
    context?: any;
  };
}) {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(agentMemory).values(data);
    return Number(result[0].insertId);
  } catch (error) {
    console.error('[agentService] Failed to store conversation:', error);
    throw new Error('Failed to store conversation in database');
  }
}

export async function getConversationHistory(sessionId: string, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.sessionId, sessionId))
    .orderBy(desc(agentMemory.createdAt))
    .limit(limit);
}

export async function getConversationsByUser(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.userId, userId))
    .orderBy(desc(agentMemory.createdAt))
    .limit(limit);
}

// ==================== TASK OPERATIONS ====================

export async function createTask(data: {
  taskId: string;
  sessionId?: string;
  userId?: number;
  taskType: string;
  inputData?: unknown;
  priority?: number;
}) {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(agentTasks).values({
      ...data,
      status: 'pending',
    });
    return Number(result[0].insertId);
  } catch (error) {
    console.error('[agentService] Failed to create task:', error);
    throw new Error('Failed to create task in database');
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  outputData?: unknown,
  errorMessage?: string,
) {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const updates: Record<string, unknown> = {
      status,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (status === 'running' && !outputData) {
      updates.startedAt = new Date();
    }
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }
    if (outputData !== undefined) {
      updates.outputData = outputData;
    }
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    await db.update(agentTasks).set(updates).where(eq(agentTasks.taskId, taskId));
  } catch (error) {
    console.error('[agentService] Failed to update task status:', error);
    throw new Error('Failed to update task status in database');
  }
}

export async function getTaskById(taskId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.select().from(agentTasks).where(eq(agentTasks.taskId, taskId)).limit(1);
  return result[0];
}

export async function getTasksBySession(sessionId: string, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.sessionId, sessionId))
    .orderBy(desc(agentTasks.createdAt))
    .limit(limit);
}

export async function getTasksByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.userId, userId))
    .orderBy(desc(agentTasks.createdAt))
    .limit(limit);
}

// ==================== KNOWLEDGE BASE OPERATIONS ====================

export async function addKnowledge(data: {
  topic: string;
  content: string;
  category?: string;
  tags?: string[];
  metadata?: {
    source?: string;
    author?: string;
    confidence?: number;
    lastVerified?: string;
  };
  createdBy?: number;
}) {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(agentKnowledge).values(data);
    return Number(result[0].insertId);
  } catch (error) {
    console.error('[agentService] Failed to add knowledge:', error);
    throw new Error('Failed to add knowledge to database');
  }
}

export async function updateKnowledge(
  id: number,
  updates: {
    topic?: string;
    content?: string;
    category?: string;
    tags?: string[];
    metadata?: any;
    isActive?: number;
  },
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(agentKnowledge)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(agentKnowledge.id, id));
}

export async function searchKnowledge(query: string, limit = 10) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(agentKnowledge)
    .where(
      and(
        eq(agentKnowledge.isActive, 1),
        or(
          like(agentKnowledge.topic, `%${query}%`),
          like(agentKnowledge.content, `%${query}%`),
          like(agentKnowledge.category, `%${query}%`),
        ),
      ),
    )
    .limit(limit);
}

export async function getKnowledgeByCategory(category: string, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(agentKnowledge)
    .where(and(eq(agentKnowledge.isActive, 1), eq(agentKnowledge.category, category)))
    .orderBy(desc(agentKnowledge.createdAt))
    .limit(limit);
}

export async function getKnowledgeById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.select().from(agentKnowledge).where(eq(agentKnowledge.id, id)).limit(1);
  return result[0];
}

export async function deactivateKnowledge(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(agentKnowledge)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(agentKnowledge.id, id));
}
