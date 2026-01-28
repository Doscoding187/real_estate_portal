import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * OfflineIndicator Component
 *
 * Displays a banner when the user goes offline and shows a reconnection message
 * when they come back online. Uses smooth animations for transitions.
 *
 * Features:
 * - Auto-detects online/offline status
 * - Smooth slide-in/out animations
 * - Shows cached content availability message
 * - Auto-dismisses reconnection message after 3 seconds
 *
 * @example
 * ```tsx
 * <OfflineIndicator />
 * ```
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = React.useState(false);
  const [wasOffline, setWasOffline] = React.useState(false);

  React.useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      // Show reconnected message
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3">
            <WifiOff className="w-5 h-5" />
            <p className="text-sm font-medium">You're offline. Showing cached content.</p>
          </div>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white shadow-lg"
          role="alert"
          aria-live="polite"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3">
            <Wifi className="w-5 h-5" />
            <p className="text-sm font-medium">Back online! Content updated.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
