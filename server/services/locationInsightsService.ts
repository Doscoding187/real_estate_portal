import { db } from '../db';
import { suburbs, suburbReviews } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { OpenAI } from 'openai';

// Initialize OpenAI client - assumes OPENAI_API_KEY is in env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
});

export const locationInsightsService = {
  /**
   * Generates or retrieves existing insights for a suburb.
   * If insights are missing or old, it calls OpenAI to generate them.
   */
  async getInsights(suburbId: number, suburbName: string, cityName: string) {
    // 1. Check existing insights
    const suburb = await db.query.suburbs.findFirst({
      where: eq(suburbs.id, suburbId),
    });

    if (!suburb) throw new Error('Suburb not found');

    // If we have insights, return them
    if (suburb.pros && suburb.cons) {
      return {
        pros: suburb.pros as string[],
        cons: suburb.cons as string[],
        source: 'cache',
      };
    }

    // 2. Generate new insights if missing
    try {
      console.log(`Generating AI insights for ${suburbName}, ${cityName}...`);

      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not found, returning mock insights');
        return this.getMockInsights();
      }

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              "You are a real estate expert in South Africa. You know every suburb's detailed pros and cons.",
          },
          {
            role: 'user',
            content: `Provide 5 specific "Pros" (Good things) and 4 specific "Cons" (Things to improve) for living in the suburb of ${suburbName} in ${cityName}, South Africa. Return ONLY valid JSON format: { "pros": ["...", "..."], "cons": ["...", "..."] }. Keep punchy, short phrases.`,
          },
        ],
        model: 'gpt-3.5-turbo',
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content from OpenAI');

      const data = JSON.parse(content);

      // Save to database
      await db
        .update(suburbs)
        .set({
          pros: data.pros,
          cons: data.cons,
          aiGenerationDate: new Date().toISOString(),
        })
        .where(eq(suburbs.id, suburbId));

      return {
        pros: data.pros as string[],
        cons: data.cons as string[],
        source: 'ai',
      };
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return this.getMockInsights();
    }
  },

  /**
   * Verification/Fallback data if AI fails or key is missing
   */
  getMockInsights() {
    return {
      pros: [
        'Strong community spirit',
        'Close to major amenities',
        'Good investment potential',
        'Family-friendly atmosphere',
        'Access to schools',
      ],
      cons: [
        'Traffic during peak hours',
        'Limited nightlife options',
        'Distance from CBD',
        'Construction noise in developing areas',
      ],
      source: 'mock',
    };
  },

  /**
   * submitReview
   */
  async submitReview(data: {
    suburbId: number;
    userId?: number;
    rating: number;
    userType: 'resident' | 'tenant' | 'landlord' | 'visitor';
    pros: string;
    cons: string;
    comment: string;
  }) {
    await db.insert(suburbReviews).values({
      suburbId: data.suburbId,
      userId: data.userId || null,
      rating: data.rating,
      userType: data.userType,
      pros: data.pros,
      cons: data.cons,
      comment: data.comment,
      isPublished: 1, // Auto-publish for now
      isVerified: 0,
    });
    return { success: true };
  },

  /**
   * getReviews
   */
  async getReviews(suburbId: number) {
    const reviews = await db.query.suburbReviews.findMany({
      where: eq(suburbReviews.suburbId, suburbId),
      orderBy: [desc(suburbReviews.createdAt)],
      with: {
        user: {
          columns: {
            firstName: true,
            lastName: true,
            // avatar column might not exist properly on user table yet based on standard schema, using default or joining profile
          },
        },
      },
      limit: 10,
    });

    return reviews;
  },
};
