import React from 'react';
import { motion } from 'framer-motion';
import { Network, Home, Building2, UserCircle, Globe, ChevronRight } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

interface EcosystemNode {
  id: string;
  type: 'consumer' | 'partner' | 'infrastructure';
  title: string;
  description: string;
  icon: React.ElementType;
}

const ecosystemNodes: EcosystemNode[] = [
  {
    id: 'consumer-portal',
    type: 'consumer',
    title: 'Consumer Portals',
    description: 'Millions of monthly active home buyers and renters searching our consumer-facing platforms.',
    icon: Globe,
  },
  {
    id: 'data-engine',
    type: 'infrastructure',
    title: 'Core Infrastructure',
    description: 'Our proprietary engine matches search behavior, verifies intent, and routes leads algorithmically.',
    icon: Network,
  },
  {
    id: 'partner-network',
    type: 'partner',
    title: 'Partner Network',
    description: 'Agents, agencies, and developers receiving high-intent leads directly into their pipeline.',
    icon: Building2,
  }
];

export const EcosystemSection: React.FC = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem} className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full mb-6">
             <Network className="w-4 h-4 text-blue-700" />
             <span className="text-sm font-semibold text-blue-800 uppercase tracking-wider">The Ecosystem</span>
          </motion.div>
          <motion.h2 variants={staggerItem} className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
             Don't buy ads. <br className="hidden md:block" />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Plug into the grid.</span>
          </motion.h2>
          <motion.p variants={staggerItem} className="text-lg md:text-xl text-slate-600 mb-6">
             You're not buying ads. You're buying access to active property demand. Every buyer in this system creates multiple monetization opportunities.
          </motion.p>
          <motion.div variants={staggerItem} className="inline-flex items-start text-left sm:items-center sm:text-center space-x-3 bg-emerald-50 px-5 py-3 rounded-xl border border-emerald-100">
             <span className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
               <span className="text-sm font-bold">3x</span>
             </span>
             <span className="text-sm font-medium text-emerald-800">
               <strong className="font-bold text-emerald-900">Multiplier Effect:</strong> One user generates 3-5 revenue events across agents, banks, attorneys, and service providers.
             </span>
          </motion.div>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Ecosystem Visual map */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative">
            
            {/* Consumer Node */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex-1 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 text-center relative z-10 hover:border-blue-300 transition-colors"
            >
              <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
                 <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{ecosystemNodes[0].title}</h3>
              <p className="text-slate-600 text-sm">{ecosystemNodes[0].description}</p>
              <div className="mt-4 flex justify-center space-x-2">
                <Home className="w-5 h-5 text-slate-400" />
                <UserCircle className="w-5 h-5 text-slate-400" />
              </div>
            </motion.div>

            {/* Connecting Arrow 1 */}
            <div className="hidden md:flex flex-col items-center justify-center w-24">
              <div className="w-full h-0.5 bg-gradient-to-r from-blue-200 to-indigo-300 relative">
                <motion.div 
                  initial={{ left: 0 }}
                  animate={{ left: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
                />
              </div>
              <ChevronRight className="text-indigo-300 mt-2" />
            </div>
            
            {/* Arrow for mobile */}
            <div className="md:hidden flex justify-center py-2">
               <ChevronRight className="text-indigo-300 rotate-90 w-8 h-8" />
            </div>

            {/* Core Infrastructure Node */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center relative z-20 transform md:scale-110"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-6 relative z-10 border border-slate-600">
                 <Network className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 relative z-10">{ecosystemNodes[1].title}</h3>
              <p className="text-slate-400 text-sm relative z-10">{ecosystemNodes[1].description}</p>
            </motion.div>

            {/* Connecting Arrow 2 */}
            <div className="hidden md:flex flex-col items-center justify-center w-24">
              <div className="w-full h-0.5 bg-gradient-to-r from-indigo-300 to-emerald-200 relative">
                <motion.div 
                  initial={{ left: 0 }}
                  animate={{ left: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.75 }}
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
                />
              </div>
              <ChevronRight className="text-emerald-300 mt-2" />
            </div>
            
            {/* Arrow for mobile */}
            <div className="md:hidden flex justify-center py-2">
               <ChevronRight className="text-emerald-300 rotate-90 w-8 h-8" />
            </div>

            {/* Partner Node */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex-1 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 text-center relative z-10 hover:border-emerald-300 transition-colors"
            >
              <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                 <Building2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{ecosystemNodes[2].title}</h3>
              <p className="text-slate-600 text-sm">{ecosystemNodes[2].description}</p>
              <div className="mt-4 flex justify-center">
                 <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded">You are here</span>
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </section>
  );
};
