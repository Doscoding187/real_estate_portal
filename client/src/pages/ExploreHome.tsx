import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Grid3x3,
  ArrowRight,
  Flame,
  Clapperboard,
} from 'lucide-react';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { ResponsiveFilterPanel } from '@/components/explore-discovery/ResponsiveFilterPanel';
import { PersonalizedContentBlock } from '@/components/explore-discovery/PersonalizedContentBlock';
import { TrendingVideosSection } from '@/components/explore-discovery/TrendingVideosSection';
import { WelcomeOverlay } from '@/components/explore-discovery/WelcomeOverlay';
import { OnboardingTooltip } from '@/components/explore-discovery/OnboardingTooltip';
import { useExploreCommonState } from '@/hooks/useExploreCommonState';
import { usePersonalizedContent } from '@/hooks/usePersonalizedContent';
import { useExploreIntent } from '@/hooks/useExploreIntent';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';
import { useWelcomeOverlay } from '@/hooks/useWelcomeOverlay';
import { useTopicNavigationTooltip, usePartnerContentTooltip } from '@/hooks/useOnboardingTooltip';
import type { DiscoveryItem } from '@/domains/discovery/types';
import { type ExploreIntent, writeStoredExploreIntent } from '@/lib/exploreIntent';
import { designTokens } from '@/lib/design-tokens';
import {
  pageVariants,
  staggerContainerVariants,
  staggerItemVariants,
  buttonVariants,
  getVariants,
} from '@/lib/animations/exploreAnimations';

type ExploreFocus = 'buy' | 'sell' | 'renovate' | 'services' | 'finance' | 'invest' | 'neighbourhood';
type LegacyExploreIntent = ExploreIntent;

const EXPLORE_INTENT_SESSION_KEY = 'exploreIntent';

const SECTION_ID_ALIASES: Record<string, string> = {
  'for-you': 'for_you',
  for_you: 'for_you',
  'home-services': 'home_services',
  home_services: 'home_services',
  'featured-tours': 'featured_tours',
  featured_tours: 'featured_tours',
  'new-listings': 'new_listings',
  new_listings: 'new_listings',
  'top-contractors-builders': 'top_contractors_builders',
  top_contractors_builders: 'top_contractors_builders',
  'finance-education': 'finance_education',
  finance_education: 'finance_education',
  'explore-neighbourhoods': 'neighbourhoods',
  neighbourhoods: 'neighbourhoods',
  'market-insights': 'market_insights',
  market_insights: 'market_insights',
};

const SECTION_ORDER = [
  'for_you',
  'home_services',
  'featured_tours',
  'new_listings',
  'top_contractors_builders',
  'finance_education',
  'neighbourhoods',
  'market_insights',
] as const;

const SECTION_SURFACE_META: Record<
  string,
  {
    eyebrow: string;
    cta: string;
    accent: string;
  }
> = {
  for_you: {
    eyebrow: 'For you',
    cta: 'Open your mix',
    accent: 'linear-gradient(135deg, rgba(59,130,246,0.92) 0%, rgba(99,102,241,0.9) 100%)',
  },
  home_services: {
    eyebrow: 'Home services',
    cta: 'Browse pros',
    accent: 'linear-gradient(135deg, rgba(16,185,129,0.92) 0%, rgba(20,184,166,0.9) 100%)',
  },
  featured_tours: {
    eyebrow: 'Walkthroughs',
    cta: 'Watch tours',
    accent: 'linear-gradient(135deg, rgba(34,197,94,0.92) 0%, rgba(59,130,246,0.9) 100%)',
  },
  new_listings: {
    eyebrow: 'New listings',
    cta: 'See what is fresh',
    accent: 'linear-gradient(135deg, rgba(249,115,22,0.92) 0%, rgba(239,68,68,0.9) 100%)',
  },
  top_contractors_builders: {
    eyebrow: 'Top builders',
    cta: 'Open the lane',
    accent: 'linear-gradient(135deg, rgba(245,158,11,0.92) 0%, rgba(234,88,12,0.9) 100%)',
  },
  finance_education: {
    eyebrow: 'Finance',
    cta: 'Watch insights',
    accent: 'linear-gradient(135deg, rgba(249,115,22,0.92) 0%, rgba(251,191,36,0.9) 100%)',
  },
  neighbourhoods: {
    eyebrow: 'Neighbourhoods',
    cta: 'Explore places',
    accent: 'linear-gradient(135deg, rgba(168,85,247,0.92) 0%, rgba(217,70,239,0.9) 100%)',
  },
  market_insights: {
    eyebrow: 'Market signals',
    cta: 'Read the market',
    accent: 'linear-gradient(135deg, rgba(14,165,233,0.92) 0%, rgba(99,102,241,0.9) 100%)',
  },
};

