// Why this section exists, what it says and its rules: docs/product/homepage/closing-cta.md
import type { MouseEvent } from 'react';
import { ArrowRight, Home, KeyRound } from 'lucide-react';

type CTASectionProps = {
  onBrowse?: () => void;
};

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
      className="home-section bg-white"
    >
      <h2
        id="home-closing-heading"
        className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-900 md:text-3xl"
      >
        Ready when you are.
      </h2>
      <div className="grid overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-xl md:grid-cols-2 md:rounded-[2rem]">
        <div className="flex flex-col bg-blue-50 p-6 text-slate-900 sm:p-8 md:p-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#1f5f94] shadow-sm">
            <Home className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-2xl font-bold md:text-3xl">Looking for a home?</h3>
          <p className="mt-3 flex-1 text-sm leading-6 text-slate-800 md:text-base md:leading-7">
            Search homes for sale and to rent, then contact the agent directly.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/property-for-sale"
              onClick={handleBrowse}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1f5f94] px-7 text-sm font-bold text-white transition hover:bg-[#174d7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5f94] focus-visible:ring-offset-2 md:text-base"
            >
              Browse homes for sale <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="/property-to-rent"
              className="inline-flex min-h-11 items-center justify-center text-sm font-bold text-[#1f5f94] underline underline-offset-4 hover:text-[#174d7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5f94] md:text-base"
            >
              Homes to rent
            </a>
          </div>
        </div>

        <div className="flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-[#0f4c81] p-6 text-white sm:p-8 md:p-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-2xl font-bold md:text-3xl">Have a property to list?</h3>
          <p className="mt-3 flex-1 text-sm leading-6 text-white md:text-base md:leading-7">
            Agents, agencies and developers can see how to list. Owners can find an agent to list
            for them.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/advertise"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-slate-900 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 md:text-base"
            >
              List with us <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="/agents"
              className="inline-flex min-h-11 items-center justify-center text-sm font-bold text-white underline underline-offset-4 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:text-base"
            >
              Find an agent
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
