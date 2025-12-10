/**
 * PartnerSelectionSection Component
 * 
 * Displays five partner type cards with staggered animations.
 * Allows users to self-identify and navigate to relevant content.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Building2, 
  Landmark, 
  FileText, 
  Wrench 
} from 'lucide-react';
import { PartnerTypeCard } from './PartnerTypeCard';
import { staggerContainer } from '@/lib/animations/advertiseAnimations';

export interface PartnerType {
  id: string;
  icon: typeof Home;
  title: string;
  benefit: string;
  href: string;
}

const defaultPartnerTypes: PartnerType[] = [
  {
    id: 'agent',
    icon: Home,
    title: 'Real Estate Agent',
    benefit: 'Showcase your listings to thousands of verified buyers and renters actively searching for properties.',
    href: '/advertise/agents',
  },
  {
    id: 'developer',
    icon: Building2,
    title: 'Property Developer',
    benefit: 'Promote your developments with immersive media, reach qualified buyers, and track leads in real-time.',
    href: '/advertise/developers',
  },
  {
    id: 'bank',
    icon: Landmark,
    title: 'Bank / Financial Institution',
    benefit: 'Connect with home buyers at the perfect moment and offer tailored financing solutions.',
    href: '/advertise/banks',
  },
  {
    id: 'bond-originator',
    icon: FileText,
    title: 'Bond Originator',
    benefit: 'Capture high-intent leads looking for home loans and grow your origination pipeline.',
    href: '/advertise/bond-originators',
  },
  {
    id: 'service-provider',
    icon: Wrench,
    title: 'Property Service Provider',
    benefit: 'Reach homeowners and property managers who need your services, from maintenance to renovations.',
    href: '/advertise/service-providers',
  },
];

export interface PartnerSelectionSectionProps {
  /**
   * Optional custom partner types
   */
  partnerTypes?: PartnerType[];
  
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

export const PartnerSelectionSection: React.FC<PartnerSelectionSectionProps> = ({
  partnerTypes = defaultPartnerTypes,
  title = 'Who Are You Advertising As?',
  subtitle = 'Choose your partner type to see tailored advertising solutions',
  className = '',
}) => {
  return (
    <section
      className={`partner-selection-section py-20 md:py-28 bg-gray-50 ${className}`}
      aria-labelledby="partner-selection-heading"
      aria-describedby="partner-selection-description"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2
            id="partner-selection-heading"
            className="text-3xl md:text-4xl font-semibold leading-tight mb-4"
          >
            {title}
          </h2>
          <p
            id="partner-selection-description"
            className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto"
          >
            {subtitle}
          </p>
        </div>

        {/* Partner Type Cards Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 partner-cards-grid"
          role="list"
          aria-label="Partner type options"
        >
          {partnerTypes.map((partnerType, index) => (
            <div key={partnerType.id} role="listitem">
              <PartnerTypeCard
                icon={partnerType.icon}
                title={partnerType.title}
                benefit={partnerType.benefit}
                href={partnerType.href}
                index={index}
              />
            </div>
          ))}
        </motion.div>
      </div>


    </section>
  );
};

