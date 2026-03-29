import { motion, AnimatePresence } from 'framer-motion';
import { type ExploreIntent } from '@/lib/exploreIntent';

type ExploreIntentPromptProps = {
  open: boolean;
  onSelect: (intent: ExploreIntent) => void | Promise<void>;
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
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-4 sm:items-center"
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
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Customize your Explore feed</h3>
                <p className="mt-1 text-sm text-white/70">
                  Pick your primary intent. You can change it later.
                </p>
              </div>
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Skip
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OPTIONS.map(option => (
                <button
                  key={option.intent}
                  type="button"
                  onClick={() => {
                    void onSelect(option.intent);
                  }}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-left transition hover:border-white/30 hover:bg-white/10"
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-white/70">{option.description}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
