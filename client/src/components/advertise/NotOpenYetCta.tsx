/**
 * Non-clickable replacement for the sign-up CTA on role landing pages that are
 * held at launch (currently agency and developer). Not a link.
 */
export function NotOpenYetCta({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const dark = tone === 'dark';
  return (
    <div data-testid="cta-not-open-yet" className="flex flex-col gap-2">
      <span
        aria-disabled="true"
        className={`inline-flex w-fit items-center rounded-2xl border px-5 py-3.5 text-sm font-bold ${
          dark ? 'border-white/30 bg-white/10 text-white/80' : 'border-slate-300 bg-slate-100 text-slate-600'
        }`}
      >
        Not open yet
      </span>
      <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
        Buyer, agent and service-provider registration is open.
      </span>
    </div>
  );
}
