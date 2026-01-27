/**
 * Agency Header Component
 * Requirements: 9.3, 9.4
 *
 * Displays agency profile information including:
 * - Agency logo and name
 * - Verification badge
 * - Total content count
 * - Engagement metrics
 * - Follow button
 */

import { motion } from 'framer-motion';
import { CheckCircle, Users, Eye, Heart } from 'lucide-react';
import { AgencyFeedMetadata } from '@/shared/types';
import { designTokens } from '@/lib/design-tokens';
import { buttonVariants } from '@/lib/animations/exploreAnimations';

interface AgencyHeaderProps {
  metadata: AgencyFeedMetadata;
  totalViews?: number;
  totalEngagements?: number;
  followerCount?: number;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  className?: string;
}

export function AgencyHeader({
  metadata,
  totalViews = 0,
  totalEngagements = 0,
  followerCount = 0,
  isFollowing = false,
  onFollowToggle,
  className = '',
}: AgencyHeaderProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <motion.div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        backgroundColor: designTokens.colors.bg.primary,
        boxShadow: designTokens.shadows.md,
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Agency Logo */}
        <motion.div
          className="flex-shrink-0"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {metadata.agencyLogo ? (
            <img
              src={metadata.agencyLogo}
              alt={`${metadata.agencyName} logo`}
              className="w-20 h-20 rounded-xl object-cover"
              style={{
                boxShadow: designTokens.shadows.sm,
              }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold"
              style={{
                background: designTokens.colors.accent.gradient,
                color: 'white',
                boxShadow: designTokens.shadows.sm,
              }}
            >
              {metadata.agencyName.charAt(0).toUpperCase()}
            </div>
          )}
        </motion.div>

        {/* Agency Info */}
        <div className="flex-1 min-w-0">
          <motion.div
            className="flex items-center gap-2 mb-2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <h1
              className="text-2xl font-bold truncate"
              style={{
                color: designTokens.colors.text.primary,
                fontWeight: designTokens.typography.fontWeight.bold,
              }}
            >
              {metadata.agencyName}
            </h1>
            {metadata.isVerified && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                title="Verified Agency"
              >
                <CheckCircle
                  className="w-6 h-6"
                  style={{ color: designTokens.colors.status.success }}
                  aria-label="Verified"
                />
              </motion.div>
            )}
          </motion.div>

          {/* Metrics */}
          <motion.div
            className="flex flex-wrap items-center gap-4 sm:gap-6"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {/* Content Count */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: designTokens.colors.bg.tertiary,
                }}
              >
                <Users className="w-4 h-4" style={{ color: designTokens.colors.text.secondary }} />
              </div>
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{
                    color: designTokens.colors.text.primary,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                  }}
                >
                  {formatNumber(metadata.totalContent)}
                </div>
                <div className="text-xs" style={{ color: designTokens.colors.text.tertiary }}>
                  Properties
                </div>
              </div>
            </div>

            {/* Total Views */}
            {totalViews > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: designTokens.colors.bg.tertiary,
                  }}
                >
                  <Eye className="w-4 h-4" style={{ color: designTokens.colors.text.secondary }} />
                </div>
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{
                      color: designTokens.colors.text.primary,
                      fontWeight: designTokens.typography.fontWeight.semibold,
                    }}
                  >
                    {formatNumber(totalViews)}
                  </div>
                  <div className="text-xs" style={{ color: designTokens.colors.text.tertiary }}>
                    Views
                  </div>
                </div>
              </div>
            )}

            {/* Total Engagements */}
            {totalEngagements > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: designTokens.colors.bg.tertiary,
                  }}
                >
                  <Heart
                    className="w-4 h-4"
                    style={{ color: designTokens.colors.text.secondary }}
                  />
                </div>
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{
                      color: designTokens.colors.text.primary,
                      fontWeight: designTokens.typography.fontWeight.semibold,
                    }}
                  >
                    {formatNumber(totalEngagements)}
                  </div>
                  <div className="text-xs" style={{ color: designTokens.colors.text.tertiary }}>
                    Engagements
                  </div>
                </div>
              </div>
            )}

            {/* Follower Count */}
            {followerCount > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: designTokens.colors.bg.tertiary,
                  }}
                >
                  <Users
                    className="w-4 h-4"
                    style={{ color: designTokens.colors.text.secondary }}
                  />
                </div>
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{
                      color: designTokens.colors.text.primary,
                      fontWeight: designTokens.typography.fontWeight.semibold,
                    }}
                  >
                    {formatNumber(followerCount)}
                  </div>
                  <div className="text-xs" style={{ color: designTokens.colors.text.tertiary }}>
                    Followers
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Follow Button */}
        {onFollowToggle && (
          <motion.button
            onClick={onFollowToggle}
            className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex-shrink-0"
            style={{
              background: isFollowing
                ? designTokens.colors.bg.tertiary
                : designTokens.colors.accent.gradient,
              color: isFollowing ? designTokens.colors.text.primary : 'white',
              boxShadow: isFollowing ? 'none' : designTokens.shadows.accent,
              fontWeight: designTokens.typography.fontWeight.medium,
            }}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            aria-label={isFollowing ? 'Unfollow agency' : 'Follow agency'}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </motion.button>
        )}
      </div>

      {/* Agent Content Toggle Info */}
      {metadata.includeAgentContent && (
        <motion.div
          className="mt-4 pt-4"
          style={{
            borderTop: `1px solid ${designTokens.colors.bg.tertiary}`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <p className="text-sm" style={{ color: designTokens.colors.text.secondary }}>
            Showing content from {metadata.agencyName} and their agents
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
