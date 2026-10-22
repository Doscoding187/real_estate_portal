import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function sourceLabel(source: string) {
  return source === 'pilot_search_results_unit'
    ? 'Search Results unit enquiry'
    : 'Property Listify listing enquiry';
}

export default function SelectedTeamLeadQueuePage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed'>('open');
  const [closeReasons, setCloseReasons] = useState<Record<number, string>>({});
  const [historyQueueItemId, setHistoryQueueItemId] = useState<number | null>(null);

  const featureQuery = trpc.distribution.getSelectedTeamQueueFeatureStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const queueQuery = trpc.distribution.manager.listSelectedTeamLeadQueue.useQuery(
    { status: statusFilter, limit: 200 },
    { enabled: isAuthenticated && featureQuery.data?.enabled === true, retry: false },
  );
  const practitionersQuery = trpc.distribution.manager.listSelectedTeamPractitioners.useQuery(
    undefined,
    { enabled: isAuthenticated && featureQuery.data?.enabled === true, retry: false },
  );
  const historyQuery = trpc.distribution.manager.listSelectedTeamLeadQueueEvents.useQuery(
    { queueItemId: historyQueueItemId || 0 },
    {
      enabled: Boolean(historyQueueItemId) && featureQuery.data?.enabled === true,
      retry: false,
    },
  );
  const assignMutation = trpc.distribution.manager.assignSelectedTeamLead.useMutation({
    onSuccess: () => {
      toast.success('Lead assignment updated');
      queueQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const closeMutation = trpc.distribution.manager.closeSelectedTeamLeadQueueItem.useMutation({
    onSuccess: () => {
      toast.success('Queue item closed');
      queueQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const reopenMutation = trpc.distribution.manager.reopenSelectedTeamLeadQueueItem.useMutation({
    onSuccess: () => {
      toast.success('Queue item reopened');
      queueQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  if (
    loading ||
    featureQuery.isLoading ||
    (featureQuery.data?.enabled && (queueQuery.isLoading || practitionersQuery.isLoading))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const error = queueQuery.error || practitionersQuery.error;
  const rows = queueQuery.data || [];
  const practitioners = practitionersQuery.data || [];

  if (!featureQuery.data?.enabled) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <main className="mx-auto max-w-4xl px-4 pb-8 pt-24">
          <Card>
            <CardHeader>
              <CardTitle>Selected team lead queue</CardTitle>
              <CardDescription>
                The queue is not enabled in this environment yet. Its database migrations must be
                applied and verified before the feature flag is turned on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setLocation('/distribution/manager/developments')}>
                Back to development operations
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <main className="mx-auto max-w-6xl space-y-4 px-4 pb-8 pt-24">
        <Card>
          <CardHeader>
            <CardTitle>Selected team lead queue</CardTitle>
            <CardDescription>
              Leads stay in Property Listify custody. Assign each open enquiry to one selected
              practitioner who will handle the follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{statusFilter} leads: {rows.length}</Badge>
            <Badge variant="outline">Active practitioners: {practitioners.length}</Badge>
            <div className="w-40">
              <Select
                value={statusFilter}
                onValueChange={value => setStatusFilter(value as 'open' | 'closed')}
              >
                <SelectTrigger aria-label="Queue status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open leads</SelectItem>
                  <SelectItem value="closed">Closed leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setLocation('/distribution/manager/developments')}>
              Back to development operations
            </Button>
          </CardContent>
        </Card>

        {error ? (
          <Card>
            <CardContent className="py-8 text-sm text-red-600">{error.message}</CardContent>
          </Card>
        ) : null}

        {!error && practitioners.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-amber-800">
              No active practitioners are selected yet. An administrator must add approved agents to
              the selected team before leads can be assigned.
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {rows.map((row: any) => {
            const title = row.propertyTitle || row.developmentName || 'Property enquiry';
            const details = [row.unitName, row.developmentName, row.propertyId ? `Listing #${row.propertyId}` : null]
              .filter(Boolean)
              .filter((value, index, values) => values.indexOf(value) === index)
              .join(' · ');

            return (
              <Card key={row.queueItemId}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{title}</CardTitle>
                      <CardDescription>{details || sourceLabel(row.source)}</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{sourceLabel(row.source)}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setHistoryQueueItemId(current =>
                            current === Number(row.queueItemId) ? null : Number(row.queueItemId),
                          )
                        }
                      >
                        {historyQueueItemId === Number(row.queueItemId)
                          ? 'Hide history'
                          : 'Assignment history'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium">{row.leadName}</p>
                    <p className="text-sm text-slate-600">
                      {row.leadEmail}
                      {row.leadPhone ? ` · ${row.leadPhone}` : ''}
                    </p>
                    {row.leadMessage ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {row.leadMessage}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      Received {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {historyQueueItemId === Number(row.queueItemId) ? (
                    <div className="space-y-2 rounded bg-slate-50 p-3">
                      <p className="text-sm font-medium">Assignment history</p>
                      {historyQuery.isLoading ? (
                        <p className="text-sm text-slate-500">Loading history…</p>
                      ) : historyQuery.error ? (
                        <p className="text-sm text-red-600">{historyQuery.error.message}</p>
                      ) : (historyQuery.data || []).length ? (
                        (historyQuery.data || []).map((event: any) => (
                          <div key={event.id} className="border-l-2 border-slate-300 pl-3">
                            <p className="text-sm">
                              {String(event.eventType).replace(/_/g, ' ')} by{' '}
                              {event.actorDisplayName || 'Property Listify'}
                              {event.toAgentId ? ` · practitioner #${event.toAgentId}` : ''}
                              {event.fromAgentId ? ` · previous #${event.fromAgentId}` : ''}
                            </p>
                            {event.note ? (
                              <p className="text-sm text-slate-600">{event.note}</p>
                            ) : null}
                            <p className="text-xs text-slate-500">
                              {new Date(event.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No queue history recorded.</p>
                      )}
                    </div>
                  ) : null}

                  {row.queueStatus === 'open' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-full max-w-sm">
                        <Select
                          value={row.assignedAgentId ? String(row.assignedAgentId) : undefined}
                          onValueChange={value =>
                            assignMutation.mutate({
                              queueItemId: Number(row.queueItemId),
                              agentId: Number(value),
                            })
                          }
                          disabled={assignMutation.isPending || practitioners.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Assign a practitioner" />
                          </SelectTrigger>
                          <SelectContent>
                            {practitioners.map((practitioner: any) => (
                              <SelectItem
                                key={practitioner.agentId}
                                value={String(practitioner.agentId)}
                              >
                                {practitioner.displayName ||
                                  [practitioner.firstName, practitioner.lastName]
                                    .filter(Boolean)
                                    .join(' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {row.assignedAgentId ? (
                        <>
                          <Badge variant="secondary">
                            Assigned to {row.assignedAgentName || 'selected practitioner'}
                          </Badge>
                          <Button
                            variant="outline"
                            disabled={assignMutation.isPending}
                            onClick={() =>
                              assignMutation.mutate({
                                queueItemId: Number(row.queueItemId),
                                agentId: null,
                              })
                            }
                          >
                            Return to queue
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary">Waiting for assignment</Badge>
                      )}
                      <div className="flex w-full max-w-xl flex-wrap items-center gap-2">
                        <Input
                          value={closeReasons[Number(row.queueItemId)] || ''}
                          onChange={event =>
                            setCloseReasons(previous => ({
                              ...previous,
                              [Number(row.queueItemId)]: event.target.value,
                            }))
                          }
                          placeholder="Reason for closing this queue item"
                          maxLength={1000}
                        />
                        <Button
                          variant="outline"
                          disabled={
                            closeMutation.isPending ||
                            (closeReasons[Number(row.queueItemId)] || '').trim().length < 3
                          }
                          onClick={() =>
                            closeMutation.mutate({
                              queueItemId: Number(row.queueItemId),
                              reason: String(closeReasons[Number(row.queueItemId)] || '').trim(),
                            })
                          }
                        >
                          Close queue item
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Closed</Badge>
                      {row.closeReason ? (
                        <span className="text-sm text-slate-600">{row.closeReason}</span>
                      ) : null}
                      <Button
                        variant="outline"
                        disabled={reopenMutation.isPending}
                        onClick={() => reopenMutation.mutate({ queueItemId: Number(row.queueItemId) })}
                      >
                        Reopen queue item
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!error && rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              The selected team queue is empty.
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
