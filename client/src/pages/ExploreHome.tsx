import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Grid3x3, SlidersHorizontal, MapPin } from 'lucide-react';
import { DiscoveryCardFeed } from '@/components/explore-discovery/DiscoveryCardFeed';
import { ExploreVideoFeed } from '@/components/explore-discovery/ExploreVideoFeed';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { ResponsiveFilterPanel } from '@/components/explore-discovery/ResponsiveFilterPanel';
import { PersonalizedContentBlock } from '@/components/explore-discovery/PersonalizedContentBlock';
import { TrendingVideosSection } from '@/components/explore-discovery/TrendingVideosSection';
import { useExploreCommonState } from '@/hooks/useExploreCommonState';
import { usePersonalizedContent } from '@/hooks/usePersonalizedContent';
import { useExploreFiltersStore } from '@/store/exploreFiltersStore';
import { DiscoveryItem } from '@/hooks/useDiscoveryFeed';
import { TrendingVideo } from '@/hooks/useTrendingVideos';
import { designTokens } from '@/lib/design-tokens';
import { 
  pageVariants, 
  staggerContainerVariants, 
  staggerItemVariants,
  buttonVariants,
  getVariants 
} from '@/lib/animations/exploreAnimations';

export default function ExploreHome() {
  // Use common state hook for shared logic
  const {
    viewMode,
    setViewMode,
    selectedCategoryId,
    setSelectedCategoryId,
    showFilters,
    setShowFilters,
    filters,
  } = useExploreCommonState({ initialViewMode: 'home' });

  // Get filter count from Zustand store
  const getFilterCount = useExploreFiltersStore((state) => state.getFilterCount);
  
  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();

  // Get personalized content sections
  const { sections, isLoading: sectionsLoading } = usePersonalizedContent({
    categoryId: selectedCategoryId ?? undefined,
    location: userLocation,
  });

  // Get user location for "Popular Near You"
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  const handleItemClick = (item: DiscoveryItem) => {
    console.log('Item clicked:', item);
    // TODO: Navigate to detail page based on item type
    if (item.type === 'property') {
      // Navigate to property detail
    } else if (item.type === 'video') {
      // Open video feed at this video
      setViewMode('videos');
    } else if (item.type === 'neighbourhood') {
      // Navigate to neighbourhood detail
    }
  };

  const handleSeeAll = (sectionType: string) => {
    console.log('See all:', sectionType);
    // Navigate to full view of section
    setViewMode('cards');
  };

  // Handle trending video click - switch to videos view
  const handleTrendingVideoClick = (video: TrendingVideo) => {
    console.log('Trending video clicked:', video);
    setViewMode('videos');
  };

  // Handle "See All" for trending videos - switch to videos view
  const handleTrendingVideosSeeAll = () => {
    setViewMode('videos');
  };

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
          <div className="flex items-center justify-between mb-4">
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
              aria-label="View mode selection"
            >
              <motion.button
                onClick={() => setViewMode('home')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: viewMode === 'home' ? designTokens.colors.bg.primary : 'transparent',
                  color: viewMode === 'home' ? designTokens.colors.text.primary : designTokens.colors.text.secondary,
                  boxShadow: viewMode === 'home' ? designTokens.shadows.sm : 'none',
                  fontWeight: designTokens.typography.fontWeight.medium,
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                role="tab"
                aria-selected={viewMode === 'home'}
                aria-controls="explore-content"
                aria-label="Home view"
              >
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Home</span>
              </motion.button>
              <motion.button
                onClick={() => setViewMode('cards')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: viewMode === 'cards' ? designTokens.colors.bg.primary : 'transparent',
                  color: viewMode === 'cards' ? designTokens.colors.text.primary : designTokens.colors.text.secondary,
                  boxShadow: viewMode === 'cards' ? designTokens.shadows.sm : 'none',
                  fontWeight: designTokens.typography.fontWeight.medium,
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                role="tab"
                aria-selected={viewMode === 'cards'}
                aria-controls="explore-content"
                aria-label="Cards view"
              >
                <Grid3x3 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Cards</span>
              </motion.button>
              <motion.button
                onClick={() => setViewMode('videos')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: viewMode === 'videos' ? designTokens.colors.bg.primary : 'transparent',
                  color: viewMode === 'videos' ? designTokens.colors.text.primary : designTokens.colors.text.secondary,
                  boxShadow: viewMode === 'videos' ? designTokens.shadows.sm : 'none',
                  fontWeight: designTokens.typography.fontWeight.medium,
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                role="tab"
                aria-selected={viewMode === 'videos'}
                aria-controls="explore-content"
                aria-label="Videos view"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Videos</span>
              </motion.button>
            </motion.div>
          </div>

          {/* Category filter - Modern chip design */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <LifestyleCategorySelector
              selectedCategoryId={selectedCategoryId ?? undefined}
              onCategoryChange={(id) => setSelectedCategoryId(id ?? null)}
              variant="light"
              className="pb-2"
            />
          </motion.div>
        </div>
      </motion.header>

      {/* Content - Smooth transitions between view modes */}
      <main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        id="explore-content"
        role="main"
        aria-label="Explore content"
      >
        <AnimatePresence mode="wait">
          {viewMode === 'home' ? (
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

              {/* Personalized Content Sections with stagger animation */}
              {sectionsLoading ? (
                <motion.div
                  variants={staggerContainerVariants}
                  initial="initial"
                  animate="animate"
                >
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
                <motion.div
                  variants={staggerContainerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {sections.map((section) => (
                    <motion.div 
                      key={section.id}
                      variants={staggerItemVariants}
                      style={{ marginBottom: designTokens.spacing.xl }}
                    >
                      <PersonalizedContentBlock
                        title={section.title}
                        subtitle={section.subtitle}
                        items={section.items}
                        onItemClick={handleItemClick}
                        onSeeAll={() => handleSeeAll(section.type)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Empty state - Modern design */}
              {!sectionsLoading && sections.length === 0 && (
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
                    <MapPin 
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
                    onClick={() => setViewMode('cards')}
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
                    Browse All Properties
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          ) : viewMode === 'cards' ? (
            <motion.div 
              key="cards-view"
              className="py-6"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={getVariants(pageVariants)}
            >
              <DiscoveryCardFeed
                categoryId={selectedCategoryId ?? undefined}
                filters={filters}
                onItemClick={handleItemClick}
              />
            </motion.div>
          ) : (
            <motion.div
              key="videos-view"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={getVariants(pageVariants)}
            >
              <ExploreVideoFeed categoryId={selectedCategoryId ?? undefined} />
            </motion.div>
          )}
        </AnimatePresence>
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
    </motion.div>
  );
}
