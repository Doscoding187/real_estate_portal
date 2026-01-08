/**
 * Feed Ranking Service - Usage Examples
 * 
 * This file demonstrates common usage patterns for the Feed Ranking Service.
 */

import { feedRankingService, FeedRankingService } from './feedRankingService';
import { hierarchyEngine } from './contentHierarchyEngine';

// ============================================================================
// Example 1: Basic Feed Ranking
// ============================================================================

async function example1_basicFeedRanking() {
  console.log('Example 1: Basic Feed Ranking\n');

  // Mock feed items
  const items = [
    {
      id: 1,
      contentType: 'property_tour',
      contentCategory: 'primary',
      partnerId: 'partner-1',
      createdAt: new Date('2024-01-15'),
      location: { lat: -26.2041, lng: 28.0473 }
    },
    {
      id: 2,
      contentType: 'expert_tip',
      contentCategory: 'secondary',
      partnerId: 'partner-2',
      createdAt: new Date('2024-01-20'),
      location: { lat: -26.1076, lng: 28.0567 }
    },
    {
      id: 3,
      contentType: 'inspiration',
      contentCategory: 'tertiary',
      partnerId: 'partner-3',
      createdAt: new Date('2024-01-10'),
      location: { lat: -26.3000, lng: 28.1000 }
    }
  ];

  // User location (Johannesburg)
  const userLocation = { lat: -26.2041, lng: 28.0473 };

  // Rank items
  const rankedItems = await feedRankingService.rankFeedItems(
    items,
    'user-123',
    userLocation,
    'find-your-home'
  );

  console.log('Ranked Items:');
  rankedItems.forEach((item, index) => {
    console.log(`${index + 1}. Content ${item.id} - Score: ${item.rankingScore.toFixed(2)}`);
  });
}

// ============================================================================
// Example 2: Boost Ratio Enforcement
// ============================================================================

async function example2_boostRatioEnforcement() {
  console.log('\nExample 2: Boost Ratio Enforcement\n');

  // Mock ranked items with some boosted
  const rankedItems = [
    { id: 1, rankingScore: 95, isBoosted: true, boostMultiplier: 1.5 },
    { id: 2, rankingScore: 90, isBoosted: false, boostMultiplier: 1.0 },
    { id: 3, rankingScore: 88, isBoosted: true, boostMultiplier: 1.4 },
    { id: 4, rankingScore: 85, isBoosted: false, boostMultiplier: 1.0 },
    { id: 5, rankingScore: 83, isBoosted: false, boostMultiplier: 1.0 },
    { id: 6, rankingScore: 80, isBoosted: false, boostMultiplier: 1.0 },
    { id: 7, rankingScore: 78, isBoosted: true, boostMultiplier: 1.3 },
    { id: 8, rankingScore: 75, isBoosted: false, boostMultiplier: 1.0 },
    { id: 9, rankingScore: 73, isBoosted: false, boostMultiplier: 1.0 },
    { id: 10, rankingScore: 70, isBoosted: false, boostMultiplier: 1.0 },
    { id: 11, rankingScore: 68, isBoosted: true, boostMultiplier: 1.6 },
    { id: 12, rankingScore: 65, isBoosted: false, boostMultiplier: 1.0 }
  ];

  console.log('Before boost limit enforcement:');
  const boostedCount = rankedItems.filter(i => i.isBoosted).length;
  const organicCount = rankedItems.filter(i => !i.isBoosted).length;
  console.log(`Boosted: ${boostedCount}, Organic: ${organicCount}, Ratio: ${(boostedCount / organicCount * 100).toFixed(1)}%`);

  // Apply boost limit
  const limitedFeed = feedRankingService.ensureBoostLimit(rankedItems);

  console.log('\nAfter boost limit enforcement:');
  const finalBoostedCount = limitedFeed.filter(i => i.isBoosted).length;
  const finalOrganicCount = limitedFeed.filter(i => !i.isBoosted).length;
  console.log(`Boosted: ${finalBoostedCount}, Organic: ${finalOrganicCount}, Ratio: ${(finalBoostedCount / finalOrganicCount * 100).toFixed(1)}%`);
  console.log('✓ Ratio is within 10% limit');
}

// ============================================================================
// Example 3: Custom Ranking Weights
// ============================================================================

async function example3_customWeights() {
  console.log('\nExample 3: Custom Ranking Weights\n');

  // Create service with custom weights (emphasize quality and location)
  const customService = new FeedRankingService({
    userInterest: 0.25,      // Reduce personalization
    contentQuality: 0.35,    // Increase quality emphasis
    localRelevance: 0.25,    // Increase location importance
    recency: 0.10,
    partnerTrust: 0.05
  });

  console.log('Custom weights:', customService.getWeights());

  // Calculate score with custom weights
  const score = customService.calculateRankingScore({
    userInterestScore: 70,
    qualityScore: 90,
    localRelevanceScore: 95,
    recencyScore: 60,
    trustScore: 80,
    boostMultiplier: 1.0
  });

  console.log(`Ranking score with custom weights: ${score.toFixed(2)}`);
}

// ============================================================================
// Example 4: Individual Factor Calculations
// ============================================================================

