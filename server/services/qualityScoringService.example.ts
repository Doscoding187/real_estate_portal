/**
 * Quality Scoring Service - Usage Examples
 *
 * This file demonstrates how to use the Quality Scoring Service
 * for engagement-based score updates.
 */

import { qualityScoringService } from './qualityScoringService';

// ============================================================================
// Example 1: Initial Content Creation
// ============================================================================

async function example1_InitialContentCreation() {
  const contentId = 'content-123';

  // Calculate initial score based on metadata
  const initialScore = await qualityScoringService.calculateInitialScore(contentId, {
    title: 'Luxury 4-Bedroom Villa in Constantia',
    description:
      'Experience unparalleled luxury in this stunning 4-bedroom villa nestled in the heart of Constantia. Features include a gourmet kitchen, infinity pool, and breathtaking mountain views.',
    tags: ['constantia', 'luxury', '4-bedroom', 'villa', 'pool', 'mountain-view'],
    location: 'Constantia, Cape Town',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    category: 'property_tour',
  });

  console.log(`Initial quality score: ${initialScore}`);
  // Expected: ~85-90 (high metadata completeness)
}

// ============================================================================
// Example 2: Positive Engagement - High Watch Time
// ============================================================================

async function example2_PositiveEngagement_HighWatchTime() {
  const contentId = 'content-123';

  // User watched 90% of the video
  await qualityScoringService.updateScoreFromEngagement(contentId, {
    watchTime: 54, // 54 seconds
    totalDuration: 60, // 60 seconds total
    saves: 0,
    shares: 0,
    clickThroughs: 0,
  });

  const score = await qualityScoringService.getQualityScore(contentId);
  console.log(`After high watch time: ${score?.overallScore}`);
  // Expected: Score increases due to 90% completion rate
}

// ============================================================================
// Example 3: Positive Engagement - Saves and Shares
// ============================================================================

async function example3_PositiveEngagement_SavesShares() {
  const contentId = 'content-123';

  // User saved and shared the content
  await qualityScoringService.updateScoreFromEngagement(contentId, {
    watchTime: 45,
    totalDuration: 60,
    saves: 1, // User saved
    shares: 1, // User shared
    clickThroughs: 1, // User clicked through to listing
  });

  const score = await qualityScoringService.getQualityScore(contentId);
  console.log(`After saves/shares: ${score?.overallScore}`);
  // Expected: Score increases significantly (saves + shares are high value)
}

// ============================================================================
// Example 4: Negative Signal - Quick Skip
// ============================================================================

async function example4_NegativeSignal_QuickSkip() {
  const contentId = 'content-456';

  // User skipped after < 3 seconds
  await qualityScoringService.recordNegativeSignal(contentId, 'quick_skip');

  const score = await qualityScoringService.getQualityScore(contentId);
  console.log(`After quick skip: ${score?.overallScore}`);
  console.log(`Negative signals: ${score?.negativeSignals}`);
  // Expected: Score decreases by ~1.5 points
}

// ============================================================================
// Example 5: Negative Signal - Report
// ============================================================================

async function example5_NegativeSignal_Report() {
  const contentId = 'content-456';

  // User reported the content
  await qualityScoringService.recordNegativeSignal(contentId, 'report');

  const score = await qualityScoringService.getQualityScore(contentId);
  console.log(`After report: ${score?.overallScore}`);
  console.log(`Negative signals: ${score?.negativeSignals}`);
  // Expected: Score decreases by ~7.5 points (reports are weighted 5x)
}

// ============================================================================
// Example 6: Multiple Engagement Events
// ============================================================================

async function example6_MultipleEngagementEvents() {
  const contentId = 'content-789';

  // Simulate multiple user interactions over time

  // User 1: Watched fully and saved
  await qualityScoringService.updateScoreFromEngagement(contentId, {
    watchTime: 60,
    totalDuration: 60,
    saves: 1,
    shares: 0,
    clickThroughs: 0,
  });

  // User 2: Watched partially and shared
  await qualityScoringService.updateScoreFromEngagement(contentId, {
    watchTime: 30,
    totalDuration: 60,
    saves: 0,
    shares: 1,
    clickThroughs: 0,
  });

  // User 3: Quick skip
  await qualityScoringService.recordNegativeSignal(contentId, 'quick_skip');

  // User 4: Watched and clicked through
  await qualityScoringService.updateScoreFromEngagement(contentId, {
    watchTime: 55,
    totalDuration: 60,
    saves: 0,
    shares: 0,
    clickThroughs: 1,
  });

  const score = await qualityScoringService.getQualityScore(contentId);
  console.log(`After multiple engagements: ${score?.overallScore}`);
  console.log(`Engagement score: ${score?.engagementScore}`);
  console.log(`Negative signals: ${score?.negativeSignals}`);
  // Expected: High overall score with balanced engagement
}

// ============================================================================
// Example 7: Low Engagement Pattern
// ============================================================================

