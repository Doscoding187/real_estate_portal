/**
 * MetricCard Component
 *
 * Displays a social proof metric with large number and descriptive label.
 * Includes count-up animation when entering viewport.
 *
 * Requirements: 6.3
 */

import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { fadeUp } from '@/lib/animations/advertiseAnimations';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export interface MetricCardProps {
  /**
   * The numeric value to display
   * Can be a number or formatted string (e.g., "10K+", "95%")
   */
  value: string | number;

  /**
   * Descriptive label for the metric
   */
  label: string;

  /**
   * Optional icon to display above the metric
   */
  icon?: LucideIcon;

  /**
   * Optional color accent for the icon
   * @default 'primary'
   */
  iconColor?: 'primary' | 'secondary' | 'blue' | 'green' | 'yellow' | 'purple';

  /**
   * Duration of count-up animation in milliseconds
   * @default 2000
   */
  animationDuration?: number;

  /**
   * Whether to enable count-up animation
   * Only works if value is a number
   * @default true
   */
  enableCountUp?: boolean;
}

/**
 * Easing function for smooth count-up animation
 */
const easeOutQuart = (t: number): number => {
  return 1 - Math.pow(1 - t, 4);
};

/**
 * MetricCard Component
 *
 * @example
 * ```tsx
 * <MetricCard
 *   value={5000}
 *   label="Verified Leads Generated"
 *   icon={TrendingUp}
 *   iconColor="green"
 * />
 * ```
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  icon: Icon,
  iconColor = 'primary',
  animationDuration = 2000,
  enableCountUp = true,
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.3,
    triggerOnce: true,
  });

  const [displayValue, setDisplayValue] = useState<string | number>(
    typeof value === 'number' && enableCountUp ? 0 : value,
  );

  // Count-up animation effect
  useEffect(() => {
    if (!isVisible || typeof value !== 'number' || !enableCountUp) {
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Apply easing function
      const easedProgress = easeOutQuart(progress);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easedProgress);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value, animationDuration, enableCountUp]);

  // Icon color mapping
  const iconColorMap = {
    primary: softUITokens.colors.primary.base,
    secondary: softUITokens.colors.secondary.base,
    blue: softUITokens.colors.accent.blue,
    green: softUITokens.colors.accent.green,
    yellow: softUITokens.colors.accent.yellow,
    purple: softUITokens.colors.accent.purple,
  };

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="initial"
      animate={isVisible ? 'animate' : 'initial'}
      className="flex flex-col items-center text-center p-6 md:p-8"
    >
      {/* Optional Icon */}
      {Icon && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.4,
            ease: [0.68, -0.55, 0.265, 1.55], // Spring easing
          }}
          className="mb-4"
        >
          <Icon size={32} style={{ color: iconColorMap[iconColor] }} strokeWidth={2} />
        </motion.div>
      )}

      {/* Metric Value */}
      <div
        className="text-5xl md:text-6xl font-extrabold mb-2"
        style={{
          background: softUITokens.colors.primary.gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {displayValue}
      </div>

      {/* Metric Label */}
      <p
        className="text-base md:text-lg font-medium"
        style={{ color: softUITokens.colors.neutral.gray600 }}
      >
        {label}
      </p>
    </motion.div>
  );
};

export default MetricCard;
