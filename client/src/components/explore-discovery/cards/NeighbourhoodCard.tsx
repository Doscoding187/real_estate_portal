/**
 * NeighbourhoodCard Component
 * 
 * Modern neighbourhood card with subtle shadows and smooth animations.
 * Uses ModernCard as base for consistent design system integration.
 * 
 * Features:
 * - Hover lift animation (2px translateY) - Requirements 9.1
 * - Press state animation (scale 0.98) - Requirements 9.2
 * - Modern card design with subtle shadows - Requirements 1.2
 * - Consistent spacing tokens from design system
 * - Progressive image loading
 * - Follow functionality integration
 */

import { MapPin, TrendingUp, Home, Users } from 'lucide-react';
import { useState } from 'react';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { designTokens } from '@/lib/design-tokens';
import { motion } from 'framer-motion';
import { ContentBadgeOverlay, type BadgeType } from '../ContentBadge';

interface NeighbourhoodCardProps {
  neighbourhood: {
    id: number;
    name: string;
    city: string;
    imageUrl: string;
    propertyCount: number;
    avgPrice: number;
    priceChange?: number;
    followerCount?: number;
    highlights?: string[];
    badgeType?: BadgeType; // Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
  };
  onClick: () => void;
  onFollow: () => void;
}

export function NeighbourhoodCard({ neighbourhood, onClick, onFollow }: NeighbourhoodCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `R${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `R${(price / 1000).toFixed(0)}K`;
    }
    return `R${price}`;
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
    onFollow();
  };

  return (
    <ModernCard
      onClick={onClick}
      className="group relative overflow-hidden p-0"
      hoverable={true}
      variant="default"
      as="article"
      aria-label={`Neighbourhood: ${neighbourhood.name} in ${neighbourhood.city}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {/* Content Badge - Requirements 4.1, 4.7 */}
        {neighbourhood.badgeType && (
          <ContentBadgeOverlay type={neighbourhood.badgeType} size="sm" />
        )}

        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        <img
          src={neighbourhood.imageUrl}
          alt={neighbourhood.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Follow button with modern design */}
        <motion.button
          onClick={handleFollow}
          className={`absolute top-3 right-3 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            isFollowing
              ? 'bg-white text-gray-900 shadow-md'
              : 'glass-overlay text-gray-900 hover:bg-white'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15 }}
          aria-label={isFollowing ? 'Unfollow neighbourhood' : 'Follow neighbourhood'}
          aria-pressed={isFollowing}
          type="button"
        >
          {isFollowing ? 'Following' : 'Follow'}
        </motion.button>

        {/* Content overlay */}
        <div 
          className="absolute bottom-0 left-0 right-0"
          style={{ padding: designTokens.spacing.md }}
        >
          <h3 
            className="text-xl font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors duration-200"
            style={{ 
              fontWeight: designTokens.typography.fontWeight.bold,
              fontSize: designTokens.typography.fontSize.xl 
            }}
          >
            {neighbourhood.name}
          </h3>
          <div className="flex items-center text-white/90 text-sm">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>{neighbourhood.city}</span>
          </div>
        </div>
      </div>

      {/* Stats - Using consistent spacing tokens */}
      <div style={{ padding: designTokens.spacing.md }}>
        {/* Price info - High contrast for readability */}
        <div 
          className="flex items-center justify-between"
          style={{ marginBottom: designTokens.spacing.sm }}
        >
          <div>
            <div 
              className="text-xs mb-1"
              style={{ color: designTokens.colors.text.secondary }}
            >
              Avg. Price
            </div>
            <div 
              className="text-lg font-bold"
              style={{ 
                color: designTokens.colors.text.primary,
                fontWeight: designTokens.typography.fontWeight.bold 
              }}
            >
              {formatPrice(neighbourhood.avgPrice)}
            </div>
          </div>
          {neighbourhood.priceChange !== undefined && (
            <div 
              className={`flex items-center gap-1 text-sm font-medium ${
                neighbourhood.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
              style={{ fontWeight: designTokens.typography.fontWeight.medium }}
            >
              <TrendingUp className={`w-4 h-4 ${neighbourhood.priceChange < 0 ? 'rotate-180' : ''}`} />
              <span>{Math.abs(neighbourhood.priceChange)}%</span>
            </div>
          )}
        </div>

        {/* Highlights - Modern pill design */}
        {neighbourhood.highlights && neighbourhood.highlights.length > 0 && (
          <div 
            className="flex flex-wrap gap-2"
            style={{ marginBottom: designTokens.spacing.sm }}
          >
            {neighbourhood.highlights.slice(0, 2).map((highlight, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs rounded-full"
                style={{
                  backgroundColor: designTokens.colors.accent.subtle,
                  color: designTokens.colors.accent.primary,
                  fontSize: designTokens.typography.fontSize.xs,
                  borderRadius: designTokens.borderRadius.pill,
                }}
              >
                {highlight}
              </span>
            ))}
          </div>
        )}

        {/* Meta info - Clear, readable text */}
        <div 
          className="flex items-center gap-4 text-xs"
          style={{ color: designTokens.colors.text.secondary }}
          role="list"
          aria-label="Neighbourhood statistics"
        >
          <div className="flex items-center gap-1" role="listitem">
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>
              <span className="sr-only">Property count: </span>
              {neighbourhood.propertyCount} properties
            </span>
          </div>
          {neighbourhood.followerCount !== undefined && (
            <div className="flex items-center gap-1" role="listitem">
              <Users className="w-4 h-4" aria-hidden="true" />
              <span>
                <span className="sr-only">Follower count: </span>
                {neighbourhood.followerCount} followers
              </span>
            </div>
          )}
        </div>
      </div>
    </ModernCard>
  );
}
