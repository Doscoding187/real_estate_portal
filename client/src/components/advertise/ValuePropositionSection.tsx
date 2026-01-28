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
    description:
      'Connect with verified home seekers actively searching for properties. Our platform attracts serious buyers and renters, not casual browsers.',
  },
  {
    icon: Sparkles,
    headline: 'AI-Driven Visibility',
    description:
      'Smart algorithms ensure your listings reach the right audience at the right time. Maximize exposure with intelligent content distribution.',
  },
  {
    icon: CheckCircle,
    headline: 'Verified Leads',
    description:
      'Receive qualified inquiries from authenticated users. Every lead is validated for authenticity, saving you time and increasing conversion rates.',
  },
  {
    icon: BarChart3,
    headline: 'Dashboard Control',
    description:
      'Track performance, manage campaigns, and optimize your advertising strategy with comprehensive analytics and real-time insights.',
  },
];

export const ValuePropositionSection: React.FC<ValuePropositionSectionProps> = ({
  className = '',
}) => {
  return (
    <section
      className={`value-proposition-section py-20 md:py-28 bg-white ${className}`}
      aria-labelledby="value-proposition-heading"
      aria-describedby="value-proposition-description"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <motion.h2
            id="value-proposition-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-3xl md:text-4xl font-semibold leading-tight mb-4"
          >
            Why Advertise With Us?
          </motion.h2>

          <motion.p
            id="value-proposition-description"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto"
          >
            Join South Africa's fastest-growing property platform and reach thousands of verified
            home seekers
          </motion.p>
        </div>

        {/* Feature Blocks Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
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
