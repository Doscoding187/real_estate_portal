/**
 * SocialProofSection Component
 * 
 * Displays social proof including partner logos and key metrics.
 * Builds trust through credibility indicators.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Star, Award } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { softUITokens } from './design-tokens';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export interface PartnerLogo {
  /**
   * Partner name
   */
  name: string;
  
  /**
   * Logo image URL
   */
  imageUrl?: string;
  
  /**
   * Alt text for the logo
   */
  alt: string;
}

export interface SocialProofMetric {
  /**
   * Metric value (number or formatted string)
   */
  value: string | number;
  
  /**
   * Descriptive label
   */
  label: string;
  
  /**
   * Optional icon
   */
  icon?: typeof TrendingUp;
  
  /**
   * Icon color
   */
  iconColor?: 'primary' | 'secondary' | 'blue' | 'green' | 'yellow' | 'purple';
}

export interface SocialProofSectionProps {
  /**
   * Section heading
   * @default "Trusted by Leading Property Professionals"
   */
  heading?: string;
  
  /**
   * Section subheading
   */
  subheading?: string;
  
  /**
   * Partner logos to display
   */
  partnerLogos?: PartnerLogo[];
  
  /**
   * Key metrics to display
   */
  metrics: SocialProofMetric[];
  
  /**
   * Whether to show partner logos
   * @default true
   */
  showLogos?: boolean;
  
  /**
   * Disclaimer text for placeholder data
   */
  disclaimer?: string;
}

/**
 * SocialProofSection Component
 * 
 * @example
 * ```tsx
 * <SocialProofSection
 *   metrics={[
 *     { value: '5,000+', label: 'Verified Leads Generated', icon: TrendingUp, iconColor: 'green' },
 *     { value: '10,000+', label: 'Properties Promoted', icon: Award, iconColor: 'blue' },
 *     { value: '95%', label: 'Partner Satisfaction', icon: Star, iconColor: 'yellow' },
 *     { value: '500+', label: 'Active Partners', icon: Users, iconColor: 'purple' },
 *   ]}
 *   partnerLogos={[
 *     { name: 'Developer A', alt: 'Developer A Logo' },
 *     { name: 'Agency B', alt: 'Agency B Logo' },
 *   ]}
 * />
 * ```
 */
export const SocialProofSection: React.FC<SocialProofSectionProps> = ({
  heading = 'Trusted by Leading Property Professionals',
  subheading,
  partnerLogos = [],
  metrics,
  showLogos = true,
  disclaimer,
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <section
      ref={ref}
      className="py-16 md:py-24 px-4 md:px-8"
      style={{ backgroundColor: softUITokens.colors.neutral.gray50 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
            style={{ color: softUITokens.colors.neutral.gray900 }}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="text-lg md:text-xl max-w-3xl mx-auto"
              style={{ color: softUITokens.colors.neutral.gray600 }}
            >
              {subheading}
            </p>
          )}
        </motion.div>

        {/* Partner Logos */}
        {showLogos && partnerLogos.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate={isVisible ? "animate" : "initial"}
            className="mb-16"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center justify-items-center">
              {partnerLogos.map((logo, index) => (
                <motion.div
                  key={`${logo.name}-${index}`}
                  variants={staggerItem}
                  className="flex items-center justify-center p-4 rounded-lg"
                  style={{
                    backgroundColor: softUITokens.colors.neutral.white,
                    boxShadow: softUITokens.shadows.soft,
                  }}
                >
                  {logo.imageUrl ? (
                    <OptimizedImage
                      src={logo.imageUrl}
                      alt={logo.alt}
                      priority={false}
                      objectFit="contain"
                      className="h-12 w-auto opacity-60 hover:opacity-100 transition-opacity duration-300"
                      sizes="128px"
                    />
                  ) : (
                    <div
                      className="h-12 w-32 flex items-center justify-center text-sm font-medium"
                      style={{ color: softUITokens.colors.neutral.gray400 }}
                    >
                      {logo.name}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Metrics Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isVisible ? "animate" : "initial"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {metrics.map((metric, index) => (
            <motion.div key={`${metric.label}-${index}`} variants={staggerItem}>
              <MetricCard
                value={metric.value}
                label={metric.label}
                icon={metric.icon}
                iconColor={metric.iconColor}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Disclaimer */}
        {disclaimer && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="text-center text-sm mt-8"
            style={{ color: softUITokens.colors.neutral.gray500 }}
          >
            {disclaimer}
          </motion.p>
        )}
      </div>
    </section>
  );
};

export default SocialProofSection;
