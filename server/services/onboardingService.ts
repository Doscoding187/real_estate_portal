/**
 * Onboarding Service
 *
 * Manages first-time user experience and progressive feature revelation for Explore.
 * Implements Requirements 14.1, 14.2, 14.3, 14.4, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12
 *
 * Key Features:
 * - Welcome overlay with topic suggestions
 * - Progressive disclosure of features based on engagement
 * - Tooltip system for feature education
 * - Engagement tracking for feature unlocking
 */

import { db } from '../db';
import { eq } from 'drizzle-orm';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UserOnboardingState {
  userId: string;
  isFirstSession: boolean;
  welcomeOverlayShown: boolean;
  welcomeOverlayDismissed: boolean;
  suggestedTopics: string[];
  tooltipsShown: string[];
  contentViewCount: number;
  saveCount: number;
  partnerEngagementCount: number;
  featuresUnlocked: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingEvent {
  type: 'content_view' | 'save' | 'partner_engagement' | 'topic_select' | 'tooltip_dismiss';
  metadata?: Record<string, any>;
}

export interface FeatureUnlockResult {
  feature: string;
  unlocked: boolean;
  threshold: number;
  currentProgress: number;
}

// ============================================================================
// Feature Unlock Thresholds (Requirements 14.2, 14.3, 14.4)
// ============================================================================

const FEATURE_UNLOCK_THRESHOLDS = {
  filters_save: { threshold: 10, metric: 'contentViewCount' as const },
  topics: { threshold: 3, metric: 'saveCount' as const },
  partner_profiles: { threshold: 1, metric: 'partnerEngagementCount' as const },
};

// ============================================================================
// Tooltip Configuration (Requirements 16.10, 16.11, 16.12)
// ============================================================================

const TOOLTIPS = {
  topic_navigation: {
    id: 'topic_navigation',
    trigger: 'after_5_items_scrolled',
    message: 'Tap any Topic above to change your view',
  },
  partner_content: {
    id: 'partner_content',
    trigger: 'first_partner_content_encounter',
    message: 'This is educational content from a verified partner',
  },
};

// ============================================================================
// Onboarding Service
// ============================================================================

export class OnboardingService {
  /**
   * Get onboarding state for a user
   * Creates initial state if user doesn't exist
   */
  async getOnboardingState(userId: string): Promise<UserOnboardingState> {
    const result = await db.query.userOnboardingState.findFirst({
      where: (state, { eq }: any) => eq(state.userId, userId),
    });

    if (!result) {
      // Create initial onboarding state
      const newState = await this.createInitialState(userId);
      return newState;
    }

    return {
      userId: result.userId,
      isFirstSession: result.isFirstSession,
      welcomeOverlayShown: result.welcomeOverlayShown,
      welcomeOverlayDismissed: result.welcomeOverlayDismissed,
      suggestedTopics: (result.suggestedTopics as string[]) || [],
      tooltipsShown: (result.tooltipsShown as string[]) || [],
      contentViewCount: result.contentViewCount,
      saveCount: result.saveCount,
      partnerEngagementCount: result.partnerEngagementCount,
      featuresUnlocked: (result.featuresUnlocked as string[]) || [],
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Create initial onboarding state for new user
   */
  private async createInitialState(userId: string): Promise<UserOnboardingState> {
    const suggestedTopics = await this.getSuggestedTopicsForUser(userId);

    await db.insert(db.schema.userOnboardingState).values({
      userId,
      isFirstSession: true,
      welcomeOverlayShown: false,
      welcomeOverlayDismissed: false,
      suggestedTopics: JSON.stringify(suggestedTopics),
      tooltipsShown: JSON.stringify([]),
      contentViewCount: 0,
      saveCount: 0,
      partnerEngagementCount: 0,
      featuresUnlocked: JSON.stringify([]),
    });

    return {
      userId,
      isFirstSession: true,
      welcomeOverlayShown: false,
      welcomeOverlayDismissed: false,
      suggestedTopics,
      tooltipsShown: [],
      contentViewCount: 0,
      saveCount: 0,
      partnerEngagementCount: 0,
      featuresUnlocked: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Show welcome overlay to user
   * Requirement 16.7: Display welcome overlay on first session
   */
  async showWelcomeOverlay(userId: string): Promise<void> {
    await db
      .update(db.schema.userOnboardingState)
      .set({
        welcomeOverlayShown: true,
        isFirstSession: false,
      })
      .where(eq(db.schema.userOnboardingState.userId, userId));
  }

  /**
   * Dismiss welcome overlay
   * Requirement 16.12: Track dismissal for analytics
   */
  async dismissWelcomeOverlay(userId: string): Promise<void> {
    await db
      .update(db.schema.userOnboardingState)
      .set({
        welcomeOverlayDismissed: true,
      })
      .where(eq(db.schema.userOnboardingState.userId, userId));
  }

  /**
   * Get suggested topics for user based on profile
   * Requirement 16.8: Suggest 3 topics based on user profile
   */
  async getSuggestedTopicsForUser(userId: string): Promise<string[]> {
    // Get user profile to determine interests
    const user = await db.query.users.findFirst({
      where: (users, { eq }: any) => eq(users.id, userId),
    });

    // Default suggestions for all users
    const defaultTopics = ['find-your-home', 'first-time-buyers', 'finance-investment'];

    if (!user) {
      return defaultTopics;
    }

    // TODO: Enhance with user profile analysis
    // For now, return default topics
    return defaultTopics;
  }

  /**
   * Show tooltip to user
   * Requirement 16.10, 16.11: Show tooltips at appropriate triggers
   */
  async showTooltip(userId: string, tooltipId: string): Promise<void> {
    const state = await this.getOnboardingState(userId);

    if (state.tooltipsShown.includes(tooltipId)) {
      return; // Already shown
    }

    const updatedTooltips = [...state.tooltipsShown, tooltipId];

    await db
      .update(db.schema.userOnboardingState)
      .set({
        tooltipsShown: JSON.stringify(updatedTooltips),
      })
      .where(eq(db.schema.userOnboardingState.userId, userId));
  }

  /**
   * Dismiss tooltip
   */
  async dismissTooltip(userId: string, tooltipId: string): Promise<void> {
    // Tooltips are one-time, so dismissing is same as showing
    await this.showTooltip(userId, tooltipId);
  }

  /**
   * Check which features should be unlocked for user
   * Requirements 14.2, 14.3, 14.4: Progressive disclosure thresholds
   */
  async checkFeatureUnlock(userId: string): Promise<FeatureUnlockResult[]> {
    const state = await this.getOnboardingState(userId);
    const results: FeatureUnlockResult[] = [];

    for (const [feature, config] of Object.entries(FEATURE_UNLOCK_THRESHOLDS)) {
      const currentProgress = state[config.metric];
      const unlocked = currentProgress >= config.threshold;

      results.push({
        feature,
        unlocked,
        threshold: config.threshold,
        currentProgress,
      });

      // Auto-unlock if threshold met and not already unlocked
      if (unlocked && !state.featuresUnlocked.includes(feature)) {
        await this.unlockFeature(userId, feature);
      }
    }

    return results;
  }

  /**
   * Unlock a feature for user
   */
  async unlockFeature(userId: string, feature: string): Promise<void> {
    const state = await this.getOnboardingState(userId);

    if (state.featuresUnlocked.includes(feature)) {
      return; // Already unlocked
    }

    const updatedFeatures = [...state.featuresUnlocked, feature];

    await db
      .update(db.schema.userOnboardingState)
      .set({
        featuresUnlocked: JSON.stringify(updatedFeatures),
      })
      .where(eq(db.schema.userOnboardingState.userId, userId));
  }

  /**
   * Track onboarding event and update metrics
   */
  async trackOnboardingEvent(userId: string, event: OnboardingEvent): Promise<void> {
    const state = await this.getOnboardingState(userId);

    const updates: Partial<UserOnboardingState> = {};

    switch (event.type) {
      case 'content_view':
        updates.contentViewCount = state.contentViewCount + 1;
        break;
      case 'save':
        updates.saveCount = state.saveCount + 1;
        break;
      case 'partner_engagement':
        updates.partnerEngagementCount = state.partnerEngagementCount + 1;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(db.schema.userOnboardingState)
        .set(updates as any)
        .where(eq(db.schema.userOnboardingState.userId, userId));

      // Check for feature unlocks after updating metrics
      await this.checkFeatureUnlock(userId);
    }
  }

  /**
   * Check if user should see welcome overlay
   * Requirement 16.7: Show overlay on first session
   */
  async shouldShowWelcomeOverlay(userId: string): Promise<boolean> {
    const state = await this.getOnboardingState(userId);
    return state.isFirstSession && !state.welcomeOverlayShown;
  }

  /**
   * Check if tooltip should be shown
   */
  async shouldShowTooltip(userId: string, tooltipId: string): Promise<boolean> {
    const state = await this.getOnboardingState(userId);
    return !state.tooltipsShown.includes(tooltipId);
  }

  /**
   * Get tooltip configuration
   */
  getTooltipConfig(tooltipId: string) {
    return TOOLTIPS[tooltipId as keyof typeof TOOLTIPS];
  }

  /**
   * Reset onboarding state (for testing)
   */
  async resetOnboardingState(userId: string): Promise<void> {
    await db
      .delete(db.schema.userOnboardingState)
      .where(eq(db.schema.userOnboardingState.userId, userId));
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService();
