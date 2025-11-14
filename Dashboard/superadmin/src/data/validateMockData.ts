import {
  platformStats,
  revenueTrend,
  subscriptionTiers,
  recentActivities,
} from './mockData';
import type {
  PlatformStats,
  RevenueTrend,
  SubscriptionTier,
  RecentActivity,
} from './mockData';

export const validatePlatformStats = (stats: PlatformStats): boolean => {
  return (
    typeof stats.totalRevenue === 'string' &&
    stats.totalRevenue.startsWith('R ') &&
    typeof stats.monthlyRevenue === 'string' &&
    stats.monthlyRevenue.startsWith('R ') &&
    typeof stats.activeAgencies === 'number' &&
    stats.activeAgencies > 0 &&
    typeof stats.pendingApprovals === 'number' &&
    stats.pendingApprovals >= 0 &&
    typeof stats.activeListings === 'number' &&
    stats.activeListings > 0 &&
    typeof stats.totalUsers === 'number' &&
    stats.totalUsers > 0
  );
};

export const validateRevenueTrend = (trend: RevenueTrend[]): boolean => {
  return trend.every(
    item =>
      typeof item.month === 'string' &&
      typeof item.year === 'number' &&
      typeof item.revenue === 'string' &&
      item.revenue.startsWith('R ') &&
      typeof item.percentageChange === 'number'
  );
};

export const validateSubscriptionTiers = (
  tiers: SubscriptionTier[]
): boolean => {
  return tiers.every(
    tier =>
      typeof tier.id === 'string' &&
      typeof tier.name === 'string' &&
      typeof tier.agencies === 'number' &&
      tier.agencies >= 0 &&
      typeof tier.revenue === 'string' &&
      tier.revenue.startsWith('R ') &&
      typeof tier.color === 'string'
  );
};

export const validateRecentActivities = (
  activities: RecentActivity[]
): boolean => {
  return activities.every(
    activity =>
      typeof activity.id === 'number' &&
      typeof activity.agency === 'string' &&
      typeof activity.action === 'string' &&
      typeof activity.target === 'string' &&
      typeof activity.timestamp === 'string' &&
      ['success', 'pending', 'failed'].includes(activity.status)
  );
};

export const validateAllMockData = (): boolean => {
  const isPlatformStatsValid = validatePlatformStats(platformStats);
  const isRevenueTrendValid = validateRevenueTrend(revenueTrend);
  const isSubscriptionTiersValid = validateSubscriptionTiers(subscriptionTiers);
  const isRecentActivitiesValid = validateRecentActivities(recentActivities);

  console.log('Platform Stats Valid:', isPlatformStatsValid);
  console.log('Revenue Trend Valid:', isRevenueTrendValid);
  console.log('Subscription Tiers Valid:', isSubscriptionTiersValid);
  console.log('Recent Activities Valid:', isRecentActivitiesValid);

  return (
    isPlatformStatsValid &&
    isRevenueTrendValid &&
    isSubscriptionTiersValid &&
    isRecentActivitiesValid
  );
};

// Run validation
if (typeof window === 'undefined') {
  // Only run in Node.js environment
  console.log('Mock Data Validation Result:', validateAllMockData());
}
