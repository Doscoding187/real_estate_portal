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

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExploreIntentPrompt } from '@/components/explore/ExploreIntentPrompt';
import { ExploreSoftGateOverlay } from '@/components/explore/ExploreSoftGateOverlay';
import { FeedType } from '@/../../shared/types';
import { ArrowLeft, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { designTokens } from '@/lib/design-tokens';
import { buttonVariants } from '@/lib/animations/exploreAnimations';
import { useExploreIntent } from '@/hooks/useExploreIntent';
import { canUploadToExploreRole } from '@/lib/exploreUploadAccess';
import { TrpcFeedProvider } from '@/features/explore/components/video-feed/TrpcFeedProvider';
import { MockFeedProvider } from '@/features/explore/components/video-feed/MockFeedProvider';
import { shouldUseMockFeedProvider } from '@/lib/exploreMockMode';

interface ExploreGateState {
  seenContentIds: string[];
  lastIndex: number;
  lastContentId?: string;
  ts: number;
}

const SOFT_GATE_SESSION_KEY = 'explore:soft_gate:v1';
const WATCH_LIMIT = 4;

function readGateState(): ExploreGateState {
  if (typeof window === 'undefined') {
    return { seenContentIds: [], lastIndex: 0, ts: Date.now() };
  }
  try {
    const raw = window.sessionStorage.getItem(SOFT_GATE_SESSION_KEY);
    if (!raw) return { seenContentIds: [], lastIndex: 0, ts: Date.now() };
    const parsed = JSON.parse(raw) as Partial<ExploreGateState>;
    return {
      seenContentIds: Array.isArray(parsed.seenContentIds)
        ? parsed.seenContentIds.map(String).slice(0, 128)
        : [],
      lastIndex: Number.isFinite(parsed.lastIndex) ? Number(parsed.lastIndex) : 0,
      lastContentId: typeof parsed.lastContentId === 'string' ? parsed.lastContentId : undefined,
      ts: Number.isFinite(parsed.ts) ? Number(parsed.ts) : Date.now(),
    };
  } catch {
    return { seenContentIds: [], lastIndex: 0, ts: Date.now() };
  }
}

function writeGateState(state: ExploreGateState) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SOFT_GATE_SESSION_KEY, JSON.stringify(state));
}

export default function ExploreShorts() {
  const [, setLocation] = useLocation();
  const [feedType] = useState<FeedType>('recommended');
  const { isAuthenticated, user } = useAuth();
  const canUploadToExplore = canUploadToExploreRole(user?.role);
  const { intent, shouldShowPrompt, setIntent, dismissPrompt } = useExploreIntent();
  const useMockProvider = shouldUseMockFeedProvider();
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [gateState, setGateState] = useState<ExploreGateState>(() => readGateState());
  const initialIndex = useMemo(() => Math.max(0, gateState.lastIndex || 0), [gateState.lastIndex]);

  const handleGuestWatch = (contentId: string, index: number) => {
    if (isAuthenticated) return;
    setGateState(previous => {
      const seen = previous.seenContentIds.includes(contentId)
        ? previous.seenContentIds
        : [...previous.seenContentIds, contentId];
      const next: ExploreGateState = {
        seenContentIds: seen,
        lastIndex: Math.max(0, index),
        lastContentId: contentId,
        ts: Date.now(),
      };
      writeGateState(next);
      if (next.seenContentIds.length >= WATCH_LIMIT) {
        setShowSoftGate(true);
      }
      return next;
    });
  };

  const triggerSoftGate = () => {
    if (!isAuthenticated) {
      setShowSoftGate(true);
    }
  };

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
            onClick={() => setLocation('/explore/home')}
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
          {isAuthenticated && canUploadToExplore && (
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

      {useMockProvider ? (
        <MockFeedProvider
          feedType={feedType}
          intent={intent}
          isAuthenticated={isAuthenticated}
          initialIndex={initialIndex}
          onGuestWatch={handleGuestWatch}
          onGateTrigger={triggerSoftGate}
        />
      ) : (
        <TrpcFeedProvider
          feedType={feedType}
          intent={intent}
          isAuthenticated={isAuthenticated}
          initialIndex={initialIndex}
          onGuestWatch={handleGuestWatch}
          onGateTrigger={triggerSoftGate}
        />
      )}

      <ExploreIntentPrompt
        open={shouldShowPrompt}
        onSelect={nextIntent => {
          void setIntent(nextIntent);
        }}
        onDismiss={dismissPrompt}
      />

      <ExploreSoftGateOverlay
        open={showSoftGate}
        onClose={() => setShowSoftGate(false)}
        onLogin={() => setLocation('/login')}
        onSignup={() => setLocation('/get-started')}
      />

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
