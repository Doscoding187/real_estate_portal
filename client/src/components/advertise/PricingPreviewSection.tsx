/**
 * PricingPreviewSection Component
 * 
 * Displays four pricing category cards with navigation to full pricing page.
 * Includes a "View Full Pricing" CTA button below the cards.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, Landmark, Wrench } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { staggerContainer } from '@/lib/animations/advertiseAnimations';
import { PricingCard } from './PricingCard';
import { CTAButton } from './CTAButton';

export interface PricingPreviewSectionProps {
  /**
   * Optional custom pricing categories
   */
  pricingCategories?: Array<{
    icon: any;
    category: string;
    description: string;
    href: string;
  }>;
  
  /**
   * URL for the full pricing page
   */
  fullPricingHref?: string;
  
  /**
   * Optional section title
   */
  title?: string;
  
  /**
   * Optional section subtitle
   */
  subtitle?: string;
}

/**
 * Default pricing categories
 */
const defaultPricingCategories = [
  {
    icon: Users,
    category: 'Agent Plans',
    description: 'Flexible pricing for individual agents and small teams. Promote listings and capture leads.',
    href: '/pricing/agents',
  },
  {
    icon: Building2,
    category: 'Developer Plans',
    description: 'Comprehensive packages for property developers. Showcase developments and generate qualified leads.',
    href: '/pricing/developers',
  },
  {
    icon: Landmark,
    category: 'Bank/Loan Provider Plans',
    description: 'Targeted advertising for financial institutions. Connect with home buyers seeking financing.',
    href: '/pricing/financial',
  },
  {
    icon: Wrench,
    category: 'Service Provider Plans',
    description: 'Affordable options for property service providers. Reach homeowners and property managers.',
    href: '/pricing/services',
  },
];

/**
 * Track "View Full Pricing" CTA click
 */
const trackViewFullPricingClick = (href: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'cta_click', {
      label: 'View Full Pricing',
      location: 'pricing_preview',
      href,
      timestamp: new Date().toISOString(),
    });
  }
  
  console.log('View Full Pricing Click:', { href });
};

export const PricingPreviewSection: React.FC<PricingPreviewSectionProps> = ({
  pricingCategories = defaultPricingCategories,
  fullPricingHref = '/pricing',
  title = 'Pricing That Fits Your Business',
  subtitle = 'Choose the plan that works for you. All plans include our core features with flexible options to scale as you grow.',
}) => {
  return (
    <section
      className="pricing-preview-section"
      aria-labelledby="pricing-preview-heading"
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.lg}`,
        background: softUITokens.colors.neutral.gray50,
      }}
    >
      {/* Container with max width */}
      <div
        style={{
          maxWidth: softUITokens.breakpoints.desktop,
          margin: '0 auto',
        }}
      >
        {/* Section Header */}
        <motion.div
          style={{
            textAlign: 'center',
            marginBottom: softUITokens.spacing['4xl'],
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2
            id="pricing-preview-heading"
            style={{
              fontSize: softUITokens.typography.fontSize['4xl'],
              fontWeight: softUITokens.typography.fontWeight.bold,
              color: softUITokens.colors.neutral.gray900,
              marginBottom: softUITokens.spacing.lg,
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
              maxWidth: '800px',
              margin: '0 auto',
            }}
          >
            {subtitle}
          </p>
        </motion.div>

        {/* Pricing Cards Grid */}
        <motion.div
          className="pricing-cards-grid"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: softUITokens.spacing.xl,
            marginBottom: softUITokens.spacing['3xl'],
          }}
        >
          {pricingCategories.map((category, index) => (
            <PricingCard
              key={category.category}
              icon={category.icon}
              category={category.category}
              description={category.description}
              href={category.href}
            />
          ))}
        </motion.div>

        {/* View Full Pricing CTA */}
        <motion.div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: softUITokens.spacing['2xl'],
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <CTAButton
            label="View Full Pricing"
            href={fullPricingHref}
            variant="secondary"
            onClick={() => trackViewFullPricingClick(fullPricingHref)}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default PricingPreviewSection;
