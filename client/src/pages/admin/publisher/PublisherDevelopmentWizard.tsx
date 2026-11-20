import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import CreateDevelopment from '@/pages/CreateDevelopment';

/**
 * Admin-shell host for the development wizard. A super admin must have chosen
 * the publisher first (persisted context) or arrive with an explicit
 * cataloguePublisherId; otherwise ask for the publisher instead of opening a
 * wizard that can only fail at publish time.
 */
export default function PublisherDevelopmentWizard() {
  const [, setLocation] = useLocation();
  const { context } = usePublisherContext();
  const queryPublisherId = Number.parseInt(
    new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get(
      'cataloguePublisherId',
    ) ?? '',
    10,
  );
  const contextPublisherId = context?.cataloguePublisherId;
  const hasQueryPublisher = Number.isFinite(queryPublisherId) && queryPublisherId > 0;
  const mismatch = hasQueryPublisher && contextPublisherId !== queryPublisherId;

  if (contextPublisherId && !mismatch) return <CreateDevelopment />;

  return (
    <div className="flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-soft">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">
          {mismatch
            ? 'This development belongs to another publisher — choose it first'
            : 'Choose which publisher this development is for'}
        </h1>
        <p className="mb-6 text-slate-600">
          Pick a publisher brand first, then come back to build the development under it.
        </p>
        <Button onClick={() => setLocation('/admin/publisher')}>Choose a publisher</Button>
      </div>
    </div>
  );
}
