// Why this section exists, what it says and its rules: docs/product/homepage/closing-cta.md
import type { MouseEvent } from 'react';
import { ArrowRight, Home, KeyRound } from 'lucide-react';

type CTASectionProps = {
  onBrowse?: () => void;
};

/** Simple original skyline: a few rooftops in outline, used as quiet decoration. */
function Rooftops({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 240 80" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 76V44l18-14 18 14v32M40 76V30l22-20 22 20v46M84 76V50l16-12 16 12v26M116 76V36l20-16 20 16v40M156 76V54l14-10 14 10v22M184 76V40l18-14 18 14v36M2 76h236"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CTASection({ onBrowse }: CTASectionProps) {
  const handleBrowse = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onBrowse || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onBrowse();
  };

  return (
    <section
      data-testid="home-closing-cta"
      aria-labelledby="home-closing-heading"
      className="mb-6 mt-14 md:mb-10 md:mt-24"
    >
      <div className="mx-auto mb-7 max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f5f94]">
          Start with Property Listify
        </p>
        <h2
          id="home-closing-heading"
          className="mt-3 text-[1.75rem] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl md:text-[2.75rem]"
        >
          Ready when you are.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <div className="relative flex flex-col overflow-hidden rounded-[1.75rem] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6 text-slate-900 shadow-xl shadow-blue-900/10 sm:p-8 md:rounded-[2rem] md:p-12">
          <Rooftops className="pointer-events-none absolute -bottom-2 -right-4 w-56 text-[#2774AE]/15 md:w-72" />
          <div className="relative flex flex-1 flex-col">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f5f94] text-white shadow-lg shadow-blue-900/20">
              <Home className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-[1.75rem] font-bold leading-tight tracking-tight md:text-4xl">
              Looking for a home?
            </h3>
            <p className="mt-3 flex-1 text-base leading-7 text-slate-800 md:text-lg md:leading-8">
              Search homes for sale and to rent, then contact the agent directly.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <a
                href="/property-for-sale"
                onClick={handleBrowse}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1f5f94] px-8 text-base font-bold text-white shadow-lg shadow-blue-900/25 transition hover:bg-[#174d7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5f94] focus-visible:ring-offset-2"
              >
                Browse homes for sale <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="/property-to-rent"
                className="inline-flex min-h-11 items-center justify-center text-base font-bold text-[#1f5f94] underline underline-offset-4 hover:text-[#174d7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5f94]"
              >
                Homes to rent
              </a>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-950 via-[#0b2a4a] to-[#0f4c81] p-6 text-white shadow-xl shadow-slate-900/30 sm:p-8 md:rounded-[2rem] md:p-12">
          <Rooftops className="pointer-events-none absolute -bottom-2 -right-4 w-56 text-white/10 md:w-72" />
          <div className="relative flex flex-1 flex-col">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300 text-amber-950 shadow-lg shadow-black/20">
              <KeyRound className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-[1.75rem] font-bold leading-tight tracking-tight md:text-4xl">
              Have a property to list?
            </h3>
            <p className="mt-3 flex-1 text-base leading-7 text-white md:text-lg md:leading-8">
              Agents, agencies, developers and service businesses can see how to list. Owners can
              find an agent to list for them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <a
                href="/advertise"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-bold text-slate-900 shadow-lg shadow-black/25 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                List with us <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="/agents"
                className="inline-flex min-h-11 items-center justify-center text-base font-bold text-white underline underline-offset-4 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Find an agent
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