function example4_individualFactors() {
  console.log('\nExample 4: Individual Factor Calculations\n');

  // Recency scores for different ages
  console.log('Recency Scores:');
  const ages = [0, 1, 3, 7, 14, 21, 30];
  ages.forEach(days => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const score = feedRankingService.calculateRecencyScore(date);
    console.log(`  ${days} days old: ${score.toFixed(2)}`);
  });

  // Local relevance scores for different distances
  console.log('\nLocal Relevance Scores:');
  const userLoc = { lat: -26.2041, lng: 28.0473 }; // Johannesburg
  const locations = [
    { name: 'Same location', lat: -26.2041, lng: 28.0473 },
    { name: 'Sandton (10km)', lat: -26.1076, lng: 28.0567 },
    { name: 'Pretoria (50km)', lat: -25.7479, lng: 28.2293 },
    { name: 'Durban (500km)', lat: -29.8587, lng: 31.0218 }
  ];
  
  locations.forEach(loc => {
    const score = feedRankingService.calculateLocalRelevanceScore(
      userLoc,
      { lat: loc.lat, lng: loc.lng }
    );
    console.log(`  ${loc.name}: ${score.toFixed(2)}`);
  });
}

// ============================================================================
// Example 5: Integration with Content Hierarchy
// ============================================================================

async function example5_hierarchyIntegration() {
  console.log('\nExample 5: Integration with Content Hierarchy\n');

  // Mock content pool
  const contentPool = [
    { id: 1, contentCategory: 'primary', createdAt: new Date(), partnerId: 'p1' },
    { id: 2, contentCategory: 'primary', createdAt: new Date(), partnerId: 'p2' },
    { id: 3, contentCategory: 'secondary', createdAt: new Date(), partnerId: 'p3' },
    { id: 4, contentCategory: 'primary', createdAt: new Date(), partnerId: 'p4' },
    { id: 5, contentCategory: 'tertiary', createdAt: new Date(), partnerId: 'p5' },
    { id: 6, contentCategory: 'primary', createdAt: new Date(), partnerId: 'p6' },
    { id: 7, contentCategory: 'secondary', createdAt: new Date(), partnerId: 'p7' },
    { id: 8, contentCategory: 'primary', createdAt: new Date(), partnerId: 'p8' },
    { id: 9, contentCategory: 'primary', createdAt: new Date(), partnerId: 'p9' },
    { id: 10, contentCategory: 'primary', createdAt: new Date(), partnerId: 'p10' }
  ];

  console.log('Step 1: Rank content');
  const ranked = await feedRankingService.rankFeedItems(
    contentPool,
    'user-123'
  );

  console.log('Step 2: Apply boost limits');
  const boostedLimited = feedRankingService.ensureBoostLimit(ranked);

  console.log('Step 3: Enforce content hierarchy (70/20/10)');
  const finalFeed = await hierarchyEngine.rebalanceFeed(boostedLimited);

  // Calculate ratios
  const ratios = hierarchyEngine.calculateRatios(finalFeed);
  console.log('\nFinal feed ratios:');
  console.log(`  Primary: ${(ratios.primary * 100).toFixed(1)}%`);
  console.log(`  Secondary: ${(ratios.secondary * 100).toFixed(1)}%`);
  console.log(`  Tertiary: ${(ratios.tertiary * 100).toFixed(1)}%`);
  console.log(`  Valid: ${ratios.isValid ? '✓' : '✗'}`);
}

// ============================================================================
// Example 6: Weight Validation
// ============================================================================

function example6_weightValidation() {
  console.log('\nExample 6: Weight Validation\n');

  // Valid weights
  const validWeights = {
    userInterest: 0.35,
    contentQuality: 0.25,
    localRelevance: 0.20,
    recency: 0.10,
    partnerTrust: 0.10
  };

  console.log('Valid weights:', FeedRankingService.validateWeights(validWeights));

  // Invalid weights (don't sum to 1.0)
  const invalidWeights = {
    userInterest: 0.40,
    contentQuality: 0.30,
    localRelevance: 0.20,
    recency: 0.10,
    partnerTrust: 0.10
  };

  console.log('Invalid weights:', FeedRankingService.validateWeights(invalidWeights));

  try {
    new FeedRankingService(invalidWeights);
  } catch (error) {
    console.log('Error creating service with invalid weights:', error.message);
  }
}

// ============================================================================
// Example 7: Boost Multiplier Calculation
// ============================================================================

function example7_boostMultiplier() {
  console.log('\nExample 7: Boost Multiplier Calculation\n');

  // Mock boost campaigns with different budgets
  const campaigns = [
    { id: '1', budget: 100, status: 'active' },
    { id: '2', budget: 500, status: 'active' },
    { id: '3', budget: 1000, status: 'active' },
    { id: '4', budget: 5000, status: 'active' },
    { id: '5', budget: 10000, status: 'active' }
  ];

  console.log('Boost multipliers by budget:');
  campaigns.forEach(campaign => {
    const multiplier = feedRankingService.applyBoostMultiplier(0, campaign);
    console.log(`  R${campaign.budget}: ${multiplier.toFixed(2)}x`);
  });

  console.log('\nMultiplier range: 1.2x - 2.0x');
  console.log('Higher budgets = higher multipliers (capped at 2.0x)');
}

// ============================================================================
// Run Examples
// ============================================================================

async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('FEED RANKING SERVICE - USAGE EXAMPLES');
  console.log('='.repeat(60));

  await example1_basicFeedRanking();
  await example2_boostRatioEnforcement();
  await example3_customWeights();
  example4_individualFactors();
  await example5_hierarchyIntegration();
  example6_weightValidation();
  example7_boostMultiplier();

  console.log('\n' + '='.repeat(60));
  console.log('All examples completed!');
  console.log('='.repeat(60));
}

// Uncomment to run examples
// runAllExamples().catch(console.error);

export {
  example1_basicFeedRanking,
  example2_boostRatioEnforcement,
  example3_customWeights,
  example4_individualFactors,
  example5_hierarchyIntegration,
  example6_weightValidation,
  example7_boostMultiplier
};
