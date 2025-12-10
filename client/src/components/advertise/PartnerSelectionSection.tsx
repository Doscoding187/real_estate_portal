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
import { softUITokens } from './design-tokens';
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
      className={`partner-selection-section ${className}`}
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.gray50,
      }}
      aria-labelledby="partner-selection-heading"
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
          <h2
            id="partner-selection-heading"
            style={{
              fontSize: softUITokens.typography.fontSize['4xl'],
              fontWeight: softUITokens.typography.fontWeight.bold,
              color: softUITokens.colors.neutral.gray900,
              marginBottom: softUITokens.spacing.md,
              lineHeight: softUITokens.typography.lineHeight.tight,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: softUITokens.typography.fontSize.xl,
              color: softUITokens.colors.neutral.gray600,
              lineHeight: softUITokens.typography.lineHeight.relaxed,
              maxWidth: '600px',
              margin: '0 auto',
            }}
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
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: softUITokens.spacing.xl,
          }}
          className="partner-cards-grid"
        >
          {partnerTypes.map((partnerType, index) => (
            <PartnerTypeCard
              key={partnerType.id}
              icon={partnerType.icon}
              title={partnerType.title}
              benefit={partnerType.benefit}
              href={partnerType.href}
              index={index}
            />
          ))}
        </motion.div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: ${softUITokens.breakpoints.mobile}) {
          .partner-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (min-width: ${softUITokens.breakpoints.mobile}) and (max-width: ${softUITokens.breakpoints.tablet}) {
          .partner-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
};

