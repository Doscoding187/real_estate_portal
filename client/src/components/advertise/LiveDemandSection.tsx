import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, Search, ArrowRight, MapPin } from 'lucide-react';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';

interface LiveDemandSectionProps {
  onCaptureClick: () => void;
}

const mockActivityFeed = [
  { id: 1, type: 'search', location: 'Downtown', time: 'Just now', tag: 'New', tagColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  { id: 2, type: 'view', location: 'Suburbs', time: '1m ago', tag: 'Hot', tagColor: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  { id: 3, type: 'search', location: 'Waterfront', time: '2m ago', tag: 'Pre-approved', tagColor: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  { id: 4, type: 'contact', location: 'Metro Area', time: '3m ago' },
  { id: 5, type: 'search', location: 'Uptown', time: '5m ago', tag: 'High Intent', tagColor: 'text-rose-400 border-rose-400/30 bg-rose-400/10' },
];

export const LiveDemandSection: React.FC<LiveDemandSectionProps> = ({ onCaptureClick }) => {
  return (
    <section className="py-24 bg-white relative overflow-hidden border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Copy & Stats */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={staggerItem} className="inline-flex items-center space-x-2 bg-rose-50 px-4 py-2 rounded-full mb-6 border border-rose-100">
               <span className="relative flex h-3 w-3 mr-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
               </span>
               <span className="text-sm font-semibold text-rose-700 uppercase tracking-wider">Live Network Activity</span>
            </motion.div>
            
            <motion.h2 variants={staggerItem} className="text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Buyers are active <span className="text-rose-600">right now.</span>
            </motion.h2>
            
            <motion.p variants={staggerItem} className="text-lg md:text-xl text-slate-600 mb-10">
              Stop guessing where the market is. Our portals are capturing live intent and matching it to our partners 24/7.
            </motion.p>
            
            <motion.div variants={staggerItem} className="grid grid-cols-2 gap-6 mb-10">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="text-rose-500 w-5 h-5" />
                  <span className="text-slate-500 font-medium">Last 24h</span>
                </div>
                <div className="text-3xl font-bold text-slate-900">14,203</div>
                <div className="text-sm text-slate-500 mt-1">Active buyers browsing</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-3 mb-2">
                  <Activity className="text-rose-500 w-5 h-5" />
                  <span className="text-slate-500 font-medium">Match Rate</span>
                </div>
                <div className="text-3xl font-bold text-slate-900">4.2M+</div>
                <div className="text-sm text-slate-500 mt-1">Leads delivered to partners</div>
              </div>
            </motion.div>
            
            <motion.button
              variants={staggerItem}
              onClick={onCaptureClick}
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all transform hover:-translate-y-0.5"
            >
              See Market Activity Near You
              <ArrowRight className="ml-2 w-5 h-5" />
            </motion.button>
          </motion.div>
          
          {/* Right Column: Visual Proof Ticker */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
               {/* Map graphic overlay */}
               <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-slate-900 to-slate-900" />
               <div className="absolute top-0 right-0 p-6">
                 <div className="inline-flex items-center space-x-2 bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-700">
                   <div className="w-2 h-2 rounded-full bg-emerald-400" />
                   <span className="text-xs font-mono text-emerald-400">SYS_ONLINE</span>
                 </div>
               </div>
               
               <div className="mt-8 mb-4">
                 <h3 className="text-slate-300 font-medium mb-1">Live Ping Stream</h3>
                 <div className="h-px w-full bg-slate-800" />
               </div>
               
               <div className="space-y-4 max-h-[300px] overflow-hidden relative cursor-pointer group" onClick={onCaptureClick}>
                 {/* Gradient fade out at top/bottom */}
                 <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
                 <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none flex items-end justify-center pb-2">
                   <span className="text-sm font-medium text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 px-4 py-1 rounded-full border border-blue-500/30">
                     Click to unlock full local feed
                   </span>
                 </div>
                 
                 <motion.div
                   animate={{ y: [0, -100] }}
                   transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                   className="space-y-4"
                 >
                   {[...mockActivityFeed, ...mockActivityFeed].map((ping, i) => (
                     <div key={`${ping.id}-${i}`} className="bg-slate-800/50 backdrop-blur border border-slate-700 p-4 rounded-xl flex items-start space-x-4 transition-colors group-hover:border-slate-600">
                       <div className="bg-slate-700/50 p-2 rounded-lg mt-0.5">
                         {ping.type === 'search' ? <Search className="w-4 h-4 text-blue-400" /> : <MapPin className="w-4 h-4 text-emerald-400" />}
                       </div>
                       <div className="flex-1">
                         <div className="flex justify-between items-start mb-1">
                           <div className="flex flex-col">
                             <span className="text-slate-200 font-medium text-sm">
                               {ping.type === 'search' ? 'New Property Search' : 'Listing interaction'}
                             </span>
                             {ping.tag && (
                               <span className={`text-[10px] font-bold mt-1 inline-block px-1.5 py-0.5 rounded border ${ping.tagColor} animate-pulse`}>
                                 {ping.tag}
                               </span>
                             )}
                           </div>
                           <span className="text-slate-400 font-mono text-xs bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50 whitespace-nowrap ml-2 shrink-0">{ping.time}</span>
                         </div>
                         <div className="text-slate-400 font-mono text-xs mt-2">
                           Location: {ping.location}
                         </div>
                       </div>
                     </div>
                   ))}
                 </motion.div>
               </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};
