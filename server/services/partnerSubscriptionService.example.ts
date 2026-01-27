/**
 * Partner Subscription Service - Usage Examples
 *
 * This file demonstrates common usage patterns for the partner subscription service.
 */

import {
  createSubscription,
  getPartnerSubscription,
  upgradeSubscription,
  cancelSubscription,
  checkFeatureAccess,
  getFeatureValue,
  canPerformAction,
  getSubscriptionTierPricing,
} from './partnerSubscriptionService';

// =====================================================
// EXAMPLE 1: Partner Signs Up for Premium
// =====================================================

async function example1_partnerSignsUp() {
  const partnerId = 'partner-uuid-123';

  // Create premium subscription
  const subscription = await createSubscription(partnerId, 'premium');

  console.log('Subscription created:', {
    tier: subscription.tier,
    price: subscription.price_monthly,
    reach_multiplier: subscription.features.organic_reach_multiplier,
    monthly_content: subscription.features.max_monthly_content,
  });

  // Output:
  // {
  //   tier: 'premium',
  //   price: 2000,
  //   reach_multiplier: 1.5,
  //   monthly_content: 50
  // }
}

// =====================================================
// EXAMPLE 2: Check Feature Access Before Action
// =====================================================

async function example2_checkFeatureAccess() {
  const partnerId = 'partner-uuid-123';

  // Check if partner can create content
  const result = await canPerformAction(partnerId, 'create_content');

  if (!result.allowed) {
    console.log('Cannot create content:', result.reason);
    // Show upgrade prompt
    return;
  }

  // Partner can create content
  console.log('Content creation allowed');
}

// =====================================================
// EXAMPLE 3: Upgrade Subscription (Immediate)
// =====================================================

async function example3_upgradeSubscription() {
  const partnerId = 'partner-uuid-123';

  // Get current subscription
  const current = await getPartnerSubscription(partnerId);
  console.log('Current tier:', current?.tier); // 'premium'

  // Upgrade to featured
  if (current) {
    await upgradeSubscription(current.id, 'featured');
  }

  // Benefits applied immediately
  const updated = await getPartnerSubscription(partnerId);
  console.log('New tier:', updated?.tier); // 'featured'
  console.log('New reach:', updated?.features.organic_reach_multiplier); // 2.0
  console.log('Boost discount:', updated?.features.boost_discount_percent); // 20
}

// =====================================================
// EXAMPLE 4: Cancel Subscription (Downgrades to Basic)
// =====================================================

async function example4_cancelSubscription() {
  const partnerId = 'partner-uuid-123';

  // Get current subscription
  const current = await getPartnerSubscription(partnerId);
  console.log('Current tier:', current?.tier); // 'featured'

  // Cancel subscription
  if (current) {
    await cancelSubscription(current.id);
  }

  // Automatically downgraded to basic
  const updated = await getPartnerSubscription(partnerId);
  console.log('New tier:', updated?.tier); // 'basic'
  console.log('New reach:', updated?.features.organic_reach_multiplier); // 1.0
}

// =====================================================
// EXAMPLE 5: Check Monthly Content Limit
// =====================================================

async function example5_checkContentLimit() {
  const partnerId = 'partner-uuid-123';

  // Check if partner can create more content this month
  const result = await canPerformAction(partnerId, 'create_content');

  if (!result.allowed) {
    // Monthly limit reached
    const subscription = await getPartnerSubscription(partnerId);
    const limit = subscription?.features.max_monthly_content || 5;

    console.log(`Monthly content limit reached (${limit} pieces)`);
    console.log('Upgrade to increase limit');
    return false;
  }

  return true;
}

// =====================================================
// EXAMPLE 6: Get Feature Values for Display
// =====================================================

async function example6_getFeatureValues() {
  const partnerId = 'partner-uuid-123';

  // Get specific feature values
  const reachMultiplier = await getFeatureValue(partnerId, 'organic_reach_multiplier');
  const analyticsLevel = await getFeatureValue(partnerId, 'analytics_level');
  const supportLevel = await getFeatureValue(partnerId, 'support_level');
  const boostDiscount = await getFeatureValue(partnerId, 'boost_discount_percent');

  console.log('Partner Features:', {
    reach: `${reachMultiplier}x`,
    analytics: analyticsLevel,
    support: supportLevel,
    boost_discount: `${boostDiscount}%`,
  });

  // Output for premium tier:
  // {
  //   reach: '1.5x',
  //   analytics: 'detailed',
  //   support: 'priority',
  //   boost_discount: '10%'
  // }
}

// =====================================================
// EXAMPLE 7: Display Pricing Page
// =====================================================

