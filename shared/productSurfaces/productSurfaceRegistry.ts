/**
 * Product Surface Registry — the executable launch boundary.
 *
 * Every user-reachable client surface carries exactly one disposition:
 *
 *   launch — part of the MVP proposition; must be fully functional.
 *   pilot  — functional but intentionally limited and controlled.
 *   hidden — exists in code but MUST NOT be publicly routable or linked.
 *
 * There is no fourth category. A surface that is visible but unfinished is a
 * boundary violation, not a disposition.
 *
 * Enforcement lives in client/src/__tests__/productSurfaceBoundary.test.ts:
 *   1. every mounted route path in App.tsx / adminRouteRegistry /
 *      DeveloperRoutes must be governed by a registered pattern;
 *   2. no `hidden` pattern may be mounted;
 *   3. placeholder vocabulary ("coming soon", construction markers) is
 *      banned from shipped source.
 *
 * Declaration order inside PRODUCT_SURFACES is significant: it mirrors
 * wouter's first-match Switch resolution. Specific surfaces must be declared
 * before catch-all surfaces they must not shadow.
 *
 * To change a disposition, edit this registry with an owner and reason.
 */

export const SURFACE_DISPOSITIONS = ['launch', 'pilot', 'hidden'] as const;
export type SurfaceDisposition = (typeof SURFACE_DISPOSITIONS)[number];

export const SURFACE_DOMAINS = [
  'consumer-property',
  'explore-discovery',
  'services',
  'land',
  'shared-living',
  'commercial-office',
  'developer-workspace',
  'agent-workspace',
  'agency-workspace',
  'consumer-account',
  'distribution',
  'monetisation',
  'admin-operations',
  'platform-content',
  'platform-auth',
] as const;
export type SurfaceDomain = (typeof SURFACE_DOMAINS)[number];

export interface ProductSurface {
  id: string;
  domain: SurfaceDomain;
  disposition: SurfaceDisposition;
  /** Client route patterns mounted for this surface (wouter syntax). */
  routePatterns: string[];
  /**
   * Compatibility aliases that only redirect onward. They may point at any
   * non-hidden surface; a redirect that resolves to a hidden surface is a
   * boundary violation.
   */
  aliasPatterns?: string[];
  owner: string;
  /** Why this disposition holds today; required for pilot and hidden. */
  notes?: string;
  /** For hidden surfaces: what must be true before it can become pilot/launch. */
  promotionCriteria?: string[];
}

export interface EntityParticipationContract {
  entityType: string;
  /** Minimum end-to-end truths required before the entity appears in Explore. */
  contract: string[];
  status: 'satisfied' | 'unmet';
  /** Where the unmet gap lives today. Required when status is unmet. */
  unmetBecause?: string;
}

/**
 * Truthful participation contracts for Explore entity types.
 * An entity type participates in Explore only while its contract is satisfied.
 */
export const EXPLORE_ENTITY_PARTICIPATION_CONTRACTS: EntityParticipationContract[] = [
  {
    entityType: 'property',
    status: 'satisfied',
    contract: [
      'public source record',
      'accurate media',
      'listing detail page reachable',
      'accountable professional attached',
      'working enquiry action',
    ],
  },
  {
    entityType: 'development',
    status: 'satisfied',
    contract: [
      'public project page',
      'accurate media',
      'unit/project detail reachable',
      'developer contact or enquiry action works',
    ],
  },
  {
    entityType: 'location',
    status: 'unmet',
    unmetBecause:
      '/neighbourhood/:id is not mounted; NeighbourhoodDetail has a dead See All control, a permanent properties placeholder card, and console.log stubs instead of working save/play actions.',
    contract: [
      'canonical location identity',
      'credible context content',
      'linked public inventory section populated from real search',
      'useful next action into property search',
    ],
  },
  {
    entityType: 'professional',
    status: 'satisfied',
    contract: [
      'verified identity',
      'organisation affiliation visible',
      'active inventory or expertise presentable',
      'working contact/enquiry path',
    ],
  },
  {
    entityType: 'service',
    status: 'unmet',
    unmetBecause:
      'Provider request capture is login-gated and anonymous engagement identity rules are undecided; curated supply cohort not yet seeded. Services future-state convergence is in progress on svc/future-state-convergence.',
    contract: [
      'verified provider identity',
      'category and coverage area',
      'profile page',
      'working contact action under decided identity rules',
    ],
  },
  {
    entityType: 'insight',
    status: 'unmet',
    unmetBecause:
      'No accountable-publisher insight surface is wired into canonical discovery candidates yet.',
    contract: [
      'accountable publisher',
      'source/disclosure visible',
      'useful content',
      'related platform destination',
    ],
  },
];

