import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/lib/trpc';
import { Loader2, Upload, Sparkles, MapPin, Grid3x3, SlidersHorizontal } from 'lucide-react';
import VideoCard from '@/components/explore/VideoCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { EnhancedSearchBar } from '@/components/explore/EnhancedSearchBar';
import { useExploreCommonState } from '@/hooks/useExploreCommonState';
import { ResponsiveFilterPanel } from '@/components/explore-discovery/ResponsiveFilterPanel';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { designTokens } from '@/lib/design-tokens';
import { PLACEHOLDER_VIDEOS as CENTRALIZED_PLACEHOLDER_VIDEOS } from '@/data/explorePlaceholderData';
import { pageVariants, buttonVariants, getVariants } from '@/lib/animations/exploreAnimations';

// Placeholder videos for design purposes - using centralized data with additional fields
const PLACEHOLDER_VIDEOS = CENTRALIZED_PLACEHOLDER_VIDEOS.map(v => ({
  id: `placeholder-${v.id}`,
  title: v.title,
  caption: `${v.bedrooms} Bed | ${v.bathrooms} Bath | ${v.highlights?.slice(0, 2).join(' | ')}`,
  primaryMediaUrl: v.thumbnailUrl,
  viewCount: v.viewCount || v.views,
  likeCount: Math.floor((v.viewCount || v.views) * 0.08),
  agentId: 1,
  publishedAt: new Date(),
  type: 'listing',
  propertyTitle: v.propertyTitle,
  propertyLocation: v.propertyLocation,
  propertyPrice: v.propertyPrice,
  bedrooms: v.bedrooms,
  bathrooms: v.bathrooms,
  area: v.area,
  yardSize: v.area ? Math.floor(v.area * 1.5) : undefined,
  propertyType: v.propertyType,
  highlights: v.highlights,
}));

