/**
 * ValuePropositionSection Component
 *
 * Displays the three supported value pillars: structured discovery, enquiry
 * capture and business follow-up.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BriefcaseBusiness, Compass, MessageSquareText } from 'lucide-react';
import { staggerContainer } from '@/lib/animations/advertiseAnimations';

export interface ValuePropositionSectionProps {
  className?: string;
}

const features = [
  {
    icon: Compass,
    iconColorClass: 'text-primary bg-primary/10',
    headline: 'Structured discovery',
    description:
      'Your property or development inventory participates in the relevant Property Listify discovery journeys.',
  },
  {
    icon: MessageSquareText,
    iconColorClass: 'text-secondary bg-secondary/10',
    headline: 'Enquiry capture',
    description:
      'Interest is recorded against the actual listing or development that the property seeker cares about.',
  },
  {
    icon: BriefcaseBusiness,
    iconColorClass: 'text-success bg-success/10',
    headline: 'Business follow-up',
    description:
      'The resulting enquiry reaches the relevant Agent, Agency or Developer workspace for supported follow-up.',
  },
];

export const ValuePropositionSection: React.FC<ValuePropositionSectionProps> = ({
  className = '',
}) => {
  return (
    <section
      data-testid="value-proposition-section"
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
            We don&apos;t just host listings.
            <br />
            We build the path to enquiry.
          </motion.h2>

          <motion.p
            id="value-proposition-description"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto max-w-3xl text-lg font-light leading-relaxed text-slate-600 md:text-xl md:leading-9"
          >
            Property Listify connects discovery, enquiry capture and business follow-up so your
            inventory has a clear path from being found to being worked.
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
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-9 transition-all duration-300 hover:border-primary/30 hover:shadow-xl md:p-10"
              >
                {/* Subtle gradient hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div
                  className={`relative z-10 mb-8 flex h-16 w-16 items-center justify-center rounded-xl ${feature.iconColorClass}`}
                >
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="relative z-10 mb-4 text-2xl font-bold tracking-tight text-slate-900">
                  {feature.headline}
                </h3>
                <p className="relative z-10 text-base leading-8 text-slate-600 md:text-lg">
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
