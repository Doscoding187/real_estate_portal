import React from 'react';
import { motion } from 'framer-motion';
import { Radar, ShieldCheck, Zap, Handshake, ArrowRight } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

interface EngineStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  metric: string;
}

const steps: EngineStep[] = [
  {
    id: 1,
    title: 'Signal Capture',
    description: 'We generate proprietary demand through our localized consumer portals.',
    icon: Radar,
    metric: '100k+ searches/mo',
  },
  {
    id: 2,
    title: 'Intent Verification',
    description: 'Algorithms filter window-shoppers, scoring leads for real purchase intent.',
    icon: ShieldCheck,
    metric: '92% verification rate',
  },
  {
    id: 3,
    title: 'Algorithmic Routing',
    description: 'Leads are distributed instantly to the partners best positioned to close them.',
    icon: Zap,
    metric: '< 2s delivery time',
  },
  {
    id: 4,
    title: 'Acquisition & ROI',
    description: 'You focus on what matters—closing deals and growing your underlying ROI.',
    icon: Handshake,
    metric: '4x average ROI',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem} className="inline-flex items-center space-x-2 bg-indigo-100 px-4 py-2 rounded-full mb-6">
             <Zap className="w-4 h-4 text-indigo-700" />
             <span className="text-sm font-semibold text-indigo-800 uppercase tracking-wider">The Demand Engine</span>
          </motion.div>
          <motion.h2 variants={staggerItem} className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            How we turn traffic into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">your revenue</span>
          </motion.h2>
          <motion.p variants={staggerItem} className="text-lg md:text-xl text-slate-600">
            We don't just sell ad space. We operate a closed-loop acquisition infrastructure built to scale your business predictably.
          </motion.p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Animated Connecting Pipeline for Desktop */}
          <div className="hidden lg:block absolute top-[4.5rem] left-[10%] right-[10%] h-1 bg-slate-200 rounded-full z-0 overflow-hidden">
             <motion.div 
               className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-transparent via-blue-500 to-indigo-500"
               initial={{ x: '-100%' }}
               whileInView={{ x: '100%' }}
               viewport={{ once: false }}
               transition={{ 
                 repeat: Infinity, 
                 duration: 3, 
                 ease: "linear" 
               }}
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.15, type: 'spring', stiffness: 50 }}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Step Node */}
                <div className="w-24 h-24 rounded-2xl bg-white shadow-xl shadow-slate-200/50 mb-8 flex items-center justify-center border border-slate-100 relative transition-transform group-hover:-translate-y-2 duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <step.icon className="w-10 h-10 text-indigo-600 relative z-10" />
                  <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-slate-900 border-4 border-white text-white flex items-center justify-center font-bold text-sm shadow-md z-20">
                    {step.id}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{step.description}</p>
                
                {/* Metric pill */}
                <div className="mt-auto px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100/50 text-indigo-700 font-medium text-sm">
                  {step.metric}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
