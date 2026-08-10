import React from 'react';
import { motion } from 'framer-motion';
import { BriefcaseBusiness, MessageSquareText, Search, Upload } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

interface JourneyStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  supportingLabel: string;
}

const steps: JourneyStep[] = [
  {
    id: 1,
    title: 'Publish',
    description:
      'Create accurate property or development inventory for the relevant business workflow.',
    icon: Upload,
    supportingLabel: 'Accurate inventory',
  },
  {
    id: 2,
    title: 'Get discovered',
    description:
      'Inventory becomes available through relevant Property Listify discovery experiences.',
    icon: Search,
    supportingLabel: 'Relevant discovery',
  },
  {
    id: 3,
    title: 'Capture interest',
    description: 'Prospects enquire against the property or development inventory they care about.',
    icon: MessageSquareText,
    supportingLabel: 'Recorded enquiry',
  },
  {
    id: 4,
    title: 'Follow up',
    description: 'The enquiry enters the appropriate Agent, Agency or Developer workflow.',
    icon: BriefcaseBusiness,
    supportingLabel: 'Business workspace',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      data-testid="how-it-works-section"
      className="relative overflow-hidden bg-slate-50 py-24"
      aria-labelledby="how-it-works-heading"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute left-0 top-1/4 h-96 w-96 animate-blob rounded-full bg-blue-100 opacity-50 mix-blend-multiply blur-3xl" />
        <div className="animation-delay-2000 absolute right-0 top-1/3 h-96 w-96 animate-blob rounded-full bg-indigo-100 opacity-50 mix-blend-multiply blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-20 max-w-3xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <motion.div
            variants={staggerItem}
            className="mb-6 inline-flex items-center space-x-2 rounded-full bg-indigo-100 px-4 py-2"
          >
            <Search className="h-4 w-4 text-indigo-700" aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-800">
              The path to enquiry
            </span>
          </motion.div>
          <motion.h2
            id="how-it-works-heading"
            variants={staggerItem}
            className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl"
          >
            How the Property Listify journey works
          </motion.h2>
          <motion.p
            variants={staggerItem}
            className="text-lg leading-8 text-slate-600 md:text-xl md:leading-9"
          >
            Each step keeps the inventory, the property seeker&apos;s interest and the responsible
            business workspace connected.
          </motion.p>
        </motion.div>

        <div className="relative mx-auto max-w-5xl">
          {/* Animated Connecting Pipeline for Desktop */}
          <div className="absolute left-[10%] right-[10%] top-[4.5rem] z-0 hidden h-1 overflow-hidden rounded-full bg-blue-100 lg:block">
            <motion.div
              className="absolute bottom-0 left-0 top-0 w-full bg-gradient-to-r from-transparent via-blue-500 to-indigo-500"
              initial={{ x: '-100%' }}
              whileInView={{ x: '100%' }}
              viewport={{ once: false }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: index * 0.15, type: 'spring', stiffness: 50 }}
                className="group relative flex flex-col items-center text-center"
              >
                {/* Step Node */}
                <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-xl shadow-slate-200/50 transition-transform duration-300 group-hover:-translate-y-2">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <step.icon
                    className="relative z-10 h-10 w-10 text-indigo-600"
                    aria-hidden="true"
                  />
                  <div className="absolute -right-4 -top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-blue-700 text-base font-bold text-white shadow-md">
                    {step.id}
                  </div>
                </div>

                <h3 className="mb-3 text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="mb-6 text-base leading-8 text-slate-600 md:text-lg">
                  {step.description}
                </p>

                <div className="mt-auto rounded-lg border border-indigo-100/50 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                  {step.supportingLabel}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
