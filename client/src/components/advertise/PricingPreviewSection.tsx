/**
 * PricingPreviewSection Component
 *
 * Displays 3 pricing tiers (Starter, Professional, Enterprise) with feature lists.
 * Highlights the "Professional" tier as most popular.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5 (Updated to 3 tiers)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import { CTAButton } from './CTAButton';

export interface PricingPreviewSectionProps {
  title?: string;
  subtitle?: string;
}

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  isPopular?: boolean;
}

const defaultPricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: 'R999',
    period: '/mo',
    description: 'Essential tools for individual agents to get started.',
    features: [
      'Up to 5 Active Listings',
      'Basic Listing Promotion',
      'Standard Email Support',
      'Basic Performance Analytics',
      'Mobile App Access',
    ],
    ctaLabel: 'Get Started',
    ctaHref: '/register?plan=starter',
  },
  {
    name: 'Professional',
    price: 'R2,499',
    period: '/mo',
    description: 'Advanced features for growing agencies and top performers.',
    features: [
      'Unlimited Active Listings',
      'Priority Search Placement',
      'Verified Agent Badge',
      'Advanced Lead Analytics',
      'WhatsApp Lead Integration',
      'Team Management (up to 5)',
    ],
    ctaLabel: 'Start Free Trial',
    ctaHref: '/register?plan=professional',
    isPopular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Tailored solutions for large developers and franchises.',
    features: [
      'API Access & Integrations',
      'Dedicated Account Manager',
      'Custom Branding Options',
      'Multi-Office Management',
      'Custom Reporting & Exports',
      'SLA & Priority Support',
    ],
    ctaLabel: 'Contact Sales',
    ctaHref: '/contact/enterprise',
  },
];

export const PricingPreviewSection: React.FC<PricingPreviewSectionProps> = ({
  title = 'Simple, Transparent Pricing',
  subtitle = 'Choose the plan that fits your business needs. No hidden fees.',
}) => {
  return (
    <section
      className="pricing-preview-section py-20 md:py-28 bg-gray-50"
      aria-labelledby="pricing-preview-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2
            id="pricing-preview-heading"
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            {title}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        {/* Pricing Tiers Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
        >
          {defaultPricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              variants={staggerItem}
              className={`relative flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                tier.isPopular ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-transparent'
              }`}
            >
              {tier.isPopular && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  MOST POPULAR
                </div>
              )}

              <div className="p-8 flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-extrabold text-gray-900">{tier.price}</span>
                  {tier.period && <span className="text-gray-500 ml-1">{tier.period}</span>}
                </div>
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">{tier.description}</p>

                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 pt-0 mt-auto">
                <CTAButton
                  label={tier.ctaLabel}
                  href={tier.ctaHref}
                  variant={tier.isPopular ? 'primary' : 'secondary'}
                  fullWidth
                  className={tier.isPopular ? 'shadow-blue-200' : ''}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-gray-500 text-sm">
            Prices exclude VAT. Annual billing available with 2 months free.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingPreviewSection;
