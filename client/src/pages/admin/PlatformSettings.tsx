import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ADMIN_PAGE_CLASS } from '@/components/admin/adminPageLayout';
import { useAuth } from '@/_core/hooks/useAuth';
import { isSuperAdminRole } from '@/_core/roles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-2 border-b border-slate-100 text-sm">
    <span className="text-slate-600 whitespace-nowrap">{label}</span>
    <span className="font-medium text-slate-900 text-right break-all">{value}</span>
  </div>
);

const Skeleton = () => <div className="h-24 animate-pulse rounded bg-slate-100" />;

const ErrorRetry = ({ what, onRetry }: { what: string; onRetry: () => void }) => (
  <div role="alert" className="flex items-center justify-between gap-3 text-sm text-red-800">
    <span>Could not load {what}.</span>
    <Button variant="outline" onClick={onRetry}>
      Retry
    </Button>
  </div>
);

/** State groups that need an operator, in the order they should be read. */
const EMAIL_STATE_LABELS: Record<string, string> = {
  unknown: 'Outcome unknown',
  permanent_failed: 'Failed permanently',
  retryable_failed: 'Failed, will retry',
  pending: 'Waiting to send',
  claimed: 'Sending now',
};

export function countByState(rows: { state: string; stale?: boolean }[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.state] = (counts[row.state] ?? 0) + 1;
  return counts;
}

export default function PlatformSettings() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isSuperAdmin = isSuperAdminRole(user?.role);

  const activation = trpc.admin.getCommercialActivationStatus.useQuery();
  const email = trpc.admin.getTransactionalEmailBacklog.useQuery();

  if (!isAuthenticated || !isSuperAdmin) {
    setLocation('/login');
    return null;
  }

  const a = activation.data;
  const emailRows = email.data ?? [];
  const emailCounts = countByState(emailRows);
  const stale = emailRows.filter(r => r.stale).length;

  return (
    <div className={`${ADMIN_PAGE_CLASS} space-y-5`}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings and integrations</h1>
        <p className="text-sm text-slate-600">
          Live status of paid access and email delivery. Read-only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paid access</CardTitle>
        </CardHeader>
        <CardContent>
          {activation.isLoading ? (
            <Skeleton />
          ) : activation.isError || !a ? (
            <ErrorRetry what="paid access status" onRetry={() => activation.refetch()} />
          ) : (
            <div>
              <Row
                label="Mode"
                value={a.status === 'preparation_only' ? 'Preparation only (paid access off)' : 'Live'}
              />
              <Row label="Paid products enabled" value={a.enabled ? 'Yes' : 'No'} />
              <Row label="New sales" value={a.salesPaused ? 'Paused' : 'Open'} />
              <Row
                label="Enabled products"
                value={a.enabledProductKeys?.length ? a.enabledProductKeys.join(', ') : 'None'}
              />
              <Row label="Release" value={a.releaseId || 'Not set'} />
              <Row label="Build" value={a.buildSha} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email delivery</CardTitle>
        </CardHeader>
        <CardContent>
          {email.isLoading ? (
            <Skeleton />
          ) : email.isError ? (
            <ErrorRetry what="the email backlog" onRetry={() => email.refetch()} />
          ) : emailRows.length === 0 ? (
            <p className="text-sm text-slate-700">No emails are waiting or failing. All clear.</p>
          ) : (
            <div>
              {Object.entries(EMAIL_STATE_LABELS)
                .filter(([state]) => emailCounts[state])
                .map(([state, label]) => (
                  <div
                    key={state}
                    className="flex items-center justify-between py-2 border-b border-slate-100 text-sm"
                  >
                    <span className="text-slate-700">{label}</span>
                    <Badge variant={state === 'permanent_failed' || state === 'unknown' ? 'destructive' : 'secondary'}>
                      {emailCounts[state]}
                    </Badge>
                  </div>
                ))}
              {stale > 0 ? (
                <p className="text-sm text-amber-900 mt-3">
                  {stale} {stale === 1 ? 'email has' : 'emails have'} been waiting longer than
                  expected.
                </p>
              ) : null}
              {emailRows.length >= 200 ? (
                <p className="text-xs text-slate-600 mt-2">Showing the oldest 200.</p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 text-sm text-slate-700">
          Platform toggles (featured listings, upload limits, support email and similar) are not
          offered here because no part of the platform reads them yet. They return when they are
          wired to real behaviour.
        </CardContent>
      </Card>
    </div>
  );
}
