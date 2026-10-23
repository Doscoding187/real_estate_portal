import type { LucideIcon } from 'lucide-react';
import {
  Camera,
  ClipboardCheck,
  Hammer,
  HardHat,
  Landmark,
  LayoutGrid,
  Leaf,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  buildServiceCategoryPath,
  type ServiceCategory,
  type ServiceJourneyContext,
} from './catalog';

/**
 * License-free imagery for the Services marketplace.
 *
 * All photographs are downloaded from Unsplash and served from
 * `client/public/images/services`. The Unsplash License permits commercial use
 * without attribution; the source list is recorded in the directory's
 * ATTRIBUTION.md for provenance.
 */
export const SERVICES_IMAGES = {
  hero: '/images/services/hero-services.jpg',
  ecosystem: '/images/services/ecosystem-property.jpg',
  categories: {
    home_improvement: '/images/services/category-home-improvement.jpg',
    finance_legal: '/images/services/category-finance-legal.jpg',
    moving: '/images/services/category-moving.jpg',
    inspection_compliance: '/images/services/category-inspection.jpg',
    insurance: '/images/services/category-insurance.jpg',
    media_marketing: '/images/services/category-media.jpg',
  } satisfies Record<ServiceCategory, string>,
} as const;

type ServiceLike = {
  category?: string | null;
  code?: string | null;
  displayName?: string | null;
};

type ProviderLike = {
  providerId: number;
  services?: ServiceLike[];
};

export type PopularServiceGroup = {
  key: string;
  label: string;
  shortLabel: string;
  image: string;
  icon: LucideIcon;
  category: ServiceCategory | null;
  query: string;
  /** Curated demand baseline until search telemetry is recorded. */
  demandWeight: number;
  keywords: string[];
};

/**
 * Trade-level popular services shown in the circular icon rail.
 *
 * These are intentionally different from the six directory categories below:
 * the rail answers "what job do you need done?", while the category cards
 * answer "which part of the directory do you want to browse?". Keeping the two
 * taxonomies distinct prevents the same six labels appearing twice on one page.
 */
export const POPULAR_SERVICE_GROUPS: PopularServiceGroup[] = [
  {
    key: 'plumbing',
    label: 'Plumbing & Maintenance',
    shortLabel: 'Plumbing & Maintenance',
    image: '/images/services/trade-plumbing.jpg',
    icon: Wrench,
    category: 'home_improvement',
    query: 'plumbing',
    demandWeight: 10,
    keywords: ['plumb', 'leak', 'geyser', 'drain', 'pipe', 'tap', 'water'],
  },
  {
    key: 'electrical',
    label: 'Electrical & Installations',
    shortLabel: 'Electrical & Installations',
    image: '/images/services/trade-electrical.jpg',
    icon: Zap,
    category: 'home_improvement',
    query: 'electrical',
    demandWeight: 9,
    keywords: ['electric', 'wiring', 'coc', 'solar', 'inverter', 'lighting'],
  },
  {
    key: 'roofing',
    label: 'Roofing & Construction',
    shortLabel: 'Roofing & Construction',
    image: '/images/services/trade-roofing.jpg',
    icon: HardHat,
    category: 'home_improvement',
    query: 'roofing',
    demandWeight: 8,
    keywords: ['roof', 'waterproof', 'gutter', 'rainwater', 'ceiling'],
  },
  {
    key: 'renovations',
    label: 'Renovations & Building',
    shortLabel: 'Renovations & Building',
    image: '/images/services/trade-renovations.jpg',
    icon: Hammer,
    category: 'home_improvement',
    query: 'renovations',
    demandWeight: 8,
    keywords: ['renovat', 'kitchen', 'bathroom', 'building', 'carpentr', 'tiling', 'floor'],
  },
  {
    key: 'painting',
    label: 'Painting & Decorating',
    shortLabel: 'Painting & Decorating',
    image: '/images/services/trade-painting.jpg',
    icon: Paintbrush,
    category: 'home_improvement',
    query: 'painting',
    demandWeight: 7,
    keywords: ['paint', 'plaster', 'decorat', 'wallpaper'],
  },
  {
    key: 'cleaning',
    label: 'Cleaning & Property Care',
    shortLabel: 'Cleaning & Property Care',
    image: '/images/services/trade-cleaning.jpg',
    icon: Sparkles,
    category: 'home_improvement',
    query: 'cleaning',
    demandWeight: 6,
    keywords: ['clean', 'carpet', 'pest', 'window', 'sanit'],
  },
  {
    key: 'garden',
    label: 'Garden & Outdoor',
    shortLabel: 'Garden & Outdoor',
    image: '/images/services/trade-garden.jpg',
    icon: Leaf,
    category: 'home_improvement',
    query: 'garden',
    demandWeight: 5,
    keywords: ['garden', 'landscap', 'pool', 'paving', 'tree', 'irrigation'],
  },
  {
    key: 'moving',
    label: 'Moving & Storage',
    shortLabel: 'Moving & Storage',
    image: '/images/services/category-moving.jpg',
    icon: Truck,
    category: 'moving',
    query: 'moving',
    demandWeight: 4,
    keywords: ['moving', 'move', 'storage', 'relocat', 'removal', 'packing'],
  },
  {
    key: 'inspection',
    label: 'Inspections & Compliance',
    shortLabel: 'Inspections & Compliance',
    image: '/images/services/category-inspection.jpg',
    icon: ClipboardCheck,
    category: 'inspection_compliance',
    query: 'inspection',
    demandWeight: 3,
    keywords: ['inspect', 'compliance', 'certificate', 'snag', 'valuation', 'survey'],
  },
  {
    key: 'finance',
    label: 'Bond & Home Finance',
    shortLabel: 'Bond & Finance',
    image: '/images/services/category-finance-legal.jpg',
    icon: Landmark,
    category: 'finance_legal',
    query: 'bond',
    demandWeight: 3,
    keywords: ['bond', 'finance', 'loan', 'mortgage', 'conveyanc', 'legal', 'attorney'],
  },
  {
    key: 'insurance',
    label: 'Property Insurance',
    shortLabel: 'Insurance',
    image: '/images/services/category-insurance.jpg',
    icon: ShieldCheck,
    category: 'insurance',
    query: 'insurance',
    demandWeight: 2,
    keywords: ['insurance', 'insure', 'cover', 'policy'],
  },
  {
    key: 'media',
    label: 'Photography & Marketing',
    shortLabel: 'Photography & Media',
    image: '/images/services/category-media.jpg',
    icon: Camera,
    category: 'media_marketing',
    query: 'photography',
    demandWeight: 1,
    keywords: ['photo', 'video', 'market', 'media', 'virtual', 'drone'],
  },
  {
    key: 'other',
    label: 'Other Property Services',
    shortLabel: 'Other Services',
    image: '/images/services/trade-other.jpg',
    icon: LayoutGrid,
    category: null,
    query: '',
    demandWeight: 0,
    keywords: [],
  },
];

