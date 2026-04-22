/**
 * PricingPreviewSection Component
 *
 * Displays 3 pricing tiers emphasizing ROI.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, TrendingUp } from 'lucide-react';
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
    name: 'Solo Agent',
    price: 'R999',
    period: '/mo',
    description: 'Perfect for independent agents building their own pipeline.',
    features: [
      'Up to 5 Active Listings',
      'Direct Buyer Routing',
      'Basic Performance Analytics',
      'Mobile Lead Alerts',
    ],
    ctaLabel: 'Start Generating',
    ctaHref: '/register?plan=solo',
  },
  {
    name: 'Team / Agency',
    price: 'R2,499',
    period: '/mo',
    description: 'Advanced routing and management for growing real estate teams.',
    features: [
      'Unlimited Active Listings',
      'Priority Algorithm Placement',
      'Advanced Conversion Analytics',
      'WhatsApp Lead Integration',
      'Team Lead Routing (up to 5)',
    ],
    ctaLabel: 'Scale Your Team',
    ctaHref: '/register?plan=agency',
    isPopular: true,
  },
  {
    name: 'Developer',
    price: 'Custom',
    period: '',
    description: 'High-volume infrastructure for new development sales.',
    features: [
      'Project Showcase Pages',
      'API Lead Integration',
      'Custom Branding Options',
      'Multi-Phase Inventory',
      'Dedicated Partner Manager',
    ],
    ctaLabel: 'Talk to Sales',
    ctaHref: '/contact/enterprise',
  },
];

export const PricingPreviewSection: React.FC<PricingPreviewSectionProps> = ({
  title = 'Investment vs Returns',
  subtitle = 'Choose the infrastructure tier that matches your volume.',
}) => {
  return (
    <section
      className="pricing-preview-section py-24 bg-slate-50 relative"
      aria-labelledby="pricing-preview-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ROI Anchor Header */}
        <motion.div
            className="max-w-5xl mx-auto bg-indigo-600 rounded-3xl p-8 md:p-12 text-center text-white mb-16 shadow-2xl relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20 pointer-events-none">
               <TrendingUp className="w-64 h-64 text-indigo-300" />
            </div>
            <h2 id="pricing-preview-heading" className="text-3xl md:text-4xl font-extrabold mb-6 relative z-10">
              Stop calculating cost. Start calculating <span className="text-emerald-400">ROI</span>.
            </h2>
            <p className="text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto mb-10 relative z-10 font-medium">
              If our ecosystem brings you just ONE extra deal this year, you're in the black. Can your current marketing say the same?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
               <div className="bg-indigo-700/50 rounded-2xl p-6 border border-indigo-500/30 backdrop-blur-sm">
                  <div className="text-sm text-indigo-200 font-medium mb-1 uppercase tracking-wider">Avg. Commission</div>
                  <div className="text-3xl font-extrabold text-white">R45,000</div>
                  <div className="text-xs text-indigo-300 mt-2">Per average property sale</div>
               </div>
               <div className="bg-emerald-600/50 rounded-2xl p-6 border border-emerald-500/30 backdrop-blur-sm transform md:-translate-y-2">
                  <div className="text-sm text-emerald-100 font-medium mb-1 uppercase tracking-wider">Close 1 Deal</div>
                  <div className="text-4xl font-extrabold text-emerald-400">20x ROI</div>
                  <div className="text-xs text-emerald-200 mt-2">On your annual subscription</div>
               </div>
               <div className="bg-indigo-700/50 rounded-2xl p-6 border border-indigo-500/30 backdrop-blur-sm">
                  <div className="text-sm text-indigo-200 font-medium mb-1 uppercase tracking-wider">Cost Per Lead</div>
                  <div className="text-3xl font-extrabold text-white">&lt; R50</div>
                  <div className="text-xs text-indigo-300 mt-2">For high-intent, verified buyers</div>
               </div>
            </div>
        </motion.div>

        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-600">{subtitle}</p>
        </motion.div>

        {/* Pricing Tiers Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
        >
          {defaultPricingTiers.map((tier) => (
            <motion.div
              key={tier.name}
              variants={staggerItem}
              className={`relative flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${
                tier.isPopular ? 'border-indigo-500 shadow-indigo-100 ring-2 ring-indigo-500/20 z-10 scale-100 lg:scale-105' : 'border-slate-200 mt-0 lg:mt-4 mb-0 lg:mb-4'
              }`}
            >
              {tier.isPopular && (
                <div className="bg-indigo-500 text-white text-xs font-bold py-1.5 text-center flex items-center justify-center gap-1 uppercase tracking-wider">
                  <Star className="w-3 h-3 fill-current" />
                  Most Popular
                </div>
              )}

              <div className="p-8 flex-grow">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                <p className="text-slate-500 mb-6 text-sm">{tier.description}</p>
                
                <div className="flex items-baseline mb-8 pb-8 border-b border-slate-100">
                  <span className="text-4xl font-extrabold text-slate-900">{tier.price}</span>
                  {tier.period && <span className="text-slate-500 font-medium ml-1">{tier.period}</span>}
                </div>

                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Check className={`w-5 h-5 ${tier.isPopular ? 'text-indigo-500' : 'text-emerald-500'}`} />
                      </div>
                      <span className="text-slate-600 text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 pt-0 mt-auto">
                <a
                  href={tier.ctaHref}
                  className={`flex items-center justify-center w-full py-4 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg ${
                    tier.isPopular 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {tier.ctaLabel}
                </a>
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
          <p className="text-slate-500 text-sm">
            Prices exclude VAT. Annual billing available with 2 months free.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingPreviewSection;
