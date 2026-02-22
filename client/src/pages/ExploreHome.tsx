import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Grid3x3,
  SlidersHorizontal,
  Home,
  Wrench,
  Hammer,
  Wallet,
  TrendingUp,
  Building2,
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
import { DiscoveryItem } from '@/hooks/useDiscoveryFeed';
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

const SECTION_ORDER_INDEX = SECTION_ORDER.reduce<Record<string, number>>((acc, id, index) => {
  acc[id] = index;
  return acc;
}, {});

function normalizeSectionId(section: { id: string; canonicalId?: string }) {
  const rawId = (section.canonicalId || section.id || '').trim().toLowerCase();
  return SECTION_ID_ALIASES[rawId] ?? rawId;
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

interface FocusTile {
  id: string;
  title: string;
  subtitle: string;
  focus: ExploreFocus;
  subFocus: string;
  icon: typeof Home;
}

const FOCUS_TILES: FocusTile[] = [
  {
    id: 'buying',
    title: 'Buying a Home',
    subtitle: 'Discover listings matched to your budget and lifestyle',
    focus: 'buy',
    subFocus: 'buying',
    icon: Home,
  },
  {
    id: 'selling',
    title: 'Selling a Home',
    subtitle: 'Market-ready ideas, pricing signals, and seller tips',
    focus: 'sell',
    subFocus: 'selling',
    icon: TrendingUp,
  },
  {
    id: 'renovating',
    title: 'Renovating',
    subtitle: 'Design upgrades and trusted build partners',
    focus: 'renovate',
    subFocus: 'renovating',
    icon: Hammer,
  },
  {
    id: 'services',
    title: 'Home Services',
    subtitle: 'Browse specialists for every room and repair',
    focus: 'services',
    subFocus: 'services',
    icon: Wrench,
  },
  {
    id: 'finance',
    title: 'Finance & Bonds',
    subtitle: 'Learn deposits, transfer costs, and affordability',
    focus: 'finance',
    subFocus: 'finance',
    icon: Wallet,
  },
  {
    id: 'investing',
    title: 'Investment',
    subtitle: 'Track areas, yields, and long-term opportunities',
    focus: 'invest',
    subFocus: 'investment',
    icon: Building2,
  },
];

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

  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();

  // Get personalized content sections
  const { sections, isLoading: sectionsLoading } = usePersonalizedContent({
    categoryId: selectedCategoryId ?? undefined,
    location: userLocation,
    intent,
  });

  // Get user location for "Popular Near You"
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        error => {
          console.log('Location access denied:', error);
        },
      );
    }
  }, []);

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

  return (
    <motion.div
      className="min-h-screen"
      style={{ backgroundColor: designTokens.colors.bg.secondary }}
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
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
            intent={intent}
            onSeeAll={handleTrendingVideosSeeAll}
          />

          {/* Section-based home focus selection (not tabs/chips) */}
          <motion.section
            className="px-4 sm:px-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            role="region"
            aria-label="Choose your focus"
          >
            <div className="mb-4">
              <h2 className="text-2xl font-semibold" style={{ color: designTokens.colors.text.primary }}>
                Choose Your Focus
              </h2>
              <p className="text-sm mt-1" style={{ color: designTokens.colors.text.secondary }}>
                Select what matters now and we will tune your feed instantly.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {FOCUS_TILES.map(tile => {
                const Icon = tile.icon;
                return (
                  <motion.button
                    key={tile.id}
                    type="button"
                    onClick={() => navigateToFeed(tile.focus, tile.subFocus)}
                    className="text-left rounded-2xl p-4 border transition-all"
                    style={{
                      borderColor: designTokens.colors.bg.tertiary,
                      backgroundColor: designTokens.colors.bg.primary,
                      boxShadow: designTokens.shadows.sm,
                    }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: `${designTokens.colors.accent.primary}15`,
                          color: designTokens.colors.accent.primary,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: designTokens.colors.text.primary }}>
                          {tile.title}
                        </h3>
                        <p className="text-sm mt-1" style={{ color: designTokens.colors.text.secondary }}>
                          {tile.subtitle}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
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
