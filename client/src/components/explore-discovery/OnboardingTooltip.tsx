/**
 * Onboarding Tooltip Component
 * 
 * Displays contextual tooltips for feature education.
 * Implements Requirements 16.10, 16.11, 16.12
 * 
 * Tooltips:
 * - topic_navigation: After 5 items scrolled
 * - partner_content: On first partner content encounter
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OnboardingTooltipProps {
  tooltipId: 'topic_navigation' | 'partner_content';
  isVisible: boolean;
  onDismiss: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  targetRef?: React.RefObject<HTMLElement>;
}

const TOOLTIP_CONFIG = {
  topic_navigation: {
    title: 'Explore Topics',
    message: 'Tap any Topic above to change your view',
    icon: '🔍',
  },
  partner_content: {
    title: 'Partner Content',
    message: 'This is educational content from a verified partner',
    icon: '✨',
  },
};

export function OnboardingTooltip({
  tooltipId,
  isVisible,
  onDismiss,
  position = 'bottom',
  targetRef,
}: OnboardingTooltipProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const config = TOOLTIP_CONFIG[tooltipId];

  // Calculate position relative to target
  useEffect(() => {
    if (targetRef?.current && isVisible) {
      const rect = targetRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - 10;
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 10;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 10;
          break;
      }

      setCoords({ top, left });
    }
  }, [targetRef, isVisible, position]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="fixed z-50"
          style={{
            top: targetRef ? coords.top : 'auto',
            left: targetRef ? coords.left : 'auto',
            transform: targetRef ? 'translate(-50%, 0)' : 'none',
          }}
        >
          <Card className="relative bg-gradient-to-br from-primary to-primary/90 text-white shadow-2xl max-w-xs p-4">
            {/* Arrow */}
            {position === 'bottom' && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45" />
            )}
            {position === 'top' && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45" />
            )}

            {/* Content */}
            <div className="relative flex items-start gap-3">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-2xl"
              >
                {config.icon}
              </motion.div>

              {/* Text */}
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{config.title}</h4>
                <p className="text-sm text-white/90">{config.message}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Dismiss tooltip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Got it Button */}
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={onDismiss}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                Got it
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Floating Tooltip (no target element)
 * Used for general tooltips not anchored to specific elements
 */
interface FloatingTooltipProps {
  tooltipId: 'topic_navigation' | 'partner_content';
  isVisible: boolean;
  onDismiss: () => void;
}

export function FloatingTooltip({
  tooltipId,
  isVisible,
  onDismiss,
}: FloatingTooltipProps) {
  const config = TOOLTIP_CONFIG[tooltipId];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <Card className="bg-gradient-to-br from-primary to-primary/90 text-white shadow-2xl max-w-md p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-3xl"
              >
                {config.icon}
              </motion.div>

              {/* Text */}
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{config.title}</h4>
                <p className="text-sm text-white/90">{config.message}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Dismiss tooltip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Got it Button */}
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={onDismiss}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                Got it
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
