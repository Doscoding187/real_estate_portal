/**
 * FeaturesGridSection Component
 * 
 * Displays six feature tiles in a responsive grid layout showcasing
 * specific advertising features available on the platform.
 * 
 * Features:
 * - Listing Promotion
 * - Explore Feed Ads
 * - Boost Campaigns
 * - Lead Engine
 * - Team Collaboration
 * - Media Templates
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone, 
  Video, 
  TrendingUp, 
  Users, 
  UserPlus, 
  Image 
} from 'lucide-react';
import { FeatureTile } from './FeatureTile';
import { softUITokens } from './design-tokens';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export interface FeaturesGridSectionProps {
  /**
   * Optional section title
   */
  title?: string;
  
  /**
   * Optional section subtitle
   */
  subtitle?: string;
  
  /**
   * Optional additional CSS classes
   */
  className?: string;
}

// Feature data
const features = [
  {
    icon: Megaphone,
    title: 'Listing Promotion',
    description: 'Showcase your properties to thousands of active buyers and renters with premium listing placements and enhanced visibility.',
  },
  {
    icon: Video,
    title: 'Explore Feed Ads',
    description: 'Reach users through engaging short-form video content in our Explore feed, perfect for showcasing property highlights and lifestyle.',
  },
  {
    icon: TrendingUp,
    title: 'Boost Campaigns',
    description: 'Amplify your reach with targeted boost campaigns that put your listings in front of the right audience at the right time.',
  },
  {
    icon: Users,
    title: 'Lead Engine',
    description: 'Capture and manage high-quality leads with our intelligent lead engine that connects you with verified, interested buyers.',
  },
  {
    icon: UserPlus,
    title: 'Team Collaboration',
    description: 'Collaborate seamlessly with your team, manage permissions, and track performance across all your advertising campaigns.',
  },
  {
    icon: Image,
    title: 'Media Templates',
    description: 'Create professional property marketing materials with our library of customizable templates designed for maximum impact.',
  },
];

export const FeaturesGridSection: React.FC<FeaturesGridSectionProps> = ({
  title = 'Powerful Features for Your Success',
  subtitle = 'Everything you need to advertise effectively and grow your business',
  className = '',
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <section
      ref={ref}
      className={`features-grid-section py-20 md:py-28 ${className}`}
      style={{
        background: softUITokens.colors.neutral.gray50,
      }}
      aria-labelledby="features-grid-heading"
    >
      {/* Container with max width */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {/* Section Header */}
        <motion.div
          style={{
            textAlign: 'center',
            marginBottom: softUITokens.spacing['4xl'],
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <h2
            id="features-grid-heading"
            className="text-3xl md:text-4xl font-semibold leading-tight mb-4"
          >
            {title}
          </h2>
          <p
            className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto"
          >
            {subtitle}
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isVisible ? "animate" : "initial"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={staggerItem}
            >
              <FeatureTile
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>


    </section>
  );
};

export default FeaturesGridSection;