export const PRODUCT_SURFACES: ProductSurface[] = [
  // ────────────────────────────────────────────────────────────────────────
  // CONSUMER PROPERTY — the transactional spine (LAUNCH)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'home',
    domain: 'consumer-property',
    disposition: 'launch',
    routePatterns: ['/'],
    owner: 'product',
  },
  {
    id: 'property-search-transaction-roots',
    domain: 'consumer-property',
    disposition: 'launch',
    routePatterns: ['/property-for-sale', '/property-to-rent'],
    aliasPatterns: ['/properties'],
    owner: 'product',
  },
  {
    id: 'property-detail',
    domain: 'consumer-property',
    disposition: 'launch',
    routePatterns: ['/property/:id'],
    owner: 'product',
  },
  {
    id: 'consumer-organise',
    domain: 'consumer-property',
    disposition: 'launch',
    routePatterns: ['/favorites', '/compare'],
    owner: 'product',
  },
  {
    id: 'development-public',
    domain: 'consumer-property',
    disposition: 'launch',
    routePatterns: [
      '/new-developments',
      '/development/:slug',
      '/development/:slug/unit/:unitId',
      '/developers',
    ],
    aliasPatterns: ['/developments'],
    owner: 'product',
    notes: 'Public development discovery directory and detail surfaces.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // EXPLORE DISCOVERY (LAUNCH core surfaces)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'explore-canonical',
    domain: 'explore-discovery',
    disposition: 'launch',
    routePatterns: ['/explore', '/explore/feed', '/explore/shorts', '/explore/map'],
    aliasPatterns: ['/explore/home', '/explore/discovery', '/explore/@:handle/:slug'],
    owner: 'product',
    notes:
      'Canonical mixed discovery feed. Participation of entity types is governed by EXPLORE_ENTITY_PARTICIPATION_CONTRACTS.',
  },
  {
    id: 'explore-consumer-publishing',
    domain: 'explore-discovery',
    disposition: 'hidden',
    routePatterns: ['/explore/upload'],
    aliasPatterns: [],
    owner: 'product',
    notes:
      'Upload creates inactive content safely, but moderation, activation, reporting, takedown and safe engagement identity are incomplete.',
    promotionCriteria: [
      'moderation queue operational',
      'activation path complete',
      'reporting and suppression live',
      'safe engagement identity rules decided',
    ],
  },
  {
    id: 'explore-experimental-surfaces',
    domain: 'explore-discovery',
    disposition: 'hidden',
    routePatterns: ['/explore/pilot', '/map-preview-demo'],
    owner: 'product',
    notes: 'Internal experiments; never part of the public proposition.',
    promotionCriteria: ['deliberate product decision to promote an experiment'],
  },
  {
    id: 'explore-neighbourhood-detail',
    domain: 'explore-discovery',
    disposition: 'hidden',
    routePatterns: ['/neighbourhood/:id'],
    owner: 'product',
    notes:
      'Currently unmounted by design: fails its truthful participation contract (dead actions, placeholder inventory section).',
    promotionCriteria: [
      'properties section loads real linked public inventory',
      'all card actions perform real work',
      'follow/save actions persist and surface in consumer account',
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // CONTROLLED VERTICALS (PILOT)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'services-marketplace',
    domain: 'services',
    disposition: 'pilot',
    routePatterns: [
      '/services',
      '/services/request/:category',
      '/services/results/:leadId',
      '/services/provider/:slug',
      '/services/reviews/:providerId',
      '/services/:category/:city/:province',
      '/services/:category',
    ],
    owner: 'product',
    notes:
      'Curated provider cohort only. Provider workspace lives under /service/*. Anonymous engagement identity rules pending.',
  },
  {
    id: 'service-provider-workspace',
    domain: 'services',
    disposition: 'pilot',
    routePatterns: ['/service/dashboard', '/service/profile', '/service/explore'],
    aliasPatterns: ['/service', '/pro/dashboard', '/pro/profile', '/pro/explore'],
    owner: 'product',
    notes: 'Provider operations for the curated pilot cohort; response/quote loop still completing.',
  },
  {
    id: 'land-vertical',
    domain: 'land',
    disposition: 'pilot',
    routePatterns: ['/plots-and-land', '/farms-and-smallholdings', '/land/:slug'],
    owner: 'product',
    notes:
      'Geography contract stays strict; classification allow-list governs supply. Controlled geography/supply launch.',
  },
  {
    id: 'shared-living-vertical',
    domain: 'shared-living',
    disposition: 'pilot',
    routePatterns: [
      '/shared-living',
      '/shared-living/thread/:token',
      '/shared-living/:slug',
      '/shared-living/list',
    ],
    owner: 'product',
    notes: 'Credible first vertical: discovery, detail, thread, moderation; controlled supply.',
  },
  {
    id: 'commercial-office-vertical',
    domain: 'commercial-office',
    disposition: 'pilot',
    routePatterns: ['/commercial', '/commercial/:slug', '/agent/commercial/office/create'],
    owner: 'product',
    notes: 'Narrow B2B slice; controlled supply.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // PROFESSIONAL WORKSPACES
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'agent-core-operations',
    domain: 'agent-workspace',
    disposition: 'launch',
    routePatterns: [
      '/agent/dashboard',
      '/agent/listings',
      '/agent/leads',
      '/agent/settings',
      '/agent/setup',
      '/onboarding/agent-profile',
      '/agent/select-package',
      '/listings/create',
      '/listing-template',
    ],
    aliasPatterns: ['/agent/calendar', '/agent/referrals', '/dashboard/settings'],
    owner: 'product',
    notes: 'The demand-response side of the core loop.',
  },
  {
    id: 'agent-growth-operations',
    domain: 'agent-workspace',
    disposition: 'pilot',
    routePatterns: [
      '/agent/canvassing',
      '/agent/marketing',
      '/agent/earnings',
      '/agent/analytics',
      '/agent/productivity',
    ],
    owner: 'product',
    notes: 'Operational extras that support agents but are not core-loop critical.',
  },
  {
    id: 'agent-training',
    domain: 'agent-workspace',
    disposition: 'hidden',
    routePatterns: ['/agent/training'],
    owner: 'product',
    notes:
      'Expansion surface; contains unfinished certificate catalogue. Not part of the MVP proposition.',
    promotionCriteria: ['certificate catalogue complete', 'content owned and maintained'],
  },
  {
    id: 'professional-discovery',
    domain: 'consumer-property',
    disposition: 'launch',
    routePatterns: ['/agents', '/agents/:slug', '/a/:slug', '/agent/profile/:agentId', '/agent/:id'],
    owner: 'product',
    notes:
      'Public professional profiles. Declared after /agent/* workspace surfaces so workspace paths win first-match.',
  },
  {
    id: 'agent-shell-fallback',
    domain: 'agent-workspace',
    disposition: 'launch',
    routePatterns: ['/agent/*'],
    owner: 'product',
    notes:
      'Wouter fallback for unrecognised /agent/* deep links into the agent shell. Declared last among agent surfaces so specific and hidden agent routes resolve first.',
  },
  {
    id: 'agency-workspace',
    domain: 'agency-workspace',
    disposition: 'launch',
    routePatterns: ['/agency/setup', '/agency/success', '/agency/onboarding/success', '/agency/*'],
    aliasPatterns: [
      '/agency',
      '/agency/dashboard',
      '/agency/subscription',
      '/agency/onboarding',
      '/agency/invite',
      '/agency/agents',
    ],
    owner: 'product',
    notes:
      'Agency operations respond to demand; transition authority consolidation tracked separately.',
  },
  {
    id: 'developer-workspace',
    domain: 'developer-workspace',
    disposition: 'launch',
    routePatterns: [
      '/developer/setup',
      '/developer',
      '/developer/dashboard',
      '/developer/developments/new',
      '/developer/developments',
      '/developer/developments/:developmentId',
      '/developer/create-development',
      '/developer/drafts',
      '/developer/leads',
      '/developer/messages',
      '/developer/analytics',
      '/developer/performance',
      '/developer/settings',
      '/developer/settings/team',
      '/developer/subscription',
      '/developer/settings/subscription',
      '/developer/plans',
    ],
    aliasPatterns: ['/developer/success', '/development-wizard', '/developments/create'],
    owner: 'product',
    notes: 'Supply-side authoring and funnel. Placeholder routes removed under boundary enforcement.',
  },
  {
    id: 'developer-workspace-deferred-modules',
    domain: 'developer-workspace',
    disposition: 'hidden',
    routePatterns: [
      '/developer/tasks',
      '/developer/reports',
      '/developer/explore',
      '/developer/notifications',
    ],
    owner: 'product',
    notes:
      'Modules without real functionality were unmounted rather than shown as placeholders. No fourth category.',
    promotionCriteria: ['each module ships real functionality behind its own decision'],
  },
  {
    id: 'developer-route-boundary',
    domain: 'developer-workspace',
    disposition: 'launch',
    routePatterns: ['/developer/:rest*'],
    owner: 'product',
    notes:
      'Public/workspace resolver for /developer/*. Declared after specific developer surfaces so hidden modules resolve first; at runtime it decides between the public publisher projection and the authenticated workspace.',
  },
  {
    id: 'publisher-projection',
    domain: 'consumer-property',
    disposition: 'launch',
    routePatterns: ['/developer/:slug'],
    owner: 'product',
    notes:
      'Governed public publisher projection. Resolved through the developer route boundary at runtime; declared after it for governance matching.',
  },
  {
    id: 'consumer-account',
    domain: 'consumer-account',
    disposition: 'launch',
    routePatterns: ['/user/dashboard', '/dashboard', '/saved-search/manage'],
    owner: 'product',
    notes: 'Includes the safe prospect journey tracker.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // AUTH + ONBOARDING (LAUNCH)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'platform-auth',
    domain: 'platform-auth',
    disposition: 'launch',
    routePatterns: [
      '/login',
      '/forgot-password',
      '/reset-password',
      '/set-password',
      '/activation-complete',
      '/accept-invitation',
      '/role-selection',
    ],
    owner: 'product',
  },

  // ────────────────────────────────────────────────────────────────────────
  // DISTRIBUTION (PILOT — controlled network only)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'distribution-network',
    domain: 'distribution',
    disposition: 'pilot',
    routePatterns: [
      '/distribution/manager/legacy',
      '/distribution/manager/developments',
      '/distribution/manager/developments/:developmentId',
      '/distribution/manager/deals/:dealId',
      '/distribution/manager/onboarding',
      '/distribution/partner/overview',
      '/distribution/partner/developments',
      '/distribution/partner/accelerator',
      '/partner/referrals/accelerator',
      '/distribution/partner/submit',
      '/distribution/partner/referrals',
      '/distribution/partner/commissions',
      '/distribution/partner/referrals/:dealId',
      '/distribution-network',
      '/distribution-network/apply',
    ],
    aliasPatterns: [
      '/distribution/manager',
      '/distribution/partner',
      '/distribution-network/login',
      '/referral/apply',
      '/referral-upload/:token',
      '/get-started/referral',
      '/get-started/referrer',
      '/referrer/dashboard',
    ],
    owner: 'partnerships',
    notes: 'Strong internal workflow; broad public promise deferred.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // MONETISATION FUNNELS (PILOT — controlled)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'advertise-funnels',
    domain: 'monetisation',
    disposition: 'pilot',
    routePatterns: [
      '/advertise',
      '/advertise/sell',
      '/advertise/sell/agents',
      '/advertise/sell/agencies',
      '/advertise/sell/developers',
      '/advertise/finance',
      '/advertise/finance/banks',
      '/advertise/finance/originators',
      '/advertise/services',
      '/subscription-plans',
      '/book-strategy',
    ],
    aliasPatterns: [
      '/advertise-with-us',
      '/advertise with us',
      '/advertise/sell/agents/onboarding',
      '/get-started',
      '/get-started/:role',
      '/get-started/:role/confirmation',
    ],
    owner: 'revenue',
    notes: 'Campaign monetisation remains a controlled capability.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // ADMIN OPERATIONS (PILOT — internal, role-gated)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'admin-operations',
    domain: 'admin-operations',
    disposition: 'pilot',
    routePatterns: ['/admin/review/:id', '/admin/land-review', '/admin/*'],
    owner: 'operations',
    notes:
      'Internal operations workspace governed by adminRouteRegistry; individual paths validated against that registry by its own guard test.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // PLATFORM CONTENT (LAUNCH)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'seo-content-landings',
    domain: 'platform-content',
    disposition: 'launch',
    routePatterns: [
      '/insights/:slug',
      '/guides/:slug',
      '/tools/:slug',
      '/legal/:slug',
      '/support/:slug',
      '/company/:slug',
      '/about',
      '/contact',
      '/careers',
      '/press',
      '/partners',
      '/help',
      '/safety',
      '/faq',
      '/terms',
      '/privacy',
      '/cookies',
      '/compliance',
      '/agencies',
    ],
    owner: 'content',
  },

  // ────────────────────────────────────────────────────────────────────────
  // GEOGRAPHY AUTHORITY (LAUNCH) — declared last: wouter Switch resolves
  // first-match by declaration order, and this surface is the fallback
  // authority for canonical province/city/suburb paths only.
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'geography-authority-pages',
    domain: 'consumer-property',
    disposition: 'launch',
    routePatterns: ['/:province/:city/:suburb', '/:province/:city', '/:province'],
    owner: 'product',
    notes:
      'Neutral geography authority; renders only for canonical province slugs, otherwise NotFound.',
  },
];
