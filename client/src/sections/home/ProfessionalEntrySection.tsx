import { ArrowRight } from 'lucide-react';

export function ProfessionalEntrySection() {
  return (
    <section
      data-testid="home-professional-entry"
      aria-labelledby="professional-entry-heading"
      className="rounded-[26px] border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-[#0f4c81] px-6 py-8 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:px-10 md:py-10"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            For Agents &amp; Property Professionals
          </p>
          <h2 id="professional-entry-heading" className="mt-3 text-2xl font-bold md:text-3xl">
            Your property business, powered by Property Listify.
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/70 md:text-base">
            Build your professional presence, market your listings, work your enquiries and
            prospect for new business from one operating workspace.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <a
            href="/advertise/sell/agents"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white/90"
          >
            Get Agent Launch Access <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="/agents"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            See agent presences
          </a>
        </div>
      </div>
    </section>
  );
}
