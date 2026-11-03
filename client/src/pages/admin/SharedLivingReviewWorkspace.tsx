import { SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER } from '@shared/sharedLivingDomain';

export default function SharedLivingReviewWorkspace() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Operations · Shared Living</p>
        <h1 className="mt-1 text-2xl font-semibold">Listing review</h1>
      </header>
      <p
        role="status"
        className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      >
        {SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER}
      </p>
    </main>
  );
}
