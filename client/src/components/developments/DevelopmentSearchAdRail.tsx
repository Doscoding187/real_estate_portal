import { ArrowRight, Boxes, Landmark, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';

/** Clearly labelled preview slots for future sponsored partners. */
export function DevelopmentSearchAdRail() {
  return (
    <aside aria-label="Partner advertising" className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold text-slate-700">Partner advertising</h2>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Sponsored
        </span>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 bg-[#123879] px-4 py-3 text-white">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-200">
              Sponsored placement
            </span>
            <h3 className="mt-0.5 text-sm font-bold leading-tight">Home finance partners</h3>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs leading-4 text-slate-600">
            Space for participating banks and bond originators to reach development buyers.
          </p>
          <Link
            href="/advertise/finance"
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            Advertise in finance <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
            <Boxes className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-700">
              Sponsored placement
            </span>
            <h3 className="text-sm font-bold leading-tight text-slate-900">
              Services for your move
            </h3>
          </div>
        </div>
        <p className="mt-2 text-xs leading-4 text-slate-600">
          A space for moving, home cover, connectivity and furnishing partners.
        </p>
        <Link
          href="/advertise/services"
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
        >
          Advertise a service <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </section>

      <p className="flex items-start gap-2 px-1 text-[11px] leading-4 text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
        Sponsored content will be identified clearly.
      </p>
    </aside>
  );
}
