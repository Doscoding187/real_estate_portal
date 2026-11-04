import { Helmet } from 'react-helmet-async';

export function MaintenancePage() {
  return (
    <>
      <Helmet>
        <title>We’re upgrading Property Listify</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Helmet>
      <main
        role="status"
        aria-live="polite"
        className="grid min-h-screen place-items-center bg-slate-50 px-6 py-12 text-slate-900"
      >
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white px-8 py-12 text-center shadow-xl shadow-slate-900/5 sm:px-12">
          <div
            aria-hidden="true"
            className="mx-auto mb-6 grid size-13 place-items-center rounded-2xl bg-sky-100 text-2xl font-extrabold text-sky-800"
          >
            P
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            We’re upgrading Property Listify
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-7 text-slate-600 sm:text-lg">
            We’ll be back shortly. Search and listing services are temporarily unavailable while we
            restore the service.
          </p>
          <p className="mt-7 text-sm text-slate-500">Please try again in a few minutes.</p>
        </section>
      </main>
    </>
  );
}
