import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, FileText, Globe, Building, CheckCircle2 } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

const channels = [
  { id: 'internal', name: 'Real Estate Portal', icon: Globe, delay: 0.2 },
  { id: 'partner1', name: 'Partner Network Alpha', icon: Building, delay: 0.6 },
  { id: 'partner2', name: 'Global Syndicate', icon: Globe, delay: 1.0 },
  { id: 'social', name: 'Social Distribution', icon: Share2, delay: 1.4 },
];

export const ExtendedNetworkSection: React.FC = () => {
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributedChannels, setDistributedChannels] = useState<string[]>([]);
  
  useEffect(() => {
    if (isDistributing) {
      let timeouts: NodeJS.Timeout[] = [];
      channels.forEach(channel => {
        const timeout = setTimeout(() => {
          setDistributedChannels(prev => [...prev, channel.id]);
        }, channel.delay * 1000);
        timeouts.push(timeout);
      });
      
      const reset = setTimeout(() => {
        setIsDistributing(false);
        setDistributedChannels([]);
      }, 4000);
      timeouts.push(reset);
      
      return () => timeouts.forEach(clearTimeout);
    }
  }, [isDistributing]);

  const handleStartDistribution = () => {
    if (isDistributing) return;
    setDistributedChannels([]);
    setIsDistributing(true);
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Copy */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="order-2 lg:order-1"
          >
            <motion.div variants={staggerItem} className="inline-flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-full mb-6 border border-purple-100">
               <Share2 className="w-4 h-4 text-purple-600" />
               <span className="text-sm font-semibold text-purple-800 uppercase tracking-wider">Extended Distribution</span>
            </motion.div>
            
            <motion.h2 variants={staggerItem} className="text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              One upload. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-500">Infinite reach.</span>
            </motion.h2>
            
            <motion.p variants={staggerItem} className="text-lg md:text-xl text-slate-600 mb-8">
              Why limit yourself to a single platform? Our centralized distribution engine takes your single listing and broadcasts it across our entire digital infrastructure.
            </motion.p>
            
            <motion.ul variants={staggerItem} className="space-y-4 mb-10">
              {['Seamless API synchronization', 'Automated portal distribution', 'Centralized inbound lead management'].map((benefit, i) => (
                 <li key={i} className="flex items-center text-slate-700 font-medium">
                   <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                     <CheckCircle2 className="w-4 h-4 text-purple-600" />
                   </div>
                   {benefit}
                 </li>
              ))}
            </motion.ul>
            
          </motion.div>
          
          {/* Right Column: Visualizer */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2 relative"
          >
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner relative flex flex-col items-center">
               
               {/* Original Listing Node */}
               <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-slate-200 p-6 relative z-20 mb-12">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center space-x-3">
                     <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                       <FileText className="w-5 h-5 text-purple-600" />
                     </div>
                     <div>
                       <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
                       <div className="h-3 w-16 bg-slate-100 rounded" />
                     </div>
                   </div>
                   <button 
                     onClick={handleStartDistribution}
                     disabled={isDistributing}
                     className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center"
                   >
                     {isDistributing ? 'Distributing...' : 'Broadcast'}
                   </button>
                 </div>
                 
                 {/* Decorative mock content */}
                 <div className="h-24 w-full bg-slate-100 rounded-lg mb-3" />
                 <div className="flex space-x-2">
                   <div className="h-3 flex-1 bg-slate-100 rounded" />
                   <div className="h-3 w-1/4 bg-slate-100 rounded" />
                 </div>
               </div>

               {/* Connecting lines and destinations */}
               <div className="relative w-full max-w-md h-40">
                  {channels.map((channel, i) => {
                    const isDistributed = distributedChannels.includes(channel.id);
                    // Distribute across a semi-circle
                    const angle = (i / (channels.length - 1)) * Math.PI - Math.PI; // -180 to 0 degrees
                    const r = 120; // radius
                    const x = r * Math.cos(angle) + 200; // Center X approx offset
                    const y = r * Math.sin(angle) + 120; // Center Y approx offset
                    
                    return (
                      <React.Fragment key={channel.id}>
                        {/* Connecting line SVG */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
                          <path 
                            d={`M 200 0 Q ${x} 50, ${x} ${y}`} 
                            fill="none" 
                            stroke={isDistributed ? '#c084fc' : '#e2e8f0'} 
                            strokeWidth="2" 
                            strokeDasharray="4 4"
                            className="transition-colors duration-500"
                          />
                          <AnimatePresence>
                            {isDistributing && !isDistributed && (
                              <motion.circle 
                                cx={200} cy={0} r={4} fill="#9333ea"
                                animate={{ cx: x, cy: y }}
                                transition={{ duration: channel.delay, ease: "easeInOut" }}
                              />
                            )}
                          </AnimatePresence>
                        </svg>
                        
                        {/* Target Node */}
                        <div 
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                          style={{ left: `${x}px`, top: `${y}px` }}
                        >
                          <motion.div 
                            animate={isDistributed ? { scale: [1, 1.2, 1], borderColor: '#a855f7' } : {}}
                            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500 z-10 bg-white ${isDistributed ? 'border-purple-500 text-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-slate-200 text-slate-400'}`}
                          >
                            <channel.icon className="w-5 h-5" />
                          </motion.div>
                          <div className={`mt-2 text-xs font-medium whitespace-nowrap transition-colors duration-500 ${isDistributed ? 'text-purple-700' : 'text-slate-500'}`}>
                            {channel.name}
                          </div>
                        </div>
                      </React.Fragment>
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
