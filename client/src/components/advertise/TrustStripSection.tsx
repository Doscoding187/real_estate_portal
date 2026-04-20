import React from 'react';
import { motion } from 'framer-motion';

export interface TrustStripProps {
  badges: string[];
}

export const TrustStripSection: React.FC<TrustStripProps> = ({ badges }) => {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 py-5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {badges.map((badge, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="flex items-center gap-2.5 font-medium text-sm text-slate-600"
          >
            <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
            <span>{badge}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
