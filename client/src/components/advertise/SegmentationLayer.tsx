import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building2, Home, Handshake, ArrowRight, CheckCircle2 } from 'lucide-react';

export type SegmentType = 'agent' | 'developer' | 'seller' | 'partner';

interface SegmentData {
  id: SegmentType;
  label: string;
  icon: React.ElementType;
  headline: string;
  subheadline: string;
  benefits: string[];
  ctaText: string;
  ctaLink: string;
}

const segments: SegmentData[] = [
  {
    id: 'agent',
    label: 'Agent',
    icon: User,
    headline: 'Get Qualified Leads',
    subheadline:
      'Connect with high-intent buyers and close deals faster with our AI-powered matching engine.',
    benefits: ['Verified buyer leads', 'Area exclusivity options', 'Personal branding tools'],
    ctaText: 'Start as Agent',
    ctaLink: '/register/agent',
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: Building2,
    headline: 'Sell Developments Faster',
    subheadline:
      'Showcase your projects to millions of verified buyers with premium branding and analytics.',
    benefits: ['3D project showcases', 'Lead pre-qualification', 'Real-time inventory management'],
    ctaText: 'Developer Solutions',
    ctaLink: '/register/developer',
  },
  {
    id: 'seller',
    label: 'Seller',
    icon: Home,
    headline: 'Sell Your Home',
    subheadline: 'List your property directly and reach potential buyers without the hassle.',
    benefits: ['List for free', 'Instant valuation', 'Verified buyer requests'],
    ctaText: 'List Property',
    ctaLink: '/list-property',
  },
  {
    id: 'partner',
    label: 'Partner',
    icon: Handshake,
    headline: 'Grow Your Business',
    subheadline:
      'Banks, bond originators, and service providers - reach your target audience effectively.',
    benefits: ['Targeted advertising', 'Service marketplace listing', 'Performance analytics'],
    ctaText: 'Partner With Us',
    ctaLink: '/contact/partner',
  },
];

export interface SegmentationLayerProps {
  roleContext?: SegmentType;
}

export const SegmentationLayer: React.FC<SegmentationLayerProps> = ({ roleContext }) => {
  const [activeSegment, setActiveSegment] = useState<SegmentType>(roleContext || segments[0].id);

  // Default view or specific segment view
  const currentContent = segments.find(s => s.id === activeSegment)!;

  return (
    <section className="w-full bg-slate-50 relative pb-16 z-10 -mt-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8">
            <h3 className="text-xl font-semibold text-slate-800 text-center mb-6">Select your profile to view partner solutions</h3>

          {/* Segment Selection Grid (Rich Previews) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {segments.map(segment => {
              const Icon = segment.icon;
              const isActive = activeSegment === segment.id;

              return (
                <button
                  key={segment.id}
                  onClick={() => setActiveSegment(segment.id)}
                  className={`flex flex-col text-left p-5 rounded-2xl transition-all duration-300 border-2 group relative overflow-hidden ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-[1.02] z-10'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200 hover:shadow-sm'
                  }`}
                  aria-pressed={isActive}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div
                      className={`p-2.5 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`font-bold ${
                        isActive ? 'text-indigo-900 text-lg' : 'text-slate-800 text-base'
                      }`}
                    >
                      {segment.label}
                    </span>
                  </div>
                  <div className={`text-sm ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>
                    <strong className={`block mb-1 ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>{segment.headline}</strong>
                    <span className="line-clamp-2">{segment.subheadline}</span>
                  </div>
                  {isActive && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Dynamic Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentContent.id}
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-slate-50 rounded-2xl p-6 md:p-10 border border-slate-100"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                    {currentContent.headline}
                  </h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    {currentContent.subheadline}
                  </p>
                  <div className="space-y-3 mt-6">
                    {currentContent.benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-center text-base font-medium text-slate-700"
                      >
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                  <div className="pt-6">
                    <a
                      href={currentContent.ctaLink}
                      className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {currentContent.ctaText}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                  </div>
                </div>

                {/* Mock Dashboard Visual */}
                <div className="relative w-full aspect-[4/3] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden hidden md:block">
                  {/* Header */}
                  <div className="h-12 border-b border-slate-100 flex items-center px-4 space-x-2">
                     <div className="w-3 h-3 rounded-full bg-rose-400" />
                     <div className="w-3 h-3 rounded-full bg-amber-400" />
                     <div className="w-3 h-3 rounded-full bg-emerald-400" />
                     <div className="ml-4 h-4 w-24 bg-slate-100 rounded" />
                  </div>
                  {/* Body */}
                  <div className="p-6 flex space-x-6 h-full">
                     {/* Sidebar */}
                     <div className="w-32 flex flex-col space-y-4 border-r border-slate-100 pr-4">
                        <div className="h-8 w-full bg-indigo-50 rounded" />
                        <div className="h-4 w-3/4 bg-slate-100 rounded" />
                        <div className="h-4 w-5/6 bg-slate-100 rounded" />
                        <div className="h-4 w-4/5 bg-slate-100 rounded" />
                     </div>
                     {/* Main Canvas */}
                     <div className="flex-1 flex flex-col space-y-4">
                        <div className="flex space-x-4">
                           <div className="h-20 flex-1 bg-slate-50 rounded-xl border border-slate-100 p-3">
                              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
                              <div className="h-6 w-12 bg-slate-300 rounded" />
                           </div>
                           <div className="h-20 flex-1 bg-slate-50 rounded-xl border border-slate-100 p-3">
                              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
                              <div className="h-6 w-12 bg-slate-300 rounded" />
                           </div>
                           <div className="h-20 flex-1 bg-slate-50 rounded-xl border border-slate-100 p-3">
                              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
                              <div className="h-6 w-12 bg-indigo-200 rounded" />
                           </div>
                        </div>
                        {/* Chart area */}
                        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 relative overflow-hidden">
                           <svg className="w-full h-full text-indigo-100" viewBox="0 0 100 40" preserveAspectRatio="none">
                              <path d="M0,40 L0,20 Q10,30 20,15 T40,25 T60,10 T80,20 T100,5 L100,40 Z" fill="currentColor" />
                              <polyline points="0,20 20,15 40,25 60,10 80,20 100,5" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500" />
                           </svg>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
