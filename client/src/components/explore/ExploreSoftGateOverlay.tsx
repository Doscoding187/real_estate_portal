import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';

interface ExploreSoftGateOverlayProps {
  open: boolean;
  message?: string;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
  scope?: 'screen' | 'stage';
  className?: string;
  dismissalSessionKey?: string;
}

const DEFAULT_DISMISSAL_KEY = 'explore:soft_gate:dismissed:v1';

function readDismissedFromSession(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(key) === '1';
}

export function ExploreSoftGateOverlay({
  open,
  message = 'Create your free account to keep exploring.',
  onClose,
  onLogin,
  onSignup,
  scope = 'screen',
  className = '',
  dismissalSessionKey = DEFAULT_DISMISSAL_KEY,
}: ExploreSoftGateOverlayProps) {
  const [dismissedInSession, setDismissedInSession] = useState(() =>
    readDismissedFromSession(dismissalSessionKey),
  );

  const shouldRender = useMemo(() => open && !dismissedInSession, [open, dismissedInSession]);

  const handleContinueAsGuest = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(dismissalSessionKey, '1');
    }
    setDismissedInSession(true);
    onClose();
  };

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          className={`${scope === 'stage' ? 'absolute' : 'fixed'} inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-950/95 p-5 text-white"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
          >
            <h3 className="text-lg font-semibold">Keep exploring</h3>
            <p className="mt-2 text-sm text-white/75">{message}</p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onSignup}
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Create account
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="rounded-xl border border-white/25 px-3 py-2 text-sm font-semibold text-white"
              >
                Log in
              </button>
            </div>

            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="mt-3 w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Continue as guest
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
