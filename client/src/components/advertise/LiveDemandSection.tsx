import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  FileSearch,
  MessageSquareText,
  Search,
} from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

const journeyStages = [
  {
    id: 'discovery',
    label: 'Search / Discovery',
    description:
      'A property seeker finds relevant inventory through a supported discovery surface.',
    icon: Search,
  },
  {
    id: 'detail',
    label: 'Property Detail',
    description:
      'The seeker reviews the property or development detail that matches their interest.',
    icon: FileSearch,
  },
  {
    id: 'enquiry',
    label: 'Enquiry',
    description: 'Interest is captured against the actual listing or development.',
    icon: MessageSquareText,
  },
  {
    id: 'ownership',
    label: 'Ownership Resolution',
    description: 'Property Listify resolves which commercial workspace should receive the enquiry.',
    icon: Building2,
  },
  {
    id: 'workspace',
    label: 'Business Workspace',
    description: 'The relevant Agent, Agency or Developer workflow supports follow-up.',
    icon: BriefcaseBusiness,
  },
];

export const LiveDemandSection: React.FC = () => {
  return (
    <section
      data-testid="live-demand-section"
      className="relative overflow-hidden border-y border-slate-100 bg-white py-24"
      aria-labelledby="live-demand-heading"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Column: Copy & journey anchors */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div
              variants={staggerItem}
              className="mb-6 inline-flex items-center space-x-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2"
            >
              <span className="relative flex h-3 w-3" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                The enquiry journey
              </span>
            </motion.div>

            <motion.h2
              id="live-demand-heading"
              variants={staggerItem}
              className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl"
            >
              Make the path to enquiry <span className="text-blue-600">clear.</span>
            </motion.h2>

            <motion.p variants={staggerItem} className="mb-10 text-lg text-slate-600 md:text-xl">
              Property Listify connects the steps between inventory, discovery and business
              follow-up. This illustration shows the product journey, not live market activity.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2"
            >
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <div className="mb-2 flex items-center space-x-3">
                  <Search className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  <span className="font-medium text-slate-500">Discovery</span>
                </div>
                <p className="text-base font-semibold text-slate-900">
                  Search, location discovery and property detail
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <div className="mb-2 flex items-center space-x-3">
                  <BriefcaseBusiness className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  <span className="font-medium text-slate-500">Follow-up</span>
                </div>
                <p className="text-base font-semibold text-slate-900">
                  Ownership resolution and the right business workspace
                </p>
              </div>
            </motion.div>

            <motion.a
              variants={staggerItem}
              href="#pricing-preview"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
            >
              See Launch Access options
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </motion.a>
          </motion.div>

          {/* Right Column: Product journey illustration */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
              <div
                className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50 via-white to-white"
                aria-hidden="true"
              />
              <div className="absolute right-0 top-0 p-6">
                <div className="inline-flex items-center space-x-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
                  <span className="font-mono text-xs text-blue-700">PRODUCT JOURNEY</span>
                </div>
              </div>

              <div className="relative z-10 mb-4 mt-8">
                <h3 className="mb-1 font-semibold text-slate-900">Illustrative enquiry path</h3>
                <p className="text-sm text-slate-500">
                  From a seeker&apos;s discovery to business follow-up.
                </p>
                <div className="mt-4 h-px w-full bg-slate-200" />
              </div>

              <div className="relative z-10 space-y-3">
                {journeyStages.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.id}
                      className="flex items-start space-x-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mt-0.5 rounded-lg bg-blue-50 p-2">
                        <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {stage.label}
                          </span>
                        </div>
                        <p className="mt-1 pl-7 text-xs leading-relaxed text-slate-500">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
