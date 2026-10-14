import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function AgentPresenceProof() {
  const query = trpc.agent.getPresenceSummary.useQuery(undefined, { retry: false });
  const summary = query.data;
  const metrics = summary
    ? [
        { label: 'Profile visits', value: summary.profileViews },
        { label: 'WhatsApp clicks', value: summary.whatsappClicks },
        { label: 'Listing taps', value: summary.listingTaps },
        { label: 'Contact actions', value: summary.contactActions },
        { label: 'Area guide opens', value: summary.areaGuideOpens },
        { label: 'Profile shares', value: summary.shares },
      ]
    : [];

  return (
    <section
      data-testid="agent-presence-proof"
      aria-label="Profile activity"
      className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Profile activity</h2>
        <span className="text-xs text-muted-foreground">Last 30 days</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Recorded visits and actions on your public agent profile.
      </p>
      {query.isError ? (
        <div role="alert" className="mt-3 text-sm">
          <p>We couldn’t load profile activity.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.isLoading || !summary ? (
        <div role="status" aria-label="Loading profile activity" className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
            {metrics.map(metric => (
              <div
                key={metric.label}
                className="flex items-center justify-between gap-2 border-b border-border pb-2"
              >
                <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                <dd className="text-base font-semibold tabular-nums">{metric.value}</dd>
              </div>
            ))}
          </dl>
          {summary.totalInteractions === 0 && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              No recorded interactions yet. Once your profile is public, share its link to help
              people find you.
            </p>
          )}
        </>
      )}
    </section>
  );
}
