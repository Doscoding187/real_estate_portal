import { TRUST_STEPS } from '@/features/services/catalog';

export function TrustStepsRow() {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {TRUST_STEPS.map((step, index) => (
        <article key={step.title} className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Step {index + 1}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{step.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{step.description}</p>
        </article>
      ))}
    </section>
  );
}
