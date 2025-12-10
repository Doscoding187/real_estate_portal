/**
 * ValuePropositionSection Component
 * 
 * Displays four feature blocks highlighting the key benefits of advertising
 * on the platform: High-Intent Audience, AI-Driven Visibility, Verified Leads,
 * and Dashboard Control.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles, CheckCircle, BarChart3 } from 'lucide-react';
import { FeatureBlock } from './FeatureBlock';
import { softUITokens } from './design-tokens';
import { staggerContainer } from '@/lib/animations/advertiseAnimations';

export interface ValuePropositionSectionProps {
  /**
   * Optional additional CSS classes
   */
  className?: string;
}

/**
 * Feature data for the value proposition section
 */
const features = [
  {
    icon: Target,
    headline: 'High-Intent Audience',
    description: 'Connect with verified home seekers actively searching for properties. Our platform attracts serious buyers and renters, not casual browsers.',
  },
  {
    icon: Sparkles,
    headline: 'AI-Driven Visibility',
    description: 'Smart algorithms ensure your listings reach the right audience at the right time. Maximize exposure with intelligent content distribution.',
  },
  {
    icon: CheckCircle,
    headline: 'Verified Leads',
    description: 'Receive qualified inquiries from authenticated users. Every lead is validated for authenticity, saving you time and increasing conversion rates.',
  },
  {
    icon: BarChart3,
    headline: 'Dashboard Control',
    description: 'Track performance, manage campaigns, and optimize your advertising strategy with comprehensive analytics and real-time insights.',
  },
];

export const ValuePropositionSection: React.FC<ValuePropositionSectionProps> = ({
  className = '',
}) => {
  return (
    <section
      className={`value-proposition-section ${className}`}
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.gray50,
      }}
      aria-labelledby="value-proposition-heading"
      aria-describedby="value-proposition-description"
      role="region"
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: softUITokens.spacing['4xl'],
          }}
        >
          <motion.h2
            id="value-proposition-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            style={{
              fontSize: softUITokens.typography.fontSize['4xl'],
              fontWeight: softUITokens.typography.fontWeight.bold,
              color: softUITokens.colors.neutral.gray900,
              marginBottom: softUITokens.spacing.lg,
              lineHeight: softUITokens.typography.lineHeight.tight,
            }}
          >
            Why Advertise With Us?
          </motion.h2>
          
          <motion.p
            id="value-proposition-description"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              fontSize: softUITokens.typography.fontSize.xl,
              color: softUITokens.colors.neutral.gray600,
              maxWidth: '800px',
              margin: '0 auto',
              lineHeight: softUITokens.typography.lineHeight.relaxed,
            }}
          >
            Join South Africa's fastest-growing property platform and reach thousands of verified home seekers
          </motion.p>
        </div>

        {/* Feature Blocks Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: softUITokens.spacing['3xl'],
            alignItems: 'start',
          }}
          role="list"
          aria-label="Platform benefits"
        >
          {features.map((feature, index) => (
            <div key={feature.headline} role="listitem">
              <FeatureBlock
                icon={feature.icon}
                headline={feature.headline}
                description={feature.description}
                index={index}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
