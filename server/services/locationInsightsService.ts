/**
 * Location Insights Service (STUBBED)
 *
 * NOTE: suburbReviews table is not exported from schema.
 * Review submission/retrieval features are disabled.
 * AI insights generation preserved.
 */

import { db } from '../db';
import { suburbs } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
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
   * submitReview - STUBBED
   * suburbReviews table not available
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
    // STUB: No-op - suburbReviews table not available
    console.debug(
      '[locationInsightsService] submitReview called but disabled (no suburbReviews table)',
    );
    return { success: false, message: 'Reviews temporarily disabled' };
  },

  /**
   * getReviews - STUBBED
   * suburbReviews table not available
   */
  async getReviews(suburbId: number) {
    // STUB: Return empty array - suburbReviews table not available
    console.debug(
      '[locationInsightsService] getReviews called but disabled (no suburbReviews table)',
    );
    return [];
  },
};
