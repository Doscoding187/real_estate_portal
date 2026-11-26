import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { formatRandAmount } from '@/lib/wizardHouseTypes';

export const AGENT_LAND_STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted for review',
  changes_requested: 'Changes requested',
  approved: 'Approved / Live',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

/** The agent's own Land listings. Rendered only when the Land gate is on (caller checks). */
export function AgentLandListings() {
  const [, setLocation] = useLocation();
  const query = trpc.land.myListings.useQuery();
  if (query.isLoading) return <p className="text-sm text-slate-500">Loading your Land listings…</p>;
  if (query.error) return <p role="alert" className="text-sm text-red-700">Your Land listings could not be loaded.</p>;
  const rows = query.data ?? [];
  if (!rows.length) return <p className="text-sm text-slate-500">You have no Land listings yet. Use Land listing to start one.</p>;
  return (
    <ul className="space-y-3">
      {rows.map(row => {
        const price = Number(row.askingPrice);
        return (
          <li key={row.listingId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <p className="font-medium text-slate-900">{row.title}</p>
              <p className="text-sm text-slate-600">
                {[row.city, row.province].filter(Boolean).join(', ')}
                {Number.isFinite(price) && price > 0 ? ` · ${formatRandAmount(price)}` : ''}
              </p>
              <p className="text-xs font-medium text-slate-700" data-testid={`land-state-${row.listingId}`}>
                {AGENT_LAND_STATE_LABELS[row.state] ?? row.state}
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation(`/agent/land/${row.listingId}`)}>
              Open
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
