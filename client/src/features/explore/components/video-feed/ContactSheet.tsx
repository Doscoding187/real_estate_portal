import { X } from 'lucide-react';
import type { ExploreCtaType } from './types';

export interface ContactAction {
  label: string;
  value: string;
  href: string;
  ctaType: ExploreCtaType;
}

interface ContactSheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  actions: ContactAction[];
  primaryActionLabel?: string;
  primaryActionType?: ExploreCtaType;
  onClose: () => void;
  onCtaClick: (ctaType: ExploreCtaType) => void;
}

export function ContactSheet({
  open,
  title,
  subtitle,
  actions,
  primaryActionLabel,
  primaryActionType,
  onClose,
  onCtaClick,
}: ContactSheetProps) {
  return (
    <>
      <button
        aria-label="Close contact sheet"
        onClick={onClose}
        className={`absolute inset-0 z-[59] bg-black/35 transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 z-[60] rounded-t-3xl border-t border-white/20 bg-slate-950 text-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
      >
        <div className="max-h-[42vh] overflow-y-auto p-4">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/25" />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Contact</p>
              <p className="text-base font-semibold">{title}</p>
              {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Close contact details">
              <X className="h-5 w-5 text-white/80" />
            </button>
          </div>

          <div className="space-y-2">
            {actions.map(action => (
              <a
                key={action.ctaType}
                href={action.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm"
                onClick={() => onCtaClick(action.ctaType)}
              >
                <span className="font-medium">{action.label}</span>
                <span className="text-xs text-white/70">{action.value}</span>
              </a>
            ))}
          </div>

          {primaryActionLabel && primaryActionType && (
            <button
              onClick={() => onCtaClick(primaryActionType)}
              className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
            >
              {primaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
