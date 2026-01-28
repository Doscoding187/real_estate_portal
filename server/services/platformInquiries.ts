import { db } from '../../drizzle/db';
import { platformInquiries } from '../../drizzle/schema';
import { InferInsertModel } from 'drizzle-orm';

export type CreatePlatformInquiryInput = InferInsertModel<typeof platformInquiries>;

export async function createPlatformInquiry(data: CreatePlatformInquiryInput) {
  try {
    const result = await db.insert(platformInquiries).values(data);
    return { success: true, result };
  } catch (error) {
    console.error('Failed to submit platform inquiry:', error);
    return { success: false, error: 'Failed to submit inquiry' };
  }
}
