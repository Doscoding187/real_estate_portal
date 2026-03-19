import { type ExploreIntent } from '@/lib/exploreIntent';

interface ExploreIntentPromptProps {
  open: boolean;
  onSelect: (intent: ExploreIntent) => void | Promise<void>;
  onDismiss: () => void;
}

const INTENT_OPTIONS: Array<{ id: ExploreIntent; label: string; subtitle: string }> = [
  { id: 'buy', label: 'Buy', subtitle: 'Find homes and developments' },
  { id: 'sell', label: 'Sell', subtitle: 'Learn pricing and seller strategy' },
  { id: 'improve', label: 'Improve', subtitle: 'Renovation and services' },
  { id: 'learn', label: 'Learn', subtitle: 'Finance and market education' },
  { id: 'invest', label: 'Invest', subtitle: 'Yield and growth opportunities' },
];

export function ExploreIntentPrompt({ open, onSelect, onDismiss }: ExploreIntentPromptProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-slate-950/95 p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Customize your Explore feed</h2>
            <p className="mt-1 text-sm text-white/70">
              Pick your primary intent. You can change it later.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            Skip
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {INTENT_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                void onSelect(option.id);
              }}
              className="rounded-xl border border-white/15 bg-white/5 p-3 text-left transition hover:border-white/30 hover:bg-white/10"
            >
              <div className="font-medium">{option.label}</div>
              <div className="mt-1 text-xs text-white/70">{option.subtitle}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