async function example7_displayPricing() {
  // Get all tier pricing
  const pricing = getSubscriptionTierPricing();

  pricing.forEach(tier => {
    console.log(`${tier.display_name} - R${tier.price_monthly}/month`);
    console.log(`  ${tier.description}`);
    console.log(`  Reach: ${tier.features.organic_reach_multiplier}x`);
    console.log(`  Content: ${tier.features.max_monthly_content}/month`);
    console.log(`  Analytics: ${tier.features.analytics_level}`);
    console.log(`  Support: ${tier.features.support_level}`);
    console.log(`  Boost Discount: ${tier.features.boost_discount_percent}%`);
    console.log('');
  });
}

// =====================================================
// EXAMPLE 8: Middleware Usage in Routes
// =====================================================

import express from 'express';
import {
  requirePartnerAction,
  attachPartnerSubscription,
} from '../middleware/partnerFeatureAccess';

const router = express.Router();

// Require action permission
router.post('/content', requirePartnerAction('create_content'), async (req, res) => {
  // Only accessible if partner can create content
  // (checks monthly limit automatically)
  res.json({ message: 'Content created' });
});

// Attach subscription to request
router.get('/dashboard', attachPartnerSubscription, async (req, res) => {
  const subscription = req.partnerSubscription;

  res.json({
    tier: subscription?.tier || 'free',
    features: subscription?.features,
  });
});

// =====================================================
// EXAMPLE 9: Handle Subscription Expiration (Cron)
// =====================================================

import { processExpiredSubscriptions } from './partnerSubscriptionService';

async function example9_cronJob() {
  // Run daily at midnight
  console.log('Processing expired subscriptions...');

  await processExpiredSubscriptions();

  console.log('Expired subscriptions processed');
  // All expired subscriptions are now downgraded to basic
}

// =====================================================
// EXAMPLE 10: Show Upgrade Prompt
// =====================================================

async function example10_showUpgradePrompt() {
  const partnerId = 'partner-uuid-123';

  // Partner tries to access advanced analytics
  const hasAccess = await checkFeatureAccess(partnerId, 'analytics_level');
  const currentLevel = await getFeatureValue(partnerId, 'analytics_level');

  if (currentLevel !== 'advanced') {
    // Show upgrade prompt
    const subscription = await getPartnerSubscription(partnerId);
    const currentTier = subscription?.tier || 'free';

    console.log('Upgrade Required');
    console.log(`Current tier: ${currentTier}`);
    console.log('Advanced analytics requires Featured tier (R5000/month)');
    console.log('Benefits:');
    console.log('  - Advanced analytics dashboard');
    console.log('  - 2.0x organic reach');
    console.log('  - 100 content pieces/month');
    console.log('  - 20% boost discount');
    console.log('  - Dedicated support');
  }
}

// =====================================================
// EXAMPLE 11: Apply Boost Discount
// =====================================================

async function example11_applyBoostDiscount() {
  const partnerId = 'partner-uuid-123';
  const boostPrice = 1000; // R1000 base price

  // Get boost discount for partner's tier
  const discount = await getFeatureValue(partnerId, 'boost_discount_percent');
  const discountAmount = (boostPrice * discount) / 100;
  const finalPrice = boostPrice - discountAmount;

  console.log('Boost Campaign Pricing:');
  console.log(`Base price: R${boostPrice}`);
  console.log(`Discount (${discount}%): -R${discountAmount}`);
  console.log(`Final price: R${finalPrice}`);

  // Output for premium tier:
  // Base price: R1000
  // Discount (10%): -R100
  // Final price: R900
}

// =====================================================
// EXAMPLE 12: Calculate Organic Reach
// =====================================================

async function example12_calculateOrganicReach() {
  const partnerId = 'partner-uuid-123';
  const baseScore = 100; // Base ranking score

  // Get reach multiplier for partner's tier
  const multiplier = await getFeatureValue(partnerId, 'organic_reach_multiplier');
  const finalScore = baseScore * multiplier;

  console.log('Content Ranking:');
  console.log(`Base score: ${baseScore}`);
  console.log(`Reach multiplier: ${multiplier}x`);
  console.log(`Final score: ${finalScore}`);

  // Output for premium tier:
  // Base score: 100
  // Reach multiplier: 1.5x
  // Final score: 150
}

export {
  example1_partnerSignsUp,
  example2_checkFeatureAccess,
  example3_upgradeSubscription,
  example4_cancelSubscription,
  example5_checkContentLimit,
  example6_getFeatureValues,
  example7_displayPricing,
  example9_cronJob,
  example10_showUpgradePrompt,
  example11_applyBoostDiscount,
  example12_calculateOrganicReach,
};
