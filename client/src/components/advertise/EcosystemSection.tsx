import React from 'react';
import { motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  FileSearch,
  MapPin,
  Network,
  Search,
} from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

const ecosystemNodes = [
  {
    title: 'PROPERTY SEEKERS',
    description:
      'Search, location discovery and property detail help seekers find relevant inventory.',
    icon: Search,
    supportingIcons: [Search, MapPin, FileSearch],
    tone: 'blue',
  },
  {
    title: 'PROPERTY LISTIFY',
    description: 'Inventory, discovery, enquiry capture and routing connect the journey.',
    icon: Network,
    supportingIcons: [],
    tone: 'slate',
  },
  {
    title: 'YOUR BUSINESS',
    description: 'Listings, leads, team or workspace tools and follow-up support the next step.',
    icon: BriefcaseBusiness,
    supportingIcons: [Building2, FileSearch],
    tone: 'emerald',
  },
] as const;

export const EcosystemSection: React.FC = () => {
  return (
    <section
      data-testid="ecosystem-section"
      className="relative overflow-hidden bg-white py-24"
      aria-labelledby="ecosystem-heading"
    >
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

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
            className="mb-6 inline-flex items-center space-x-2 rounded-full bg-blue-50 px-4 py-2"
          >
            <Network className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-wider text-blue-800">
              The Property Listify path
            </span>
          </motion.div>
          <motion.h2
            id="ecosystem-heading"
            variants={staggerItem}
            className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl"
          >
            From discovery to <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              business follow-up.
            </span>
          </motion.h2>
          <motion.p variants={staggerItem} className="text-lg text-slate-600 md:text-xl">
            One connected journey lets your inventory participate in discovery, capture interest and
            reach the business workspace responsible for follow-up.
          </motion.p>
        </motion.div>

        <div className="relative mx-auto max-w-5xl">
          <div className="relative flex flex-col items-center justify-between gap-8 md:flex-row md:gap-4">
            {ecosystemNodes.map((node, index) => {
              const Icon = node.icon;
              const isCenter = index === 1;
              const cardClass = isCenter
                ? 'relative z-20 flex-1 transform rounded-2xl border border-blue-200 bg-blue-50/80 p-8 text-center shadow-xl shadow-blue-100/70 md:scale-105'
                : 'relative z-10 flex-1 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-100 transition-colors hover:border-blue-300';
              const iconClass = isCenter
                ? 'border border-blue-200 bg-white text-blue-700'
                : node.tone === 'emerald'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-blue-50 text-blue-600';
              const titleClass = 'text-slate-900';
              const descriptionClass = 'text-slate-600';

              return (
                <React.Fragment key={node.title}>
                  <motion.div
                    initial={{
                      opacity: 0,
                      x: index === 0 ? -30 : index === 2 ? 30 : 0,
                      scale: isCenter ? 0.9 : 1,
                    }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    className={cardClass}
                  >
                    <div
                      className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${iconClass}`}
                    >
                      <Icon className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <h3 className={`mb-3 text-xl font-bold ${titleClass}`}>{node.title}</h3>
                    <p className={`text-sm ${descriptionClass}`}>{node.description}</p>
                    {node.supportingIcons.length > 0 && (
                      <div className="mt-4 flex justify-center space-x-2" aria-hidden="true">
                        {node.supportingIcons.map(SupportingIcon => (
                          <SupportingIcon
                            key={SupportingIcon.displayName}
                            className="h-5 w-5 text-slate-400"
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {index < ecosystemNodes.length - 1 && (
                    <div
                      className="flex flex-col items-center justify-center md:w-24"
                      aria-hidden="true"
                    >
                      <div className="hidden h-0.5 w-full bg-gradient-to-r from-blue-200 to-indigo-300 md:block" />
                      <ChevronRight className="mt-2 rotate-90 text-indigo-300 md:rotate-0" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
