import { motion, AnimatePresence } from 'framer-motion';
import { type ExploreIntent } from '@/lib/exploreIntent';

type ExploreIntentPromptProps = {
  open: boolean;
  onSelect: (intent: ExploreIntent) => void;
  onDismiss?: () => void;
};

const OPTIONS: Array<{ intent: ExploreIntent; label: string; description: string }> = [
  { intent: 'buy', label: 'Buying', description: 'Find homes and opportunities quickly.' },
  { intent: 'sell', label: 'Selling', description: 'See what buyers respond to now.' },
  { intent: 'improve', label: 'Improving', description: 'Get renovation and service ideas.' },
  { intent: 'invest', label: 'Investing', description: 'Prioritize yield and market trends.' },
  { intent: 'learn', label: 'Learning', description: 'Understand the market before acting.' },
];

export function ExploreIntentPrompt({ open, onSelect, onDismiss }: ExploreIntentPromptProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xl rounded-2xl border border-white/20 bg-slate-900/95 p-5 text-white"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
          >
            <h3 className="text-lg font-semibold">What are you here for?</h3>
            <p className="mt-1 text-sm text-white/70">
              We use this to softly prioritize your Explore feed. You can change it later.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OPTIONS.map(option => (
                <button
                  key={option.intent}
                  type="button"
                  onClick={() => onSelect(option.intent)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-left hover:bg-white/10"
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-white/70">{option.description}</div>
                </button>
              ))}
            </div>

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="mt-4 w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Maybe later
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
