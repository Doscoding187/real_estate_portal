/**
 * InsightCard Component
 *
 * Displays market insights, price analysis, and investment tips with modern design.
 * Features accent colors, micro-interactions, and smooth animations.
 *
 * Requirements: 1.2, 9.3
 */

import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Info,
  Lightbulb,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { designTokens } from '@/lib/design-tokens';
import { cardVariants } from '@/lib/animations/exploreAnimations';
import { cn } from '@/lib/utils';
import { ContentBadgeOverlay, type BadgeType } from '../ContentBadge';

interface InsightCardProps {
  insight: {
    id: number;
    title: string;
    description: string;
    imageUrl?: string;
    insightType: 'market-trend' | 'price-analysis' | 'investment-tip' | 'area-spotlight';
    badgeType?: BadgeType; // Requirements 4.1, 4.3, 4.5, 4.6
    data?: {
      value: string;
      change?: number;
      label?: string;
    };
  };
  onClick: () => void;
}

export function InsightCard({ insight, onClick }: InsightCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const getIcon = () => {
    const iconClass = 'w-5 h-5';
    switch (insight.insightType) {
      case 'market-trend':
        return <TrendingUp className={iconClass} />;
      case 'price-analysis':
        return <BarChart3 className={iconClass} />;
      case 'investment-tip':
        return <Lightbulb className={iconClass} />;
      case 'area-spotlight':
        return <MapPin className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getAccentColors = () => {
    switch (insight.insightType) {
      case 'market-trend':
        return {
          gradient: 'from-emerald-500 to-green-600',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          iconBg: 'bg-emerald-100',
          badge: 'bg-emerald-500/20',
        };
      case 'price-analysis':
        return {
          gradient: 'from-blue-500 to-indigo-600',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          iconBg: 'bg-blue-100',
          badge: 'bg-blue-500/20',
        };
      case 'investment-tip':
        return {
          gradient: 'from-purple-500 to-pink-600',
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          iconBg: 'bg-purple-100',
          badge: 'bg-purple-500/20',
        };
      case 'area-spotlight':
        return {
          gradient: 'from-orange-500 to-red-600',
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          iconBg: 'bg-orange-100',
          badge: 'bg-orange-500/20',
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          iconBg: 'bg-gray-100',
          badge: 'bg-gray-500/20',
        };
    }
  };

  const colors = getAccentColors();

  return (
    <ModernCard
      onClick={onClick}
      className="group overflow-hidden"
      variant="default"
      as="article"
      role="article"
      aria-label={`${insight.insightType} insight: ${insight.title}`}
    >
      {/* Header with accent gradient */}
      <div className={cn('relative p-4 bg-gradient-to-br text-white', colors.gradient)}>
        {/* Content Badge - Requirements 4.1, 4.7 */}
        {insight.badgeType && <ContentBadgeOverlay type={insight.badgeType} size="sm" />}

        <div className="flex items-start justify-between mb-3">
          {/* Icon with glass effect */}
          <motion.div
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            {getIcon()}
          </motion.div>

          {/* Badge */}
          <motion.span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              colors.badge,
              'backdrop-blur-sm',
            )}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            role="status"
            aria-label="Content type: Insight"
          >
            Insight
          </motion.span>
        </div>

        {/* Data display with micro-interactions */}
        {insight.data && (
          <motion.div
            className="mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="text-3xl font-bold mb-1 tracking-tight">{insight.data.value}</div>

            {insight.data.change !== undefined && (
              <motion.div
                className="flex items-center gap-1 text-sm"
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
              >
                {insight.data.change >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {Math.abs(insight.data.change)}%{' '}
                  {insight.data.change >= 0 ? 'increase' : 'decrease'}
                </span>
              </motion.div>
            )}

            {insight.data.label && (
              <div className="text-xs text-white/80 mt-1">{insight.data.label}</div>
            )}
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className={cn(
            'text-base font-bold mb-2 transition-colors duration-200',
            'text-gray-900 group-hover:text-indigo-600',
          )}
        >
          {insight.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{insight.description}</p>
      </div>

      {/* Optional image with smooth loading */}
      {insight.imageUrl && (
        <div className="relative h-32 overflow-hidden bg-gray-100">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
          <motion.img
            src={insight.imageUrl}
            alt={insight.title}
            className={cn('w-full h-full object-cover', imageLoaded ? 'opacity-100' : 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Read more indicator with accent color */}
      <div className="px-4 pb-4">
        <motion.div
          className={cn(
            'text-sm font-medium flex items-center gap-1',
            'text-indigo-600 group-hover:text-indigo-700',
          )}
          whileHover={{ x: 2 }}
          transition={{ duration: 0.2 }}
        >
          <span>Learn more</span>
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </div>
    </ModernCard>
  );
}
