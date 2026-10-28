import { Link } from 'wouter';
import { SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER } from '@shared/sharedLivingDomain';

export default function SharedLiving() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm font-medium text-emerald-700">Property Listify · Shared Living</p>
        <h1 className="mt-1 text-3xl font-semibold">Shared Living</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Rooms, cottages, granny flats, backyard places and student living will be searchable here
once each listing has a reviewed canonical Place assignment.
        </p>
      </header>

      <p
        role="status"
        className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      >
        {SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER}
      </p>

      <Link
        href="/shared-living/list"
        className="inline-flex rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        List a space
      </Link>
    </main>
  );
}
