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

export default function DistributionManagerDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [decisionActorFilter, setDecisionActorFilter] = useState('');
  const [decisionFromDate, setDecisionFromDate] = useState('');
  const [decisionToDate, setDecisionToDate] = useState('');

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
  const selectedDevelopmentId = selectedAssignment
    ? Number((selectedAssignment as any).developmentId)
    : null;

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
  const submissionQueueQuery = trpc.distribution.manager.listSubmissionQueue.useQuery(
    {
      programId: selectedAssignment ? Number(selectedAssignment.programId) : undefined,
      developmentId: selectedAssignment ? Number(selectedAssignment.developmentId) : undefined,
      limit: 150,
    },
    { enabled: Boolean(selectedAssignment) },
  );
  const submissionDecisionAuditQuery = trpc.distribution.manager.listSubmissionDecisionAudit.useQuery(
    {
      programId: selectedAssignment ? Number(selectedAssignment.programId) : undefined,
      developmentId: selectedAssignment ? Number(selectedAssignment.developmentId) : undefined,
      limit: 200,
    },
    { enabled: Boolean(selectedAssignment) },
  );

  const timelineQuery = trpc.distribution.manager.dealTimeline.useQuery(
    { dealId: Number(selectedDealId) },
    { enabled: Boolean(selectedDealId) },
  );
  const developmentDocumentsQuery = trpc.distribution.manager.getDevelopmentDocuments.useQuery(
    { developmentId: selectedDevelopmentId || 0 },
    {
      enabled: Boolean(selectedDevelopmentId),
    },
  );

  const validateMutation = trpc.distribution.manager.validateViewing.useMutation({
    onSuccess: () => {
      toast.success('Viewing validated');
      validationQueueQuery.refetch();
      pipelineQuery.refetch();
      submissionQueueQuery.refetch();
      submissionDecisionAuditQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  const advanceStageMutation = trpc.distribution.manager.advanceDealStage.useMutation({
    onSuccess: () => {
      toast.success('Deal stage updated');
      pipelineQuery.refetch();
      submissionQueueQuery.refetch();
      validationQueueQuery.refetch();
      submissionDecisionAuditQuery.refetch();
      if (selectedDealId) timelineQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  const approveSubmittedDeal = (row: any) => {
    const confirmed = window.confirm(
      `Approve submission for ${row.buyerName} at ${row.developmentName}? This will move the deal forward.`,
    );
    if (!confirmed) return;
    advanceStageMutation.mutate({
      dealId: Number(row.id),
      toStage: 'contract_signed',
      notes: 'Submission reviewed and approved by manager.',
      rejectionReason: null,
    });
  };

  const rejectSubmittedDeal = (row: any) => {
    const rejectionReason =
      window.prompt(
        `Provide rejection reason for ${row.buyerName} (${row.developmentName}):`,
        'Missing required documents',
      ) || '';
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error('Rejection reason is required.');
      return;
    }
    const confirmed = window.confirm(
      `Reject submission for ${row.buyerName}? This will cancel the deal.`,
    );
    if (!confirmed) return;
    advanceStageMutation.mutate({
      dealId: Number(row.id),
      toStage: 'cancelled',
      notes: 'Submission rejected by manager.',
      rejectionReason: reason,
    });
  };

  const applyPipelineStage = (deal: any, stage: string) => {
    const normalizedStage = String(stage || '').trim();
    if (!normalizedStage) return;
    const stageLabel = normalizedStage.replace(/_/g, ' ');
    if (normalizedStage === 'cancelled') {
      const rejectionReason =
        window.prompt(
          `Provide cancellation reason for ${deal.buyerName} (${deal.developmentName}):`,
          'Cancelled by manager',
        ) || '';
      const reason = rejectionReason.trim();
      if (!reason) {
        toast.error('Cancellation reason is required.');
        return;
      }
      const confirmed = window.confirm(
        `Cancel deal for ${deal.buyerName} at ${deal.developmentName}?`,
      );
      if (!confirmed) return;
      advanceStageMutation.mutate({
        dealId: Number(deal.id),
        toStage: 'cancelled' as any,
        notes: null,
        rejectionReason: reason,
      });
      return;
    }

    const confirmed = window.confirm(
      `Move ${deal.buyerName} (${deal.developmentName}) to "${stageLabel}"?`,
    );
    if (!confirmed) return;
    advanceStageMutation.mutate({
      dealId: Number(deal.id),
      toStage: normalizedStage as any,
      notes: null,
      rejectionReason: null,
    });
  };

  const submissionDecisionRows = useMemo(
    () => ((submissionDecisionAuditQuery.data || []) as any[]).slice(),
    [submissionDecisionAuditQuery.data],
  );

  const filteredSubmissionDecisionRows = useMemo(() => {
    const actorNeedle = decisionActorFilter.trim().toLowerCase();
    const fromBoundary = decisionFromDate ? Date.parse(`${decisionFromDate}T00:00:00`) : null;
    const toBoundary = decisionToDate ? Date.parse(`${decisionToDate}T23:59:59`) : null;

    return submissionDecisionRows.filter(row => {
      if (decisionFilter !== 'all' && String(row.decision || '') !== decisionFilter) return false;
      if (actorNeedle) {
        const actorHay =
          `${row.actorDisplayName || ''} ${row.actorEmail || ''} ${row.actorUserId || ''}`.toLowerCase();
        if (!actorHay.includes(actorNeedle)) return false;
      }
      const eventAtMs = Date.parse(String(row.eventAt || ''));
      if (fromBoundary !== null && Number.isFinite(fromBoundary)) {
        if (!Number.isFinite(eventAtMs) || eventAtMs < fromBoundary) return false;
      }
      if (toBoundary !== null && Number.isFinite(toBoundary)) {
        if (!Number.isFinite(eventAtMs) || eventAtMs > toBoundary) return false;
      }
      return true;
    });
  }, [
    decisionActorFilter,
    decisionFilter,
    decisionFromDate,
    decisionToDate,
    submissionDecisionRows,
  ]);

  const exportSubmissionDecisionCsv = () => {
    if (!filteredSubmissionDecisionRows.length) {
      toast.error('No decision rows to export for the current filters.');
      return;
    }
    const escapeCsvCell = (value: unknown) => {
      const raw = String(value ?? '');
      if (!raw.includes(',') && !raw.includes('"') && !raw.includes('\n')) {
        return raw;
      }
      return `"${raw.replace(/"/g, '""')}"`;
    };

    const header = [
      'Decision',
      'Deal ID',
      'Development',
      'Buyer',
      'From Stage',
      'To Stage',
      'Actor',
      'Actor Email',
      'Event At',
      'Rejection Reason',
      'Notes',
    ];

    const rows = filteredSubmissionDecisionRows.map(row => [
      row.decision,
      row.dealId,
      row.developmentName,
      row.buyerName,
      row.fromStage,
      row.toStage,
      row.actorDisplayName || row.actorUserId || 'system',
      row.actorEmail || '',
      row.eventAt || '',
      row.rejectionReason || '',
      row.notes || '',
    ]);

    const csv = [header, ...rows].map(row => row.map(cell => escapeCsvCell(cell)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const datePart = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `submission-decisions-${datePart}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

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

  if (!(assignmentsQuery.data || []).length) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="mx-auto max-w-7xl px-4 pt-24">
          <Card>
            <CardHeader>
              <CardTitle>No Development Assignments Yet</CardTitle>
              <CardDescription>
                Your manager access is active, but no development has been assigned to you yet.
                Contact Super Admin to assign at least one partner development.
              </CardDescription>
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
              <CardTitle>{(pipelineQuery.data || []).length}</CardTitle>
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
              <CardTitle>{(validationQueueQuery.data || []).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Submission Queue</CardDescription>
              <CardTitle>{(submissionQueueQuery.data || []).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {selectedAssignment ? (
          <Card>
            <CardHeader>
              <CardTitle>Development Document Bank</CardTitle>
              <CardDescription>
                View brochures, floor plans, and videos for {selectedAssignment.developmentName}. The sales
                pack is managed by the provider or an admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { key: 'brochures' as const, label: 'Brochures' },
                  { key: 'floorPlans' as const, label: 'Floor Plans' },
                  { key: 'videos' as const, label: 'Videos' },
                ].map(group => {
                  const rows = ((developmentDocumentsQuery.data as any)?.[group.key] || []) as Array<{
                    name?: string | null;
                    url: string;
                  }>;
                  return (
                    <div key={group.key} className="rounded border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium">{group.label}</p>
                        <Badge variant="outline">{rows.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {rows.map((row, index) => (
                          <div key={`${group.key}-${index}`} className="rounded border bg-slate-50 p-2">
                            <p className="truncate text-xs font-medium text-slate-800">
                              {row.name || row.url}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">{row.url}</p>
                            <div className="mt-1 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
                              >
                                Open
                              </Button>
                            </div>
                          </div>
                        ))}
                        {!rows.length ? (
                          <p className="text-xs text-slate-500">No documents yet.</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Submission Review Queue</CardTitle>
              <CardDescription>
                Deals submitted to head office and waiting for manager review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(submissionQueueQuery.data || []).slice(0, 20).map((row: any) => (
                <div key={row.id} className="rounded border p-3 space-y-2">
                  <button
                    className="text-left w-full"
                    onClick={() => setSelectedDealId(Number(row.id))}
                  >
                    <p className="font-medium">
                      {row.developmentName} - {row.buyerName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Referrer: {row.agentDisplayName || `#${row.agentId}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Docs: {row.documentsComplete ? 'Complete' : 'Missing'} | Queue:{' '}
                      {typeof row.hoursInQueue === 'number' ? `${row.hoursInQueue}h` : 'N/A'}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.atRisk ? (
                      <Badge variant="destructive">At Risk</Badge>
                    ) : (
                      <Badge variant="secondary">In Queue</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveSubmittedDeal(row)}
                    >
                      Approve Submission
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectSubmittedDeal(row)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
              {!submissionQueueQuery.isLoading && !(submissionQueueQuery.data || []).length ? (
                <p className="text-sm text-slate-500">No submissions awaiting manager review.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validation Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(validationQueueQuery.data || []).slice(0, 20).map((row: any) => (
                <div key={row.id} className="rounded border p-3 space-y-2">
                  <p className="font-medium">
                    {row.developmentName} - {row.buyerName}
                  </p>
                  <p className="text-xs text-slate-500">Current stage: {row.currentStage}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
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
                      onClick={() =>
                        validateMutation.mutate({ dealId: Number(row.id), outcome: 'no_show' })
                      }
                    >
                      No Show
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline & Stage Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(pipelineQuery.data || []).slice(0, 24).map((deal: any) => (
                <div key={deal.id} className="rounded border p-3 space-y-2">
                  <button
                    className="text-left w-full"
                    onClick={() => setSelectedDealId(Number(deal.id))}
                  >
                    <p className="font-medium">
                      {deal.developmentName} - {deal.buyerName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Stage: {deal.currentStage} | Commission: {deal.commissionStatus}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'application_submitted',
                      'contract_signed',
                      'bond_approved',
                      'commission_pending',
                      'cancelled',
                    ].map(stage => (
                      <Button
                        key={stage}
                        size="sm"
                        variant="outline"
                        onClick={() => applyPipelineStage(deal, stage)}
                      >
                        {stage}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Submission Decisions</CardTitle>
            <CardDescription>
              Manager actions on submitted deals (approved/rejected) with actor and timestamp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 rounded border bg-slate-50 p-3 md:grid-cols-6">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Decision</p>
                <Select
                  value={decisionFilter}
                  onValueChange={value => setDecisionFilter(value as 'all' | 'approved' | 'rejected')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Actor</p>
                <Input
                  placeholder="Name or email"
                  value={decisionActorFilter}
                  onChange={e => setDecisionActorFilter(e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">From</p>
                <Input
                  type="date"
                  value={decisionFromDate}
                  onChange={e => setDecisionFromDate(e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">To</p>
                <Input
                  type="date"
                  value={decisionToDate}
                  onChange={e => setDecisionToDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Actions</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportSubmissionDecisionCsv}>
                    Export CSV
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDecisionFilter('all');
                      setDecisionActorFilter('');
                      setDecisionFromDate('');
                      setDecisionToDate('');
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Showing {filteredSubmissionDecisionRows.length} of {submissionDecisionRows.length} decisions.
            </p>
            {filteredSubmissionDecisionRows.map((event: any) => (
              <div key={event.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {event.developmentName} - {event.buyerName}
                  </p>
                  {event.decision === 'approved' ? (
                    <Badge variant="secondary">Approved</Badge>
                  ) : (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  By {event.actorDisplayName || `User #${event.actorUserId || 'system'}`} on{' '}
                  {event.eventAt ? new Date(event.eventAt).toLocaleString() : 'N/A'}
                </p>
                {event.rejectionReason ? (
                  <p className="mt-1 text-xs text-rose-700">Reason: {event.rejectionReason}</p>
                ) : null}
                {event.notes ? (
                  <p className="mt-1 text-xs text-slate-600">Notes: {event.notes}</p>
                ) : null}
              </div>
            ))}
            {!submissionDecisionAuditQuery.isLoading && !filteredSubmissionDecisionRows.length ? (
              <p className="text-sm text-slate-500">
                {submissionDecisionRows.length
                  ? 'No decisions match the current filters.'
                  : 'No submission decisions yet.'}
              </p>
            ) : null}
          </CardContent>
        </Card>

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
                    {event.eventType} | {event.fromStage || 'start'} {'->'} {event.toStage || 'n/a'}
                  </p>
                  <p className="text-xs text-slate-500">{event.eventAt}</p>
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