export default function ExploreFeed() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Use common state hook for shared logic
  const { feedType, setFeedType, showFilters, setShowFilters, toggleFilters, filterActions } =
    useExploreCommonState({
      initialViewMode: 'shorts',
      initialFeedType: 'recommended',
    });

  // Fetch explore shorts feed
  const { data: feedData, isLoading } = trpc.explore.getFeed.useQuery({
    feedType: feedType,
    limit: 20,
    offset: 0,
    userId: user?.id,
  });

  // Debug logging for feed verification
  useEffect(() => {
    if (feedData) {
      console.log('FEED DATA:', feedData);
    }
  }, [feedData]);

  // Mutation for recording interactions
  const recordInteractionMutation = trpc.explore.recordInteraction.useMutation();

  // Use canonical `items` when available, fall back to legacy `shorts`, then placeholders
  const items = feedData?.items ?? feedData?.shorts ?? [];
  const videos = items.length > 0 ? items : PLACEHOLDER_VIDEOS;

  // Filter videos based on search query
  const filteredVideos = searchQuery
    ? videos.filter(
        (video: any) =>
          video.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.propertyLocation?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : videos;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight } = e.currentTarget;
    const index = Math.round(scrollTop / clientHeight);
    setCurrentIndex(index);
  };

  // Auto-play current video
  useEffect(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach((video, index) => {
      if (index === currentIndex) {
        video.play().catch(() => {}); // Ignore autoplay errors
      } else {
        video.pause();
      }
    });
  }, [currentIndex]);

  if (isLoading) {
    return (
      <motion.div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: designTokens.colors.bg.dark }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="animate-spin h-8 w-8"
            style={{ color: designTokens.colors.text.inverse }}
          />
          <p style={{ color: designTokens.colors.text.inverse }} className="text-sm">
            Loading amazing properties...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)',
      }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={getVariants(pageVariants)}
    >
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-full">
        {/* Left Sidebar - Modern Design */}
        <motion.aside
          className="w-80 backdrop-blur-xl border-r overflow-y-auto"
          style={{
            backgroundColor: designTokens.colors.glass.bgDark,
            borderColor: designTokens.colors.glass.borderDark,
          }}
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold"
                style={{
                  color: designTokens.colors.text.inverse,
                  fontWeight: designTokens.typography.fontWeight.bold,
                }}
              >
                Filters
              </h2>
              {filterActions.getFilterCount() > 0 && (
                <motion.button
                  onClick={filterActions.clearFilters}
                  className="text-sm px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: designTokens.colors.glass.bg,
                    color: designTokens.colors.accent.primary,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear All
                </motion.button>
              )}
            </div>

            {/* Enhanced Search */}
            <div className="mb-6">
              <EnhancedSearchBar
                onSearch={query => setSearchQuery(query)}
                placeholder="Search properties..."
              />
            </div>

            {/* Feed Type Tabs - Modern vertical design */}
            <div className="mb-6">
              <label
                className="text-sm font-medium mb-3 block"
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: designTokens.typography.fontWeight.medium,
                }}
              >
                Feed Type
              </label>
              <Tabs value={feedType} onValueChange={value => setFeedType(value as any)}>
                <TabsList
                  className="backdrop-blur-xl border rounded-xl shadow-lg w-full flex-col h-auto space-y-2 p-2"
                  style={{
                    backgroundColor: designTokens.colors.glass.bgDark,
                    borderColor: designTokens.colors.glass.borderDark,
                  }}
                >
                  <TabsTrigger
                    value="recommended"
                    className="w-full text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    style={{
                      background:
                        feedType === 'recommended'
                          ? designTokens.colors.accent.gradient
                          : 'transparent',
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    For You
                  </TabsTrigger>
                  <TabsTrigger
                    value="area"
                    className="w-full text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    style={{
                      background:
                        feedType === 'area' ? designTokens.colors.accent.gradient : 'transparent',
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                    By Area
                  </TabsTrigger>
                  <TabsTrigger
                    value="category"
                    className="w-full text-white rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    style={{
                      background:
                        feedType === 'category'
                          ? designTokens.colors.accent.gradient
                          : 'transparent',
                    }}
                  >
                    <Grid3x3 className="h-4 w-4" />
                    By Type
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Advanced Filters Button */}
            <motion.button
              onClick={toggleFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg mb-6"
              style={{
                backgroundColor: showFilters
                  ? designTokens.colors.accent.primary
                  : designTokens.colors.glass.bgDark,
                color: designTokens.colors.text.inverse,
                border: `1px solid ${designTokens.colors.glass.borderDark}`,
              }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="font-medium">{showFilters ? 'Hide' : 'Show'} Advanced Filters</span>
              {filterActions.getFilterCount() > 0 && (
                <span
                  className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: designTokens.colors.accent.light,
                    color: designTokens.colors.text.inverse,
                  }}
                >
                  {filterActions.getFilterCount()}
                </span>
              )}
            </motion.button>

            {/* Quick Stats - Modern card design */}
            <ModernCard variant="glass" className="p-4">
              <p className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Total Properties
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  color: designTokens.colors.text.inverse,
                  fontWeight: designTokens.typography.fontWeight.bold,
                }}
              >
                {filteredVideos.length}
              </p>
            </ModernCard>
          </div>
        </motion.aside>

        {/* Main Content Area (Desktop) */}
        <div className="flex-1 relative">
          {/* Upload button - Desktop with modern design */}
          {isAuthenticated && (
            <motion.button
              onClick={() => setLocation('/explore/upload')}
              className="absolute top-6 right-6 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full text-white border"
              style={{
                background: designTokens.colors.accent.gradient,
                boxShadow: designTokens.shadows.accent,
                borderColor: designTokens.colors.glass.border,
              }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              aria-label="Upload content"
            >
              <Upload className="w-5 h-5" />
              <span
                className="font-semibold"
                style={{ fontWeight: designTokens.typography.fontWeight.semibold }}
              >
                Upload Property
              </span>
            </motion.button>
          )}

          {/* Video Feed with smooth transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={feedType}
              className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
              style={{
                scrollSnapType: 'y mandatory',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
              onScroll={handleScroll}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {filteredVideos?.map((short: any, idx: number) => (
                <div key={short.id} className="snap-start snap-always h-screen w-full">
                  <VideoCard
                    video={{
                      id: short.id,
                      title: short.title,
                      description: short.caption || '',
                      videoUrl: short.primaryMediaUrl || '',
                      thumbnailUrl: short.primaryMediaUrl || '',
                      views: short.viewCount || 0,
                      likes: short.likeCount || 0,
                      userId: short.agentId || short.developerId || 0,
                      createdAt: short.publishedAt || new Date(),
                      type: short.type || 'listing',
                      propertyTitle: short.propertyTitle || short.title,
                      propertyLocation: short.propertyLocation,
                      propertyPrice: short.propertyPrice,
                      caption: short.caption,
                      bedrooms: short.bedrooms,
                      bathrooms: short.bathrooms,
                      area: short.area,
                      yardSize: short.yardSize,
                      propertyType: short.propertyType,
                      highlights: short.highlights || [],
                    }}
                    isActive={idx === currentIndex}
                    onView={() => {
                      recordInteractionMutation.mutate({
                        shortId: short.id,
                        interactionType: 'view',
                        feedType: feedType,
                      });
                    }}
                  />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Layout - Improved header */}
      <div className="lg:hidden h-full relative">
        {/* Mobile Header - Modern design */}
        <motion.header
          className="absolute top-0 left-0 right-0 z-50 pb-6"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 70%, transparent 100%)',
          }}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="p-4 flex justify-between items-center gap-3">
            {/* Feed Type Tabs - Compact mobile design */}
            <Tabs
              value={feedType}
              onValueChange={value => setFeedType(value as any)}
              className="flex-1"
            >
              <TabsList
                className="backdrop-blur-xl border rounded-full shadow-lg w-full"
                style={{
                  backgroundColor: designTokens.colors.glass.bgDark,
                  borderColor: designTokens.colors.glass.borderDark,
                }}
              >
                <TabsTrigger
                  value="recommended"
                  className="text-white rounded-full transition-all duration-300 flex items-center gap-1.5 text-xs sm:text-sm"
                  style={{
                    background:
                      feedType === 'recommended'
                        ? designTokens.colors.accent.gradient
                        : 'transparent',
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">For You</span>
                </TabsTrigger>
                <TabsTrigger
                  value="area"
                  className="text-white rounded-full transition-all duration-300 flex items-center gap-1.5 text-xs sm:text-sm"
                  style={{
                    background:
                      feedType === 'area' ? designTokens.colors.accent.gradient : 'transparent',
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Area</span>
                </TabsTrigger>
                <TabsTrigger
                  value="category"
                  className="text-white rounded-full transition-all duration-300 flex items-center gap-1.5 text-xs sm:text-sm"
                  style={{
                    background:
                      feedType === 'category' ? designTokens.colors.accent.gradient : 'transparent',
                  }}
                >
                  <Grid3x3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Type</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Action buttons group */}
            <div className="flex items-center gap-2">
              {/* Filters button */}
              <motion.button
                onClick={toggleFilters}
                className="flex items-center justify-center p-2 rounded-full border"
                style={{
                  backgroundColor: showFilters
                    ? designTokens.colors.accent.primary
                    : designTokens.colors.glass.bgDark,
                  borderColor: designTokens.colors.glass.borderDark,
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                aria-label="Toggle filters"
              >
                <SlidersHorizontal className="w-4 h-4 text-white" />
                {filterActions.getFilterCount() > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                    style={{
                      backgroundColor: designTokens.colors.status.error,
                      color: designTokens.colors.text.inverse,
                    }}
                  >
                    {filterActions.getFilterCount()}
                  </span>
                )}
              </motion.button>

              {/* Mobile Upload button */}
              {isAuthenticated && (
                <motion.button
                  onClick={() => setLocation('/explore/upload')}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-white border"
                  style={{
                    background: designTokens.colors.accent.gradient,
                    boxShadow: designTokens.shadows.accent,
                    borderColor: designTokens.colors.glass.border,
                  }}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  aria-label="Upload content"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">Upload</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.header>

        {/* Mobile Video Feed with smooth transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={feedType}
            className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            style={{
              scrollSnapType: 'y mandatory',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
            onScroll={handleScroll}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {filteredVideos?.map((short: any, idx: number) => (
              <div key={short.id} className="snap-start snap-always h-screen w-full">
                <VideoCard
                  video={{
                    id: short.id,
                    title: short.title,
                    description: short.caption || '',
                    videoUrl: short.primaryMediaUrl || '',
                    thumbnailUrl: short.primaryMediaUrl || '',
                    views: short.viewCount || 0,
                    likes: short.likeCount || 0,
                    userId: short.agentId || short.developerId || 0,
                    createdAt: short.publishedAt || new Date(),
                    type: short.type || 'listing',
                    propertyTitle: short.propertyTitle || short.title,
                    propertyLocation: short.propertyLocation,
                    propertyPrice: short.propertyPrice,
                    caption: short.caption,
                    bedrooms: short.bedrooms,
                    bathrooms: short.bathrooms,
                    area: short.area,
                    yardSize: short.yardSize,
                    propertyType: short.propertyType,
                    highlights: short.highlights || [],
                  }}
                  isActive={idx === currentIndex}
                  onView={() => {
                    recordInteractionMutation.mutate({
                      shortId: short.id,
                      interactionType: 'view',
                      feedType: feedType,
                    });
                  }}
                />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Responsive Filter Panel */}
      <ResponsiveFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={() => {
          setShowFilters(false);
          // Filters are already applied via Zustand store
        }}
      />
    </motion.div>
  );
}
