import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const managerStageActions = [
  'application_submitted',
  'contract_signed',
  'bond_approved',
  'commission_pending',
  'cancelled',
] as const;

const stageLabels: Record<string, string> = {
  application_submitted: 'Application Submitted',
  contract_signed: 'Contract Signed',
  bond_approved: 'Bond Approved',
  commission_pending: 'Commission Pending',
  commission_released: 'Commission Released',
  cancelled: 'Cancelled',
};

function formatStage(stage: string | null | undefined) {
  if (!stage) return 'Unknown';
  return stageLabels[stage] || stage.replace(/_/g, ' ');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function DistributionManagerDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [stageDraftByDealId, setStageDraftByDealId] = useState<Record<number, string>>({});

  const assignmentsQuery = trpc.distribution.manager.myAssignments.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const selectedAssignment = useMemo(
    () =>
      (assignmentsQuery.data || []).find(
        (assignment: any) => Number(assignment.assignmentId) === Number(selectedAssignmentId),
      ) || null,
    [assignmentsQuery.data, selectedAssignmentId],
  );

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
  }, [isAuthenticated, loading, setLocation]);

  useEffect(() => {
    const assignments = assignmentsQuery.data || [];
    if (!assignments.length) return;
    if (!selectedAssignmentId) {
      setSelectedAssignmentId(Number(assignments[0].assignmentId));
    }
  }, [assignmentsQuery.data, selectedAssignmentId]);

  const pipelineQuery = trpc.distribution.manager.listPipeline.useQuery(
    {
      developmentId: selectedAssignment ? Number(selectedAssignment.developmentId) : undefined,
      limit: 150,
    },
    { enabled: Boolean(selectedAssignment) },
  );

  const viewingsQuery = trpc.distribution.manager.listViewings.useQuery(
    {
      programId: selectedAssignment ? Number(selectedAssignment.programId) : undefined,
      developmentId: selectedAssignment ? Number(selectedAssignment.developmentId) : undefined,
      includePast: false,
      limit: 150,
    },
    { enabled: Boolean(selectedAssignment) },
  );

  const validationQueueQuery = trpc.distribution.manager.listValidationQueue.useQuery(
    {
      programId: selectedAssignment ? Number(selectedAssignment.programId) : undefined,
      developmentId: selectedAssignment ? Number(selectedAssignment.developmentId) : undefined,
      limit: 150,
    },
    { enabled: Boolean(selectedAssignment) },
  );

  const timelineQuery = trpc.distribution.manager.dealTimeline.useQuery(
    { dealId: Number(selectedDealId) },
    { enabled: Boolean(selectedDealId) },
  );

  const validateMutation = trpc.distribution.manager.validateViewing.useMutation({
    onSuccess: () => {
      toast.success('Viewing validated');
      validationQueueQuery.refetch();
      pipelineQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  const advanceStageMutation = trpc.distribution.manager.advanceDealStage.useMutation({
    onSuccess: () => {
      toast.success('Deal stage updated');
      pipelineQuery.refetch();
      if (selectedDealId) timelineQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  const pipelineDeals = useMemo(() => ((pipelineQuery.data || []) as any[]).slice(0, 150), [pipelineQuery.data]);
  const validationQueue = useMemo(
    () => ((validationQueueQuery.data || []) as any[]).slice(0, 150),
    [validationQueueQuery.data],
  );

  const pipelineStageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const deal of pipelineDeals) {
      const stage = String(deal.currentStage || 'unknown');
      counts.set(stage, (counts.get(stage) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [pipelineDeals]);

  const filteredPipelineDeals = useMemo(() => {
    const query = pipelineSearch.trim().toLowerCase();
    return pipelineDeals.filter(deal => {
      const stageMatch = stageFilter === 'all' || String(deal.currentStage) === stageFilter;
      const textMatch =
        !query ||
        String(deal.developmentName || '')
          .toLowerCase()
          .includes(query) ||
        String(deal.buyerName || '')
          .toLowerCase()
          .includes(query);
      return stageMatch && textMatch;
    });
  }, [pipelineDeals, pipelineSearch, stageFilter]);

  if (loading || assignmentsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (assignmentsQuery.error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="mx-auto max-w-7xl px-4 pt-24">
          <Card>
            <CardHeader>
              <CardTitle>Manager access required</CardTitle>
              <CardDescription>{assignmentsQuery.error.message}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribution Manager Dashboard</CardTitle>
            <CardDescription>
              Manage showings, validate outcomes, and drive deal progression for assigned programs.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="w-full md:w-[360px]">
              <Select
                value={selectedAssignmentId ? String(selectedAssignmentId) : undefined}
                onValueChange={value => setSelectedAssignmentId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  {(assignmentsQuery.data || []).map((assignment: any) => (
                    <SelectItem
                      key={assignment.assignmentId}
                      value={String(assignment.assignmentId)}
                    >
                      {assignment.developmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary">Assignments: {(assignmentsQuery.data || []).length}</Badge>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Open Pipeline Deals</CardDescription>
              <CardTitle>{pipelineDeals.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Upcoming Viewings</CardDescription>
              <CardTitle>{(viewingsQuery.data || []).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Validation Queue</CardDescription>
              <CardTitle>{validationQueue.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Filtered Deals</CardDescription>
              <CardTitle>{filteredPipelineDeals.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Snapshot</CardTitle>
            <CardDescription>Current deal distribution by stage for your active assignment.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {pipelineStageCounts.map(([stage, count]) => (
              <Button
                key={stage}
                size="sm"
                variant={stageFilter === stage ? 'default' : 'outline'}
                onClick={() => setStageFilter(stage)}
              >
                {formatStage(stage)} ({count})
              </Button>
            ))}
            <Button
              size="sm"
              variant={stageFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStageFilter('all')}
            >
              All stages
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Validation Queue</CardTitle>
              <CardDescription>Confirm viewing outcomes before deals progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {validationQueueQuery.isLoading && (
                <p className="text-sm text-slate-500">Loading validation queue...</p>
              )}
              {validationQueue.slice(0, 20).map((row: any) => (
                <div key={row.id} className="space-y-2 rounded border p-3">
                  <p className="font-medium">
                    {row.developmentName} - {row.buyerName}
                  </p>
                  <p className="text-xs text-slate-500">Current stage: {formatStage(row.currentStage)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={validateMutation.isPending}
                      onClick={() =>
                        validateMutation.mutate({
                          dealId: Number(row.id),
                          outcome: 'completed_proceeding',
                        })
                      }
                    >
                      Proceeding
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={validateMutation.isPending}
                      onClick={() =>
                        validateMutation.mutate({
                          dealId: Number(row.id),
                          outcome: 'completed_not_proceeding',
                        })
                      }
                    >
                      Not Proceeding
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={validateMutation.isPending}
                      onClick={() =>
                        validateMutation.mutate({ dealId: Number(row.id), outcome: 'no_show' })
                      }
                    >
                      No Show
                    </Button>
                  </div>
                </div>
              ))}
              {!validationQueueQuery.isLoading && !validationQueue.length && (
                <p className="text-sm text-slate-500">No deals currently need viewing validation.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline & Stage Controls</CardTitle>
              <CardDescription>Search deals, inspect current stage, and apply controlled stage updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={pipelineSearch}
                  onChange={e => setPipelineSearch(e.target.value)}
                  placeholder="Search development or buyer"
                />
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {pipelineStageCounts.map(([stage]) => (
                      <SelectItem key={stage} value={stage}>
                        {formatStage(stage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredPipelineDeals.slice(0, 24).map((deal: any) => {
                const dealId = Number(deal.id);
                const draftStage = stageDraftByDealId[dealId] || 'contract_signed';
                return (
                <div key={deal.id} className="space-y-2 rounded border p-3">
                  <button
                    className="w-full text-left"
                    onClick={() => setSelectedDealId(dealId)}
                  >
                    <p className="font-medium">
                      {deal.developmentName} - {deal.buyerName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Stage: {formatStage(deal.currentStage)} | Commission: {deal.commissionStatus}
                    </p>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={draftStage}
                      onChange={e =>
                        setStageDraftByDealId(prev => ({
                          ...prev,
                          [dealId]: e.target.value,
                        }))
                      }
                      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                    >
                      {managerStageActions.map(stage => (
                        <option key={stage} value={stage}>
                          {formatStage(stage)}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={advanceStageMutation.isPending}
                      onClick={() =>
                        advanceStageMutation.mutate({
                          dealId,
                          toStage: draftStage as any,
                          notes: null,
                          rejectionReason:
                            draftStage === 'cancelled' ? 'Cancelled by manager' : null,
                        })
                      }
                    >
                      Apply Stage
                    </Button>
                  </div>
                </div>
              );
              })}
              {!pipelineQuery.isLoading && !filteredPipelineDeals.length && (
                <p className="text-sm text-slate-500">
                  No pipeline deals match this search/filter combination.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedDealId && (
          <Card>
            <CardHeader>
              <CardTitle>Deal Timeline</CardTitle>
              <CardDescription>Deal #{selectedDealId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(timelineQuery.data?.events || []).map((event: any) => (
                <div key={event.id} className="rounded border p-3">
                  <p className="font-medium">
                    {event.eventType} | {formatStage(event.fromStage || 'start')} {'->'}{' '}
                    {formatStage(event.toStage || 'n/a')}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(event.eventAt)}</p>
                  {event.notes ? <p className="text-sm mt-1">{event.notes}</p> : null}
                </div>
              ))}
              {!timelineQuery.isLoading && !(timelineQuery.data?.events || []).length && (
                <p className="text-sm text-slate-500">No timeline events found for this deal.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
