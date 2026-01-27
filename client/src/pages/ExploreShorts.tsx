/**
 * ExploreShorts Page - Refactored
 *
 * TikTok-inspired vertical video feed with smooth swipe interactions
 * and modern glass overlay controls.
 *
 * Features:
 * - Enhanced video playback with viewport detection
 * - Smooth swipe gestures for navigation
 * - Glass overlay controls with modern design
 * - TikTok-style interactions (double-tap to like, swipe to navigate)
 * - Responsive design for mobile and desktop
 *
 * Requirements: 2.1, 2.5, 9.4
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShortsContainer } from '@/components/explore/ShortsContainer';
import { FeedType } from '@/../../shared/types';
import { ArrowLeft, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { designTokens } from '@/lib/design-tokens';
import { buttonVariants } from '@/lib/animations/exploreAnimations';

export default function ExploreShorts() {
  const [, setLocation] = useLocation();
  const [feedType] = useState<FeedType>('recommended');
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Modern Glass Overlay Controls - Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center justify-between p-4 pointer-events-auto">
          {/* Back button - Modern Glass Design */}
          <motion.button
            onClick={() => setLocation('/')}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className="p-3 rounded-full text-white shadow-xl"
            style={{
              background: designTokens.colors.glass.bgDark,
              backdropFilter: designTokens.colors.glass.backdrop,
              border: `1px solid ${designTokens.colors.glass.borderDark}`,
            }}
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>

          {/* Upload button - Modern Glass Design with Gradient */}
          {isAuthenticated && (
            <motion.button
              onClick={() => setLocation('/explore/upload')}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold shadow-xl"
              style={{
                background:
                  'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)',
                backdropFilter: designTokens.colors.glass.backdrop,
                border: `1px solid ${designTokens.colors.glass.border}`,
              }}
              aria-label="Upload content"
            >
              <Upload className="w-5 h-5" />
              <span>Upload</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Shorts container with enhanced video components */}
      <ShortsContainer feedType={feedType} />

      {/* Swipe hint for first-time users - Fades out after 3 seconds */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
        >
          <motion.div
            animate={{
              y: [0, 10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: 2,
              ease: 'easeInOut',
            }}
            className="flex flex-col items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium"
            style={{
              background: designTokens.colors.glass.bgDark,
              backdropFilter: designTokens.colors.glass.backdrop,
              border: `1px solid ${designTokens.colors.glass.borderDark}`,
            }}
          >
            <div className="flex items-center gap-2">
              <span>↑</span>
              <span>Swipe up for next</span>
              <span>↑</span>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
