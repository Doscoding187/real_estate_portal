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
import { Target, MapPin, BarChart3 } from 'lucide-react';
import { staggerContainer } from '@/lib/animations/advertiseAnimations';

export interface ValuePropositionSectionProps {
  className?: string;
}

const features = [
  {
    icon: Target,
    iconColorClass: 'text-primary bg-primary/10',
    headline: 'Verified Lead Generation',
    description:
      'Every enquiry is passed through our HomeFinder Copilot — buyers tell us their budget, location, and timeline before they ever reach you.',
  },
  {
    icon: MapPin,
    iconColorClass: 'text-secondary bg-secondary/10',
    headline: 'Smart Location & Budget Matching',
    description:
      'Buyers are matched to properties based on affordability scores, not keyword searches. Your listings reach people who can actually buy.',
  },
  {
    icon: BarChart3,
    iconColorClass: 'text-success bg-success/10',
    headline: 'CRM, Analytics & Conversion Tools',
    description:
      'Track enquiry volume, response rates, and pipeline value from one dashboard. Know exactly what\'s working and where deals are slipping.',
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
        <div className="text-center mb-16 md:mb-20">
           <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-primary/10 text-primary-dark mb-6"
          >
            Why Property Listify
          </motion.div>
          <motion.h2
            id="value-proposition-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-3xl md:text-5xl font-bold leading-tight mb-6 text-slate-900 tracking-tight"
          >
            We Don't Just List Properties.<br />We Generate Demand.
          </motion.h2>

          <motion.p
            id="value-proposition-description"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-light"
          >
            While traditional portals show listings to casual browsers, we qualify buyers through affordability tools and route genuine, serious intent straight to you.
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
          role="list"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div 
                key={feature.headline} 
                role="listitem"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="group p-8 rounded-2xl border border-slate-200 bg-white hover:shadow-xl hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
              >
                {/* Subtle gradient hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className={`relative z-10 w-14 h-14 rounded-xl flex items-center justify-center mb-8 ${feature.iconColorClass}`}>
                    <Icon className="w-7 h-7" />
                </div>
                <h3 className="relative z-10 text-xl font-bold text-slate-900 mb-4 tracking-tight">
                  {feature.headline}
                </h3>
                <p className="relative z-10 text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