function serviceText(service: ServiceLike): string {
  return `${service.code || ''} ${service.displayName || ''}`.toLowerCase();
}

export function popularServiceGroupFor(service: ServiceLike): PopularServiceGroup {
  const text = serviceText(service);
  return (
    POPULAR_SERVICE_GROUPS.find(
      group => group.key !== 'other' && group.keywords.some(keyword => text.includes(keyword)),
    ) || POPULAR_SERVICE_GROUPS[POPULAR_SERVICE_GROUPS.length - 1]!
  );
}

export type RankedPopularService = PopularServiceGroup & {
  providerCount: number;
  score: number;
};

/**
 * Ranks the rail by a documented demand baseline plus live published supply.
 *
 * The platform does not yet record search terms, so it must not claim a
 * "most searched" ordering it cannot evidence. The baseline is a curated
 * statement of expected demand; published provider supply is live. When search
 * telemetry exists it can replace the baseline without changing the contract.
 */
export function rankPopularServiceGroups(providers: ProviderLike[]): RankedPopularService[] {
  const supply = new Map<string, Set<number>>();
  for (const group of POPULAR_SERVICE_GROUPS) supply.set(group.key, new Set());

  for (const provider of providers) {
    for (const service of provider.services || []) {
      const group = popularServiceGroupFor(service);
      supply.get(group.key)?.add(provider.providerId);
    }
  }

  return POPULAR_SERVICE_GROUPS.map(group => {
    const providerCount = supply.get(group.key)?.size || 0;
    const score = group.demandWeight + Math.min(providerCount, 12) * 0.6;
    return { ...group, providerCount, score };
  }).sort(
    (a, b) =>
      b.score - a.score || b.demandWeight - a.demandWeight || a.label.localeCompare(b.label),
  );
}

export function buildPopularServiceHref(
  group: PopularServiceGroup,
  context: ServiceJourneyContext = {},
): string {
  if (!group.category) return '/services';
  const base = buildServiceCategoryPath(group.category, context);
  if (!group.query) return base;
  return `${base}${base.includes('?') ? '&' : '?'}query=${encodeURIComponent(group.query)}`;
}
