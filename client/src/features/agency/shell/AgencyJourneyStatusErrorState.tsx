import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** A status request failure must not impersonate an Agency setup state. */
export function AgencyJourneyStatusErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="mx-auto w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-7 text-center shadow-sm">
      <AlertTriangle className="mx-auto h-7 w-7 text-amber-700" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-bold text-slate-950">
        We could not confirm your Agency workspace
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Your people, inventory and opportunities have not been changed. Check your connection and
        try again; if this keeps happening, contact Property Listify support.
      </p>
      <Button className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </section>
  );
}
