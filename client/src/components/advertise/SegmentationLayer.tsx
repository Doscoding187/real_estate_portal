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
    subheadline: 'Connect with high-intent buyers and close deals faster with our AI-powered matching engine.',
    benefits: ['Verified buyer leads', 'Area exclusivity options', 'Personal branding tools'],
    ctaText: 'Start as Agent',
    ctaLink: '/register/agent'
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: Building2,
    headline: 'Sell Developments Faster',
    subheadline: 'Showcase your projects to millions of verified buyers with premium branding and analytics.',
    benefits: ['3D project showcases', 'Lead pre-qualification', 'Real-time inventory management'],
    ctaText: 'Developer Solutions',
    ctaLink: '/register/developer'
  },
  {
    id: 'seller',
    label: 'Seller',
    icon: Home,
    headline: 'Sell Your Home',
    subheadline: 'List your property directly and reach potential buyers without the hassle.',
    benefits: ['List for free', 'Instant valuation', 'Verified buyer requests'],
    ctaText: 'List Property',
    ctaLink: '/list-property'
  },
  {
    id: 'partner',
    label: 'Partner',
    icon: Handshake,
    headline: 'Grow Your Business',
    subheadline: 'Banks, bond originators, and service providers - reach your target audience effectively.',
    benefits: ['Targeted advertising', 'Service marketplace listing', 'Performance analytics'],
    ctaText: 'Partner With Us',
    ctaLink: '/contact/partner'
  }
];

export const SegmentationLayer: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<SegmentType | null>(null);

  // Default view or specific segment view
  const currentContent = activeSegment
    ? segments.find(s => s.id === activeSegment)!
    : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-12">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            I am a...
          </h2>

          {/* Segment Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {segments.map((segment) => {
              const Icon = segment.icon;
              const isActive = activeSegment === segment.id;

              return (
                <button
                  key={segment.id}
                  onClick={() => setActiveSegment(segment.id)}
                  className={`flex flex-col items-center p-4 rounded-xl transition-all duration-300 border-2 group ${isActive
                      ? 'border-primary-500 bg-primary-50 shadow-md transform scale-105'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                    }`}
                  aria-pressed={isActive}
                >
                  <div className={`p-3 rounded-full mb-3 transition-colors ${isActive ? 'bg-primary-100 text-primary-600' : 'bg-white text-gray-500 group-hover:text-primary-500'
                    }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`font-semibold text-sm md:text-base ${isActive ? 'text-primary-900' : 'text-gray-700'
                    }`}>
                    {segment.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Content Area */}
          <AnimatePresence mode="wait">
            {currentContent ? (
              <motion.div
                key={currentContent.id}
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-gray-50 rounded-xl p-6 md:p-8 border border-gray-100"
              >
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                  <div className="flex-1 space-y-4">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                      {currentContent.headline}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      {currentContent.subheadline}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-4">
                      {currentContent.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center text-sm font-medium text-gray-700 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-auto flex-shrink-0">
                    <a
                      href={currentContent.ctaLink}
                      className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {currentContent.ctaText}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-500 py-4"
              >
                <p>Select your role to see tailored solutions</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};