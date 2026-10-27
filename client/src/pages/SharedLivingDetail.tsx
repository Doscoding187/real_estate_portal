import { Link } from 'wouter';
import { SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER } from '@shared/sharedLivingDomain';

export default function SharedLivingDetail() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-8">
      <h1 className="text-2xl font-semibold">Shared Living listing</h1>
      <p
        role="status"
        className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      >
        {SHARED_LIVING_CANONICAL_ASSIGNMENT_BLOCKER}
      </p>
      <Link href="/shared-living" className="text-sm font-medium text-emerald-700">
        Back to Shared Living
      </Link>
    </main>
  );
}
