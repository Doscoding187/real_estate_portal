export type SubscriptionTier = 'free_trial' | 'basic' | 'premium';

export const SUBSCRIPTION_TIER_LIMITS: Record<SubscriptionTier, { listings: number }> = {
  free_trial: { listings: 1 },
  basic: { listings: 5 },
  premium: { listings: 999999 },
};
