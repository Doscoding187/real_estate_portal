export type AdvertiserRole = 'agent' | 'agency' | 'developer' | 'private_seller';
export type AdvertiserRoleSlug = 'agent' | 'agency' | 'developer' | 'private-seller';
export type TierKey = 'starter' | 'growth' | 'dominance';

export type AdvertiserPath = 'self_serve' | 'strategy_call' | 'preview_plans';

export const ADVERTISER_ROLE_SESSION_KEY = 'advertiser_selected_role';
export const ADVERTISER_PATH_SESSION_KEY = 'advertiser_selected_path';

type RoleConfig = {
  role: AdvertiserRole;
  slug: AdvertiserRoleSlug;
  label: string;
  rolePlural: string;
  shortLabel: string;
  description: string;
  stepTwoHeadline: string;
  stepTwoSubtext: string;
  primaryPath: AdvertiserPath;
  startSetupHref: string;
  strategyRecommended: boolean;
  tierLabels: Record<TierKey, string>;
  recommendedTier: TierKey;
  anchorCopy: string;
  valueHighlights: string[];
  addOns: string[];
  roiExample: string;
};

export const ADVERTISER_ROLES: RoleConfig[] = [
  {
    role: 'agent',
    slug: 'agent',
    label: 'Real Estate Agent',
    rolePlural: 'agents',
    shortLabel: 'Agent',
    description: 'For active agents focused on consistent qualified enquiries.',
    stepTwoHeadline: "Let's position your listings for serious buyers.",
    stepTwoSubtext:
      'Launch quickly with self-serve setup, then add strategy support when you need deeper market positioning.',
    primaryPath: 'self_serve',
    startSetupHref: '/agent/setup',
    strategyRecommended: false,
    tierLabels: {
      starter: 'Solo',
      growth: 'Accelerator',
      dominance: 'Market Leader',
    },
    recommendedTier: 'growth',
    anchorCopy: 'Most {rolePlural} choose the {recommendedTierLabel} plan.',
    valueHighlights: [
      'Buyer enquiry routing with performance visibility',
      'Listing exposure optimized for intent-led demand',
      'Brand profile authority and repeat discoverability',
    ],
    addOns: ['Media amplification boosts', 'Geographic dominance slots', 'Lead acceleration campaigns'],
    roiExample: 'Example: convert one extra qualified enquiry every week in your core area.',
  },
  {
    role: 'agency',
    slug: 'agency',
    label: 'Real Estate Agency',
    rolePlural: 'agencies',
    shortLabel: 'Agency',
    description: 'For agencies scaling team output, coverage, and lead consistency.',
    stepTwoHeadline: "Let's scale your agency performance layer.",
    stepTwoSubtext:
      'Start self-serve for immediate activation, with optional strategy guidance for multi-agent rollout.',
    primaryPath: 'self_serve',
    startSetupHref: '/agency/setup',
    strategyRecommended: true,
    tierLabels: {
      starter: 'Core',
      growth: 'Scale',
      dominance: 'Regional Authority',
    },
    recommendedTier: 'growth',
    anchorCopy: 'Most {rolePlural} choose the {recommendedTierLabel} plan.',
    valueHighlights: [
      'Agency visibility plus team-level lead flow control',
      'Brand consistency across listings and campaigns',
      'Operational insights for growth and retention',
    ],
    addOns: ['Agency-level media packages', 'Regional share-of-voice boosts', 'Performance intelligence modules'],
    roiExample: 'Example: increase qualified agency lead volume across priority suburbs month-over-month.',
  },
  {
    role: 'developer',
    slug: 'developer',
    label: 'Property Developer',
    rolePlural: 'developers',
    shortLabel: 'Developer',
    description: 'For project launches, showcase environments, and phased inventory.',
    stepTwoHeadline: "Let's structure your development launch strategy.",
    stepTwoSubtext:
      'Strategy onboarding is recommended for launch sequencing, but self-serve remains available for fast activation.',
    primaryPath: 'strategy_call',
    startSetupHref: '/developer/setup',
    strategyRecommended: true,
    tierLabels: {
      starter: 'Launch',
      growth: 'Portfolio',
      dominance: 'Strategic Expansion',
    },
    recommendedTier: 'growth',
    anchorCopy: 'Most {rolePlural} choose the {recommendedTierLabel} plan.',
    valueHighlights: [
      'Dedicated showcase positioning for development demand',
      'Media distribution support for project storytelling',
      'Performance visibility from exposure through enquiries',
    ],
    addOns: ['Launch push packages', 'Project highlight placements', 'Priority distribution windows'],
    roiExample: 'Example: compress time-to-qualified-interest during early launch phases.',
  },
  {
    role: 'private_seller',
    slug: 'private-seller',
    label: 'Private Seller',
    rolePlural: 'private sellers',
    shortLabel: 'Private Seller',
    description: 'For owner-led advertising with guided and simplified setup.',
    stepTwoHeadline: "Let's guide your owner-led advertising setup.",
    stepTwoSubtext:
      'Use self-serve to go live quickly, or book strategy support if you want help shaping your listing approach.',
    primaryPath: 'self_serve',
    startSetupHref: '/listings/create',
    strategyRecommended: false,
    tierLabels: {
      starter: 'Essential',
      growth: 'Advantage',
      dominance: 'Premium Exposure',
    },
    recommendedTier: 'growth',
    anchorCopy: 'Most {rolePlural} choose the {recommendedTierLabel} plan.',
    valueHighlights: [
      'Simple listing activation with meaningful visibility',
      'Clear enquiry routing and response continuity',
      'Practical guidance without complex marketing overhead',
    ],
    addOns: ['Short-term visibility boosts', 'Premium placement windows', 'Guided listing optimization'],
    roiExample: 'Example: improve serious enquiry quality within the first week live.',
  },
];