const SECTION_ORDER_INDEX = SECTION_ORDER.reduce<Record<string, number>>((acc, id, index) => {
  acc[id] = index;
  return acc;
}, {});

function normalizeSectionId(section: { id: string; canonicalId?: string }) {
  const rawId = (section.canonicalId || section.id || '').trim().toLowerCase();
  return SECTION_ID_ALIASES[rawId] ?? rawId;
}

function getSectionSurfaceMeta(sectionId: string) {
  return (
    SECTION_SURFACE_META[sectionId] ?? {
      eyebrow: 'Discovery',
      cta: 'Open channel',
      accent: 'linear-gradient(135deg, rgba(59,130,246,0.92) 0%, rgba(99,102,241,0.9) 100%)',
    }
  );
}

function mapFocusToLegacyIntent(focus: ExploreFocus): LegacyExploreIntent {
  switch (focus) {
    case 'buy':
      return 'buy';
    case 'sell':
      return 'sell';
    case 'invest':
      return 'invest';
    case 'renovate':
    case 'services':
      return 'improve';
    case 'finance':
    case 'neighbourhood':
      return 'learn';
    default:
      return 'buy';
  }
}

function mapSectionToFocus(sectionId: string): ExploreFocus {
  switch (sectionId) {
    case 'home_services':
      return 'services';
    case 'featured_tours':
    case 'new_listings':
    case 'for_you':
      return 'buy';
    case 'top_contractors_builders':
      return 'renovate';
    case 'finance_education':
      return 'finance';
    case 'neighbourhoods':
      return 'neighbourhood';
    case 'market_insights':
      return 'invest';
    default:
      return 'buy';
  }
}

function getDiscoveryItemImage(item?: DiscoveryItem): string | undefined {
  if (!item?.data) return undefined;

  const data = item.data as Record<string, any>;

  if (typeof data.imageUrl === 'string' && data.imageUrl) return data.imageUrl;
  if (typeof data.heroBannerUrl === 'string' && data.heroBannerUrl) return data.heroBannerUrl;
  if (typeof data.thumbnailUrl === 'string' && data.thumbnailUrl) return data.thumbnailUrl;
  if (typeof data.mediaUrl === 'string' && data.mediaUrl) return data.mediaUrl;
  if (typeof data.videoUrl === 'string' && data.videoUrl) return data.videoUrl;

  return undefined;
}