async function example7_LowEngagementPattern() {
  const contentId = 'content-bad';

  // Simulate poor engagement pattern

  // Multiple quick skips
  await qualityScoringService.recordNegativeSignal(contentId, 'quick_skip');
  await qualityScoringService.recordNegativeSignal(contentId, 'quick_skip');
  await qualityScoringService.recordNegativeSignal(contentId, 'quick_skip');

  // Low watch time
  await qualityScoringService.updateScoreFromEngagement(contentId, {
    watchTime: 5,
    totalDuration: 60,
    saves: 0,
    shares: 0,
    clickThroughs: 0,
  });

  const score = await qualityScoringService.getQualityScore(contentId);
  console.log(`After poor engagement: ${score?.overallScore}`);

  // Check visibility impact
  const multiplier = qualityScoringService.getVisibilityMultiplier(score?.overallScore || 0);
  console.log(`Visibility multiplier: ${multiplier}x`);
  // Expected: Low score (< 40) with minimal visibility (0.2x)
}

// ============================================================================
// Example 8: Gradual Score Improvement
// ============================================================================

async function example8_GradualScoreImprovement() {
  const contentId = 'content-improving';

  // Start with poor metadata
  await qualityScoringService.calculateInitialScore(contentId, {
    title: 'House',
    description: 'Nice house',
    tags: ['house'],
    location: undefined,
    thumbnailUrl: undefined,
    category: undefined,
  });

  let score = await qualityScoringService.getQualityScore(contentId);
  console.log(`Initial (poor metadata): ${score?.overallScore}`);

  // Simulate positive engagement over time
  for (let i = 0; i < 5; i++) {
    await qualityScoringService.updateScoreFromEngagement(contentId, {
      watchTime: 50 + i * 2,
      totalDuration: 60,
      saves: i % 2 === 0 ? 1 : 0,
      shares: i % 3 === 0 ? 1 : 0,
      clickThroughs: 1,
    });
  }

  score = await qualityScoringService.getQualityScore(contentId);
  console.log(`After positive engagement: ${score?.overallScore}`);
  // Expected: Score improves despite poor metadata (engagement compensates)
}

// ============================================================================
// Example 9: Integration with Feed Ranking
// ============================================================================

async function example9_FeedRankingIntegration() {
  const contentId = 'content-123';

  // Get quality score
  const score = await qualityScoringService.getQualityScore(contentId);

  if (!score) {
    console.log('No quality score found');
    return;
  }

  // Calculate visibility multiplier
  const visibilityMultiplier = qualityScoringService.getVisibilityMultiplier(score.overallScore);

  // Apply to ranking (example)
  const baseRankingScore = 75.0;
  const adjustedScore = baseRankingScore * visibilityMultiplier;

  console.log(`Base ranking score: ${baseRankingScore}`);
  console.log(`Quality score: ${score.overallScore}`);
  console.log(`Visibility multiplier: ${visibilityMultiplier}x`);
  console.log(`Adjusted ranking score: ${adjustedScore}`);

  // Use adjusted score in feed generation
}

// ============================================================================
// Example 10: Underperformance Detection
// ============================================================================

async function example10_UnderperformanceDetection() {
  const partnerId = 'partner-123';

  // Check for underperforming content
  const underperforming = await qualityScoringService.getUnderperformingContent(partnerId);

  console.log(`Found ${underperforming.length} underperforming content pieces`);

  if (underperforming.length > 0) {
    // Notify partner
    await qualityScoringService.notifyPartnerOfLowQuality(partnerId, underperforming);

    // Get details for each
    for (const contentId of underperforming) {
      const score = await qualityScoringService.getQualityScore(contentId);
      console.log(`Content ${contentId}: Score ${score?.overallScore}`);
      console.log(`  - Metadata: ${score?.metadataScore}`);
      console.log(`  - Engagement: ${score?.engagementScore}`);
      console.log(`  - Production: ${score?.productionScore}`);
      console.log(`  - Negative signals: ${score?.negativeSignals}`);
    }
  }
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  console.log('=== Quality Scoring Service Examples ===\n');

  try {
    console.log('Example 1: Initial Content Creation');
    await example1_InitialContentCreation();
    console.log('\n---\n');

    console.log('Example 2: Positive Engagement - High Watch Time');
    await example2_PositiveEngagement_HighWatchTime();
    console.log('\n---\n');

    console.log('Example 3: Positive Engagement - Saves and Shares');
    await example3_PositiveEngagement_SavesShares();
    console.log('\n---\n');

    console.log('Example 4: Negative Signal - Quick Skip');
    await example4_NegativeSignal_QuickSkip();
    console.log('\n---\n');

    console.log('Example 5: Negative Signal - Report');
    await example5_NegativeSignal_Report();
    console.log('\n---\n');

    console.log('Example 6: Multiple Engagement Events');
    await example6_MultipleEngagementEvents();
    console.log('\n---\n');

    console.log('Example 7: Low Engagement Pattern');
    await example7_LowEngagementPattern();
    console.log('\n---\n');

    console.log('Example 8: Gradual Score Improvement');
    await example8_GradualScoreImprovement();
    console.log('\n---\n');

    console.log('Example 9: Feed Ranking Integration');
    await example9_FeedRankingIntegration();
    console.log('\n---\n');

    console.log('Example 10: Underperformance Detection');
    await example10_UnderperformanceDetection();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run examples
// runExamples();
