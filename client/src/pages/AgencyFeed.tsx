/**
 * Agency Feed Page
 * Requirements: 9.1, 9.2
 *
 * Displays agency-specific content feed with:
 * - Agency profile header
 * - Content grid/list
 * - Pagination controls (infinite scroll)
 * - Loading and error states
 */

import { useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAgencyFeed } from '@/hooks/useAgencyFeed';
import { AgencyHeader } from '@/components/explore-discovery/AgencyHeader';
import { PropertyCard } from '@/components/explore-discovery/cards/PropertyCard';
import { EmptyState } from '@/components/explore-discovery/EmptyState';
import { designTokens } from '@/lib/design-tokens';
import {
  pageVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/animations/exploreAnimations';

export default function AgencyFeed() {
  const params = useParams();
  const agencyId = params.agencyId ? parseInt(params.agencyId, 10) : null;

  // Fetch agency feed
  const { feed, shorts, metadata, isLoading, isLoadingMore, error, hasMore, setupObserver } =
    useAgencyFeed({
      agencyId: agencyId || 0,
      includeAgentContent: true,
      limit: 20,
    });

  // Handle invalid agency ID
  if (!agencyId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          icon={AlertCircle}
          title="Invalid Agency"
          description="The agency you're looking for doesn't exist."
          actionLabel="Go to Explore"
          onAction={() => (window.location.href = '/explore')}
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: designTokens.colors.bg.secondary }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: designTokens.colors.accent.primary }}
          />
          <p className="text-lg" style={{ color: designTokens.colors.text.secondary }}>
            Loading agency feed...
          </p>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyState
          icon={AlertCircle}
          title="Error Loading Feed"
          description={error}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  // Empty state
  if (!metadata || shorts.length === 0) {
    return (
      <motion.div
        className="min-h-screen"
        style={{ backgroundColor: designTokens.colors.bg.secondary }}
        initial="initial"
        animate="animate"
        variants={pageVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {metadata && <AgencyHeader metadata={metadata} className="mb-8" />}
          <EmptyState
            title="No Content Yet"
            description="This agency hasn't published any content yet. Check back soon!"
            actionLabel="Explore Other Content"
            onAction={() => (window.location.href = '/explore')}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen"
      style={{ backgroundColor: designTokens.colors.bg.secondary }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Agency Header */}
        <AgencyHeader metadata={metadata} className="mb-8" />

        {/* Content Grid */}
        <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {shorts.map((short, index) => (
                <motion.div
                  key={short.id}
                  variants={staggerItemVariants}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <PropertyCard
                    id={short.id}
                    title={short.title}
                    imageUrl={
                      short.mediaIds?.[0]
                        ? `/api/media/${short.mediaIds[0]}`
                        : '/placeholder-property.jpg'
                    }
                    price={0} // TODO: Get from listing/development
                    location={{
                      city: 'City', // TODO: Get from listing/development
                      suburb: 'Suburb',
                      province: 'Province',
                    }}
                    specs={{
                      bedrooms: 0, // TODO: Get from listing/development
                      bathrooms: 0,
                      parking: 0,
                    }}
                    onClick={() => {
                      // Navigate to property detail or open shorts view
                      window.location.href = `/explore/shorts/${short.id}`;
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Loading More Indicator */}
        {isLoadingMore && (
          <motion.div
            className="flex justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: designTokens.colors.accent.primary }}
            />
          </motion.div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && !isLoadingMore && (
          <div ref={setupObserver} className="h-20 flex items-center justify-center">
            <p className="text-sm" style={{ color: designTokens.colors.text.tertiary }}>
              Scroll for more
            </p>
          </div>
        )}

        {/* End of Feed */}
        {!hasMore && shorts.length > 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p
              className="text-lg font-medium mb-2"
              style={{
                color: designTokens.colors.text.secondary,
                fontWeight: designTokens.typography.fontWeight.medium,
              }}
            >
              You've reached the end
            </p>
            <p className="text-sm" style={{ color: designTokens.colors.text.tertiary }}>
              That's all the content from this agency
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