export default function ExploreHome() {
  const { intent, setIntent } = useExploreIntent();
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    setShowFilters,
  } = useExploreCommonState({ initialViewMode: 'home' });

  // Onboarding hooks
  const welcomeOverlay = useWelcomeOverlay();
  const topicTooltip = useTopicNavigationTooltip();
  const partnerTooltip = usePartnerContentTooltip();

  // Refs for tooltip positioning
  const topicsRef = useRef<HTMLDivElement>(null);
  const partnerContentRef = useRef<HTMLDivElement>(null);

  // Get filter count from Zustand store
  const getFilterCount = useExploreFiltersStore(state => state.getFilterCount);

  // Get personalized content sections
  const { sections, isLoading: sectionsLoading } = usePersonalizedContent({
    categoryId: selectedCategoryId ?? undefined,
    intent,
  });

  // Navigation
  const [location, setLocation] = useLocation();

  const navigateToFeed = (focus: ExploreFocus, subFocus?: string) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        EXPLORE_INTENT_SESSION_KEY,
        JSON.stringify({
          focus,
          subFocus,
          ts: Date.now(),
        }),
      );
    }
    const legacyIntent = mapFocusToLegacyIntent(focus);
    writeStoredExploreIntent(legacyIntent);
    void setIntent(legacyIntent);
    setLocation('/explore/feed');
  };

  const handleItemClick = (item: DiscoveryItem) => {
    // Track partner content encounters for tooltip
    if (item.partnerId) {
      partnerTooltip.onPartnerContentEncounter();
    }

    const data = item.data as Record<string, unknown> | undefined;
    const listingId =
      Number(data?.linkedListingId || data?.listingId || data?.propertyId || 0) || undefined;

    if (item.type === 'property') {
      if (listingId) {
        setLocation(`/property/${listingId}`);
        return;
      }
      navigateToFeed('buy');
      return;
    }

    if (item.type === 'video') {
      navigateToFeed('buy');
      return;
    }

    if (item.type === 'neighbourhood') {
      const name =
        typeof item.data?.name === 'string' ? String(item.data.name).toLowerCase() : undefined;
      navigateToFeed('neighbourhood', name);
      return;
    }

    if (item.type === 'insight') {
      navigateToFeed('finance');
      return;
    }

    navigateToFeed('buy');
  };

  const handleSeeAll = (sectionId: string) => {
    navigateToFeed(mapSectionToFocus(sectionId));
  };

  // Handle "See All" for trending videos - switch to videos view
  const handleTrendingVideosSeeAll = () => {
    topicTooltip.incrementScrollCount();
    navigateToFeed('buy');
  };

  const handleTrendingVideoClick = () => {
    topicTooltip.incrementScrollCount();
    navigateToFeed('buy');
  };

  const handleWelcomeTopicSelect = (topicSlug: string) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        EXPLORE_INTENT_SESSION_KEY,
        JSON.stringify({ focus: 'buy', subFocus: topicSlug, ts: Date.now() }),
      );
    }
    writeStoredExploreIntent('buy');
    welcomeOverlay.onTopicSelect(topicSlug);
  };

  const orderedSections = useMemo(() => {
    return sections
      .map((section, index) => ({
        section,
        index,
        normalizedId: normalizeSectionId(section),
      }))
      .sort((a, b) => {
        const ai = SECTION_ORDER_INDEX[a.normalizedId] ?? Number.MAX_SAFE_INTEGER;
        const bi = SECTION_ORDER_INDEX[b.normalizedId] ?? Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return a.index - b.index;
      })
      .map(item => item.section);
  }, [sections]);
  const mediaGatewaySections = useMemo(() => orderedSections.slice(0, 6), [orderedSections]);
  const featuredGatewaySections = useMemo(() => mediaGatewaySections.slice(0, 3), [mediaGatewaySections]);
  const quickGatewaySections = useMemo(() => mediaGatewaySections.slice(3, 6), [mediaGatewaySections]);

  return (
    <motion.div
      className="min-h-screen"
      style={{
        backgroundColor: designTokens.colors.bg.secondary,
        backgroundImage:
          'radial-gradient(circle at top, rgba(99, 102, 241, 0.14), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(244,247,251,1) 100%)',
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={getVariants(pageVariants)}
    >
      {/* Header - Modern sticky design */}
      <motion.header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          backgroundColor: designTokens.colors.glass.bg,
          borderBottom: `1px solid ${designTokens.colors.bg.tertiary}`,
          boxShadow: designTokens.shadows.sm,
        }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        role="banner"
        aria-label="Explore navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Title and View Mode Toggle */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="min-w-0">
              <motion.h1
                className="text-3xl font-bold"
                style={{
                  color: designTokens.colors.text.primary,
                  fontWeight: designTokens.typography.fontWeight.bold,
                }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                Explore
              </motion.h1>
              <p
                className="mt-1 text-sm"
                style={{ color: designTokens.colors.text.secondary }}
              >
                Media-first discovery across listings, walkthroughs, neighbourhoods, services, and insights.
              </p>
            </div>

            {/* View mode toggle - Modern pill design */}
            <motion.div
              className="flex items-center gap-1 p-1 rounded-full"
              style={{
                backgroundColor: designTokens.colors.bg.tertiary,
              }}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              role="tablist"
              aria-label="Explore view selection"
            >
              <motion.button
                onClick={() => setLocation('/explore/home')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor:
                    location === '/explore/home' ? designTokens.colors.bg.primary : 'transparent',
                  color:
                    location === '/explore/home'
                      ? designTokens.colors.text.primary
                      : designTokens.colors.text.secondary,
                  boxShadow: location === '/explore/home' ? designTokens.shadows.sm : 'none',
                  fontWeight: designTokens.typography.fontWeight.medium,
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                role="tab"
                aria-selected={location === '/explore/home'}
                aria-label="Home"
              >
                <Grid3x3 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Home</span>
              </motion.button>
              <motion.button
                onClick={() => setLocation('/explore/feed')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor:
                    location === '/explore/feed' ? designTokens.colors.bg.primary : 'transparent',
                  color:
                    location === '/explore/feed'
                      ? designTokens.colors.text.primary
                      : designTokens.colors.text.secondary,
                  boxShadow: location === '/explore/feed' ? designTokens.shadows.sm : 'none',
                  fontWeight: designTokens.typography.fontWeight.medium,
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                role="tab"
                aria-selected={location === '/explore/feed'}
                aria-label="Feed"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Feed</span>
              </motion.button>
              <motion.button
                onClick={() => setLocation('/explore/shorts')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor:
                    location.startsWith('/explore/shorts') ? designTokens.colors.bg.primary : 'transparent',
                  color:
                    location.startsWith('/explore/shorts')
                      ? designTokens.colors.text.primary
                      : designTokens.colors.text.secondary,
                  boxShadow: location.startsWith('/explore/shorts') ? designTokens.shadows.sm : 'none',
                  fontWeight: designTokens.typography.fontWeight.medium,
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                role="tab"
                aria-selected={location.startsWith('/explore/shorts')}
                aria-label="Shorts"
              >
                <Clapperboard className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Shorts</span>
              </motion.button>
            </motion.div>
          </div>

          {/* Category filter */}
          <motion.div
            ref={topicsRef}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <LifestyleCategorySelector
              selectedCategoryId={selectedCategoryId ?? undefined}
              onCategoryChange={id => {
                setSelectedCategoryId(id ?? null);
                // Increment scroll count when category changes
                topicTooltip.incrementScrollCount();
              }}
              variant="light"
              className="pb-2"
            />
          </motion.div>

          <motion.div
            className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            {[
              { label: 'For You', action: () => navigateToFeed('buy') },
              { label: 'Listings', action: () => navigateToFeed('buy', 'listings') },
              { label: 'Walkthroughs', action: () => setLocation('/explore/shorts') },
              { label: 'Neighbourhoods', action: () => navigateToFeed('neighbourhood') },
              { label: 'Home Services', action: () => navigateToFeed('services') },
              { label: 'Finance', action: () => navigateToFeed('finance') },
            ].map(pill => (
              <motion.button
                key={pill.label}
                type="button"
                onClick={pill.action}
                className="flex-shrink-0 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {pill.label}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.header>

      {/* Content - Smooth transitions between view modes */}
      {/* Content */}
      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        id="explore-content"
        role="main"
        aria-label="Explore content"
      >
        <motion.div
          key="home-view"
          className="py-6 space-y-8"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={getVariants(pageVariants)}
        >
          {/* Trending Videos Section - First content after header */}
          <TrendingVideosSection
            categoryId={selectedCategoryId ?? undefined}
            onVideoClick={handleTrendingVideoClick}
            onSeeAll={handleTrendingVideosSeeAll}
          />

          <motion.section
            className=""
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            role="region"
            aria-label="Discovery channels"
          >
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-600">
                  <Flame className="h-3.5 w-3.5" />
                  Discovery channels
                </div>
                <h2
                  className="mt-3 text-2xl font-semibold"
                  style={{ color: designTokens.colors.text.primary }}
                >
                  Jump into a lane from the media itself
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Each lane is a live doorway into a different part of the discovery engine.
                </p>
              </div>

              <motion.button
                type="button"
                onClick={() => navigateToFeed('buy')}
                className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white md:inline-flex"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                  boxShadow: '0 16px 30px rgba(239, 68, 68, 0.22)',
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Open Feed
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
              {featuredGatewaySections.map((section, index) => {
                const previewImages = Array.from(
                  new Set(section.items.map(getDiscoveryItemImage).filter(Boolean) as string[]),
                ).slice(0, 3);
                const sectionId = normalizeSectionId(section);
                const meta = getSectionSurfaceMeta(sectionId);

                const previewA = previewImages[0];
                const previewB = previewImages[1] || previewImages[0];
                const previewC = previewImages[2] || previewImages[1] || previewImages[0];

                return (
                  <motion.button
                    key={section.id}
                    type="button"
                    onClick={() => handleSeeAll(sectionId)}
                    className={`group relative min-h-[22rem] overflow-hidden rounded-[34px] text-left ${
                      index === 0 ? 'lg:row-span-2' : ''
                    }`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.28 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.99 }}
                    style={{
                      boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
                    }}
                  >
                    <div
                      className={`grid h-full gap-1 rounded-[34px] bg-slate-200 p-1 ${
                        index === 0 ? 'grid-cols-[1.55fr_0.8fr]' : 'grid-cols-[1.15fr_0.85fr]'
                      }`}
                    >
                      <div className="relative overflow-hidden rounded-[26px]">
                        {previewA ? (
                          <img
                            src={previewA}
                            alt={section.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full bg-slate-300" />
                        )}
                      </div>
                      <div className="grid gap-1">
                        <div className="relative overflow-hidden rounded-[22px]">
                          {previewB ? (
                            <img
                              src={previewB}
                              alt=""
                              className="h-full min-h-[120px] w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full min-h-[120px] w-full bg-slate-300" />
                          )}
                        </div>
                        <div className="relative overflow-hidden rounded-[22px]">
                          {previewC ? (
                            <img
                              src={previewC}
                              alt=""
                              className="h-full min-h-[120px] w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full min-h-[120px] w-full bg-slate-300" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/24 to-transparent" />
                    <div
                      className="absolute inset-x-0 top-0 h-28 opacity-90"
                      style={{
                        background: `linear-gradient(180deg, rgba(2,6,23,0.65) 0%, transparent 100%), ${meta.accent}`,
                        mixBlendMode: 'screen',
                      }}
                    />

                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg"
                          style={{ background: meta.accent }}
                        >
                          {meta.eyebrow}
                        </span>
                        <span className="rounded-full border border-white/18 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
                          {section.items.length} items
                        </span>
                      </div>
                      <h3 className={`${index === 0 ? 'text-[2rem]' : 'text-xl'} font-semibold leading-tight`}>
                        {section.title}
                      </h3>
                      {section.subtitle && (
                        <p className="mt-2 max-w-sm text-sm leading-6 text-white/74 line-clamp-2">
                          {section.subtitle}
                        </p>
                      )}
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                        {meta.cta}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}

              <div className="grid gap-4">
                {quickGatewaySections.map((section, index) => {
                  const previewImage = section.items.map(getDiscoveryItemImage).find(Boolean);
                  const sectionId = normalizeSectionId(section);
                  const meta = getSectionSurfaceMeta(sectionId);

                  return (
                    <motion.button
                      key={section.id}
                      type="button"
                      onClick={() => handleSeeAll(sectionId)}
                      className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 text-left shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index + 3) * 0.05, duration: 0.28 }}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="grid min-h-[10.2rem] grid-cols-[0.9fr_1.1fr]">
                        <div className="relative overflow-hidden">
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt={section.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-slate-800" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/45" />
                        </div>

                        <div className="relative flex flex-col justify-end overflow-hidden p-5 text-white">
                          <div
                            className="absolute inset-0 opacity-90"
                            style={{ background: meta.accent }}
                          />
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,6,23,0.25),rgba(2,6,23,0.72))]" />
                          <div className="relative">
                            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/82 backdrop-blur-sm">
                              {meta.eyebrow}
                            </span>
                            <h3 className="mt-3 text-lg font-semibold leading-tight">{section.title}</h3>
                            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                              {meta.cta}
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* Personalized Content Sections with stagger animation */}
          {sectionsLoading ? (
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants}>
                <PersonalizedContentBlock
                  title="Loading..."
                  items={[]}
                  onItemClick={handleItemClick}
                  isLoading={true}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <PersonalizedContentBlock
                  title="Loading..."
                  items={[]}
                  onItemClick={handleItemClick}
                  isLoading={true}
                />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              {orderedSections.map(section => (
                <motion.div
                  key={section.id}
                  ref={normalizeSectionId(section) === 'top_contractors_builders' ? partnerContentRef : undefined}
                  variants={staggerItemVariants}
                  style={{ marginBottom: designTokens.spacing.xl }}
                >
                  <PersonalizedContentBlock
                    title={section.title}
                    subtitle={section.subtitle}
                    items={section.items}
                    videoAspect={section.videoAspect}
                    onItemClick={handleItemClick}
                    onSeeAll={() => handleSeeAll(normalizeSectionId(section))}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty state - Modern design */}
          {!sectionsLoading && orderedSections.length === 0 && (
            <motion.div
              className="text-center py-16 px-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Grid3x3
                  className="w-20 h-20 mx-auto mb-6"
                  style={{ color: designTokens.colors.text.tertiary }}
                />
              </motion.div>
              <motion.h3
                className="text-2xl font-semibold mb-3"
                style={{
                  color: designTokens.colors.text.primary,
                  fontWeight: designTokens.typography.fontWeight.semibold,
                }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Start Exploring
              </motion.h3>
              <motion.p
                className="text-lg mb-8 max-w-md mx-auto"
                style={{ color: designTokens.colors.text.secondary }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Discover properties tailored to your preferences
              </motion.p>
              <motion.button
                onClick={() => navigateToFeed('buy')}
                className="px-8 py-3 rounded-xl text-white font-medium"
                style={{
                  background: designTokens.colors.accent.gradient,
                  boxShadow: designTokens.shadows.accent,
                  fontWeight: designTokens.typography.fontWeight.medium,
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Open Feed
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Filter button (floating) - Modern design with accent gradient */}
      <motion.button
        className="fixed bottom-6 right-6 w-16 h-16 text-white rounded-full flex items-center justify-center z-30"
        style={{
          background: designTokens.colors.accent.gradient,
          boxShadow: designTokens.shadows.accentHover,
        }}
        onClick={() => setShowFilters(true)}
        aria-label="Open filters"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
      >
        <SlidersHorizontal className="w-6 h-6" />
        <AnimatePresence>
          {getFilterCount() > 0 && (
            <motion.span
              className="absolute -top-1 -right-1 w-7 h-7 text-white text-xs font-bold rounded-full flex items-center justify-center"
              style={{
                backgroundColor: designTokens.colors.status.error,
                boxShadow: designTokens.shadows.md,
                fontWeight: designTokens.typography.fontWeight.bold,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {getFilterCount()}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Responsive Filter Panel - Integrates with Zustand store */}
      <ResponsiveFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={() => {
          setShowFilters(false);
          // Filters are automatically applied via Zustand store
        }}
      />

      {/* Welcome Overlay - First-time user onboarding */}
      <WelcomeOverlay
        isOpen={welcomeOverlay.isOpen}
        suggestedTopics={welcomeOverlay.suggestedTopics}
        onTopicSelect={handleWelcomeTopicSelect}
        onDismiss={welcomeOverlay.onDismiss}
      />

      {/* Topic Navigation Tooltip - After 5 items scrolled */}
      <OnboardingTooltip
        tooltipId="topic_navigation"
        isVisible={topicTooltip.isVisible}
        onDismiss={topicTooltip.dismissTooltip}
        position="bottom"
        targetRef={topicsRef}
      />

      {/* Partner Content Tooltip - On first partner content encounter */}
      <OnboardingTooltip
        tooltipId="partner_content"
        isVisible={partnerTooltip.isVisible}
        onDismiss={partnerTooltip.dismissTooltip}
        position="top"
        targetRef={partnerContentRef}
      />
    </motion.div>
  );
}