const roleBySlug = new Map(ADVERTISER_ROLES.map(role => [role.slug, role]));
const roleByValue = new Map(ADVERTISER_ROLES.map(role => [role.role, role]));

export function getAdvertiserRoleConfig(role: AdvertiserRole) {
  return roleByValue.get(role) || null;
}

export function getAdvertiserRoleBySlug(slug: string): AdvertiserRole | null {
  const normalized = slug.trim().toLowerCase();
  if (normalized === 'referral' || normalized === 'referrer') return 'agent';
  return roleBySlug.get(slug as AdvertiserRoleSlug)?.role || null;
}

export function getAdvertiserRoleSlug(role: AdvertiserRole): AdvertiserRoleSlug {
  return (roleByValue.get(role)?.slug || 'agent') as AdvertiserRoleSlug;
}

export function getRoleSelfServeHref(role: AdvertiserRole): string {
  return `/get-started/${getAdvertiserRoleSlug(role)}`;
}

export function getRoleStrategyHref(role: AdvertiserRole): string {
  return `/book-strategy?role=${encodeURIComponent(role)}`;
}

export function getStoredAdvertiserRole(): AdvertiserRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(ADVERTISER_ROLE_SESSION_KEY);
    if (!value) return null;
    return getAdvertiserRoleFromUnknown(value);
  } catch {
    return null;
  }
}

export function getStoredAdvertiserPath(): AdvertiserPath | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(ADVERTISER_PATH_SESSION_KEY);
    if (!value) return null;
    return getAdvertiserPathFromUnknown(value);
  } catch {
    return null;
  }
}

export function setStoredAdvertiserRole(role: AdvertiserRole): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ADVERTISER_ROLE_SESSION_KEY, role);
  } catch {
    // noop
  }
}

export function setStoredAdvertiserPath(path: AdvertiserPath): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ADVERTISER_PATH_SESSION_KEY, path);
  } catch {
    // noop
  }
}

export function getAdvertiserRoleFromUnknown(value: unknown): AdvertiserRole | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'referral') return 'agent';
  if (normalized === 'referrer') return 'agent';
  if (normalized === 'private-seller') return 'private_seller';
  if (normalized === 'private_seller') return 'private_seller';
  if (normalized === 'agent') return 'agent';
  if (normalized === 'agency') return 'agency';
  if (normalized === 'developer') return 'developer';
  return null;
}

export function getAdvertiserPathFromUnknown(value: unknown): AdvertiserPath | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'self_serve') return 'self_serve';
  if (normalized === 'strategy_call') return 'strategy_call';
  if (normalized === 'preview_plans') return 'preview_plans';
  return null;
}
