import { useEffect, useMemo, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
import { ListingNavbar } from '@/components/ListingNavbar';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

type StatusFilter = 'needs_docs' | 'all';
type ManagerDevelopmentDealLane = 'sale' | 'rent' | 'auction';

export function normalizeManagerDevelopmentDealLane(
  transactionType: unknown,
): ManagerDevelopmentDealLane {
  const normalized = String(transactionType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'rent' || normalized === 'for_rent' || normalized === 'to_rent') {
    return 'rent';
  }
  if (normalized === 'auction' || normalized === 'on_auction') return 'auction';
  return 'sale';
}

export function getManagerDevelopmentDealCopy(transactionType: unknown) {
  const lane = normalizeManagerDevelopmentDealLane(transactionType);

  if (lane === 'rent') {
    return {
      transactionType: lane,
      laneLabel: 'Rental referral',
      participantLabel: 'Renter',
      unknownParticipant: 'Renter unknown',
      documentsDescription: 'Rental referrals that still need document processing',
    };
  }

  if (lane === 'auction') {
    return {
      transactionType: lane,
      laneLabel: 'Auction referral',
      participantLabel: 'Bidder',
      unknownParticipant: 'Bidder unknown',
      documentsDescription: 'Auction referrals that still need document processing',
    };
  }

  return {
    transactionType: lane,
    laneLabel: 'Sale referral',
    participantLabel: 'Buyer',
    unknownParticipant: 'Buyer unknown',
    documentsDescription: 'Sale referrals that still need document processing',
  };
}

function formatHandoffStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    linked_only: 'Linked',
    review_requested: 'Developer review requested',
    stage_transition_requested: 'Stage review requested',
  };
  return labels[String(value || '').trim()] || 'DLE handoff';
}

function formatHandoffContext(transactionType?: string | null): string {
  const normalized = String(transactionType || '').trim().toLowerCase();
  if (normalized === 'for_rent' || normalized === 'rent' || normalized === 'rental') {
    return 'Rental referral review';
  }
  if (normalized === 'auction') return 'Auction referral review';
  if (normalized === 'for_sale' || normalized === 'sale') return 'Sale referral review';
  return 'Referral review';
}

function formatHandoffTime(value?: string | null): string {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function ManagerDevelopmentDealsPage() {
  const [match, params] = useRoute('/distribution/manager/developments/:developmentId');
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('needs_docs');

  const developmentId = Number(params?.developmentId || 0);
  const utils = trpc.useUtils();

  const acknowledgeHandoffMutation = trpc.distribution.manager.acknowledgeDleHandoff.useMutation({
    onSuccess: () => {
      toast.success('DLE handoff acknowledged.');
      void utils.distribution.manager.listDealsForDevelopment.invalidate({
        developmentId,
        statusFilter,
        limit: 200,
      });
    },
    onError: error => {
      toast.error(error.message || 'DLE handoff could not be acknowledged.');
    },
  });

  const assignedDevelopmentsQuery = trpc.distribution.manager.getAssignedDevelopments.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      retry: false,
    },
  );

  const dealsQuery = trpc.distribution.manager.listDealsForDevelopment.useQuery(
    {
      developmentId,
      statusFilter,
      limit: 200,
    },
    {
      enabled: isAuthenticated && match && developmentId > 0,
    },
  );

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    if (!match) {
      setLocation('/distribution/manager/developments');
    }
  }, [isAuthenticated, loading, match, setLocation]);

  const developmentLabel = useMemo(() => {
    const selected = (assignedDevelopmentsQuery.data || []).find(
      (item: any) => Number(item.developmentId) === developmentId,
    );
    return selected
      ? `${selected.developmentName} (${selected.city || 'Unknown city'})`
      : `Development #${developmentId}`;
  }, [assignedDevelopmentsQuery.data, developmentId]);

  if (loading || assignedDevelopmentsQuery.isLoading || dealsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-24">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Development Referrals</CardTitle>
            <CardDescription>{developmentLabel}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/distribution/manager/developments')}>
              Back to Developments
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              Filter
              <select
                className="h-9 rounded border border-input bg-background px-2"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="needs_docs">Needs docs</option>
                <option value="all">All referrals</option>
              </select>
            </label>
          </CardContent>
        </Card>

        {dealsQuery.error ? (
          <Card>
            <CardContent className="py-8 text-sm text-red-600">{dealsQuery.error.message}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Referrals</CardTitle>
            <CardDescription>
              {statusFilter === 'needs_docs'
                ? 'Referrals that still need document processing'
                : 'All referrals for this development'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(dealsQuery.data || []).map((deal: any) => {
              const pendingRequired = Number(deal.docs.requiredCount) - Number(deal.docs.verifiedRequiredCount);
              const needsAttention = pendingRequired > 0 || Boolean(deal.docs.hasRejections);
              const handoff = deal.latestDleHandoff;
              const dealCopy = getManagerDevelopmentDealCopy(
                deal.transactionType || handoff?.transactionType,
              );

              return (
                <div
                  key={deal.dealId}
                  className="w-full rounded border bg-white p-3 text-left hover:border-blue-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{deal.dealRef}</p>
                        <Badge variant="outline">{dealCopy.laneLabel}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {dealCopy.participantLabel}: {deal.buyerName || dealCopy.unknownParticipant} |{' '}
                        {deal.createdAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {deal.docs.verifiedRequiredCount}/{deal.docs.requiredCount} verified
                      </Badge>
                      <Badge variant={needsAttention ? 'destructive' : 'default'}>
                        {needsAttention ? 'Needs attention' : 'On track'}
                      </Badge>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setLocation(`/distribution/manager/deals/${Number(deal.dealId)}`)}
                      >
                        Open Checklist
                      </Button>
                    </div>
                  </div>
                  {handoff ? (
                    <div
                      className="mt-3 rounded border border-cyan-100 bg-cyan-50 p-2"
                      data-testid={`dle-manager-handoff-readback-${deal.dealId}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{formatHandoffStatus(handoff.status)}</Badge>
                        <Badge variant="secondary">
                          {formatHandoffContext(handoff.transactionType)}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatHandoffTime(handoff.eventAt)}
                        </span>
                      </div>
                      {handoff.note ? (
                        <p className="mt-1 text-xs text-slate-700">{handoff.note}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {handoff.acknowledgedAt ? (
                          <div
                            className="flex flex-wrap items-center gap-2 text-xs text-emerald-700"
                            data-testid={`dle-manager-handoff-acknowledged-${deal.dealId}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">Acknowledged</span>
                            <span className="text-slate-500">
                              {formatHandoffTime(handoff.acknowledgedAt)}
                            </span>
                            {handoff.acknowledgementNote ? (
                              <span className="basis-full text-slate-700">
                                {handoff.acknowledgementNote}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <Button
                            data-testid={`dle-manager-handoff-ack-${deal.dealId}`}
                            disabled={acknowledgeHandoffMutation.isPending}
                            onClick={() =>
                              acknowledgeHandoffMutation.mutate({
                                dealId: Number(deal.dealId),
                                handoffEventId: Number(handoff.id),
                              })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {acknowledgeHandoffMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {!dealsQuery.error && !(dealsQuery.data || []).length ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No referrals found for this filter.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
