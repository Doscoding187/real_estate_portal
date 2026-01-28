/**
 * TrustSignals Component
 *
 * Displays partner logos and trust statements to build credibility.
 * Features subtle fade-in animations and responsive layout.
 *
 * Requirements: 1.4
 */

import React from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from './design-tokens';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export interface TrustSignal {
  type: 'logo' | 'text';
  content: string;
  imageUrl?: string;
}

export interface TrustSignalsProps {
  signals: TrustSignal[];
}

export const TrustSignals: React.FC<TrustSignalsProps> = ({ signals }) => {
  if (signals.length === 0) {
    return null;
  }

  return (
    <motion.div className="pt-8" variants={staggerContainer} initial="initial" animate="animate">
      {/* "Trusted by" label */}
      <motion.p className="text-sm text-gray-500 text-center lg:text-left mb-4" variants={fadeUp}>
        Trusted by leading property professionals
      </motion.p>

      {/* Trust signals grid */}
      <motion.div
        className="flex flex-wrap items-center justify-center lg:justify-start gap-6"
        variants={staggerContainer}
      >
        {signals.map((signal, index) => (
          <motion.div key={index} variants={staggerItem} className="flex items-center">
            {signal.type === 'logo' && signal.imageUrl ? (
              <div
                className="h-8 px-4 flex items-center justify-center rounded-lg"
                style={{
                  background: softUITokens.colors.neutral.gray50,
                  boxShadow: softUITokens.shadows.soft,
                }}
              >
                <OptimizedImage
                  src={signal.imageUrl}
                  alt={signal.content}
                  priority={true}
                  objectFit="contain"
                  className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
                  sizes="96px"
                />
              </div>
            ) : (
              <div
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600"
                style={{
                  background: softUITokens.colors.neutral.gray50,
                  boxShadow: softUITokens.shadows.soft,
                }}
              >
                {signal.content}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};
